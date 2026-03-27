const express = require('express');
const multer = require('multer');
const path = require('path');
const prisma = require('../prisma');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { auditLog } = require('../utils/auditLog');

const router = express.Router();

// Configure Cloudflare R2 (S3 Client)
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

// Configure Multer to use memory storage
const ALLOWED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.pdf',
    '.ppt',
    '.pptx',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.txt',
    '.mp4',
    '.webm',
    '.mp3',
    '.wav',
    '.json',
    '.url'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} is not allowed.`));
        }
    }
});

// Validate file content against known magic bytes to prevent extension spoofing
function validateMagicBytes(buffer, ext) {
    const b = buffer;
    const check = (sig, offset = 0) => sig.every((byte, i) => b[offset + i] === byte);

    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return check([0xff, 0xd8, 0xff]);
        case '.png':
            return check([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        case '.gif':
            return check([0x47, 0x49, 0x46, 0x38]);
        case '.webp':
            return check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x45, 0x42, 0x50], 8);
        case '.pdf':
            return check([0x25, 0x50, 0x44, 0x46]); // %PDF
        case '.pptx':
        case '.docx':
        case '.xlsx':
            return check([0x50, 0x4b]); // ZIP-based Office formats
        case '.ppt':
        case '.doc':
        case '.xls':
            return check([0xd0, 0xcf, 0x11, 0xe0]); // OLE2
        case '.mp4':
            return check([0x66, 0x74, 0x79, 0x70], 4); // 'ftyp' at offset 4
        case '.webm':
            return check([0x1a, 0x45, 0xdf, 0xa3]);
        case '.mp3':
            return check([0x49, 0x44, 0x33]) || check([0xff, 0xfb]) || check([0xff, 0xf3]) || check([0xff, 0xf2]);
        case '.wav':
            return check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x41, 0x56, 0x45], 8);
        case '.svg': {
            // SVG is text-based: reject if it contains embedded scripts
            const text = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));
            return !/<script/i.test(text);
        }
        case '.txt':
        case '.json':
        case '.url':
            return true; // Text-based formats — no magic bytes
        default:
            return false;
    }
}

// Helper function to get correct mime types and extensions
const getFileProperties = file => {
    const originalExt = path.extname(file.originalname).toLowerCase();

    // Default to the provided mimetype
    let contentType = file.mimetype;

    // Explicit overrides for common tricky types
    if (originalExt === '.ppt' || originalExt === '.pptx') {
        contentType =
            originalExt === '.pptx'
                ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                : 'application/vnd.ms-powerpoint';
    } else if (originalExt === '.json') {
        contentType = 'application/json';
    } else if (originalExt === '.pdf') {
        contentType = 'application/pdf';
    }

    return contentType;
};

// POST /api/upload - Upload a file (Admin only)
router.post(
    '/',
    (req, res, next) => {
        console.log('[Upload Route] Received request:', req.method, req.url);
        next();
    },
    verifyToken,
    verifyAdmin,
    upload.single('file'),
    async (req, res) => {
        try {
            console.log('[Upload Route] Multer finished. File:', req.file ? req.file.originalname : 'None');
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Validate file content matches its declared extension
            const declaredExt = path.extname(req.file.originalname).toLowerCase();
            if (!validateMagicBytes(req.file.buffer, declaredExt)) {
                return res
                    .status(400)
                    .json({ error: 'File content does not match its declared type or contains disallowed content.' });
            }

            // Generate safe unique filename using UUID
            const uniqueId = uuidv4();
            const originalExt = path.extname(req.file.originalname).toLowerCase();
            const cleanName = path.basename(req.file.originalname, originalExt).replace(/[^a-zA-Z0-9.-]/g, '_');
            // Format: uuid_cleanName.ext
            const finalFilename = `${uniqueId}_${cleanName}${originalExt}`;

            const contentType = getFileProperties(req.file);

            console.log(`[Upload Route] Uploading to R2: ${finalFilename} (${contentType})`);

            // Prepare the upload command
            const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: finalFilename,
                Body: req.file.buffer,
                ContentType: contentType
            });

            // Upload to R2
            await s3Client.send(command);

            // Generate the public URL safely
            const publicUrlBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''); // Remove trailing slash if any
            let fileUrl;

            if (publicUrlBase) {
                fileUrl = `${publicUrlBase}/${finalFilename}`;
            } else {
                console.warn('[Upload Route] R2_PUBLIC_URL is not set! Returning a placeholder URL.');
                fileUrl = `https://render-missing-public-url.com/${finalFilename}`;
            }

            console.log(`[Upload Route] Successfully uploaded: ${fileUrl}`);

            res.json({
                message: 'File uploaded successfully',
                url: fileUrl,
                filename: finalFilename,
                originalname: req.file.originalname,
                size: req.file.size
            });

            // Async audit log - don't block response
            auditLog(req.user.id, 'UPLOAD_FILE', {
                resourceType: 'FILE',
                resourceId: finalFilename,
                details: {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    url: fileUrl
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        } catch (error) {
            console.error('[Upload Route] R2 Upload error:', error);
            res.status(500).json({ error: 'File upload failed. Please try again.' });
        }
    }
);

module.exports = router;
