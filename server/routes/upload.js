const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Safe filename: timestamp + original name (cleaned)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + cleanName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// POST /api/upload - Upload a file (Admin only)
router.post('/', (req, res, next) => {
    console.log('[Upload Route] Received request:', req.method, req.url);
    next();
}, verifyToken, verifyAdmin, upload.single('file'), (req, res) => {
    try {
        console.log('[Upload Route] Multer finished. File:', req.file ? req.file.originalname : 'None');
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Generate the public URL
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.json({
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

module.exports = router;
