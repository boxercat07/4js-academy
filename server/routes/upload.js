const express = require('express');
const multer = require('multer');
const path = require('path');
const prisma = require('../prisma');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudflare R2 (S3 Client)
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Configure Multer to use memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper function to get correct mime types and extensions
const getFileProperties = (file) => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    
    // Default to the provided mimetype
    let contentType = file.mimetype;
    
    // Explicit overrides for common tricky types
    if (originalExt === '.ppt' || originalExt === '.pptx') {
        contentType = originalExt === '.pptx' 
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
router.post('/', (req, res, next) => {
    console.log('[Upload Route] Received request:', req.method, req.url);
    next();
}, verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
    try {
        console.log('[Upload Route] Multer finished. File:', req.file ? req.file.originalname : 'None');
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
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
            ContentType: contentType,
        });

        // Upload to R2
        await s3Client.send(command);

        // Generate the public URL safely
        const publicUrlBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ""); // Remove trailing slash if any
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
    } catch (error) {
        console.error('[Upload Route] R2 Upload error:', error);
        res.status(500).json({ error: `Failed to upload file to Cloudflare R2: ${error.message}` });
    }
});

module.exports = router;
