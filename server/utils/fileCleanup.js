const fs = require('fs');
const path = require('path');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Configure Cloudflare R2 (S3 Client) for deletion
let s3Client = null;
if (process.env.R2_ACCOUNT_ID) {
    s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
}

/**
 * Deletes a file from the server's uploads directory or Cloudflare R2 if it matches.
 * @param {string} mediaUrl - The URL of the media
 */
async function deleteFileByUrl(mediaUrl) {
    if (!mediaUrl) return;

    try {
        // Fallback: Delete old local files
        if (mediaUrl.includes('/uploads/')) {
            const parts = mediaUrl.split('/uploads/');
            let filename = parts.pop();
            if (!filename) return;

            // Fix for path traversal: ensure we only take the base filename
            filename = path.basename(filename);

            const uploadsDir = path.resolve(__dirname, '../uploads');
            const filePath = path.join(uploadsDir, filename);

            // Double check that the resolved path is still inside the uploads directory
            if (!filePath.startsWith(uploadsDir)) {
                console.error(`[FileCleanup] Security blocked: Attempted path traversal for ${filename}`);
                return;
            }

            if (fs.existsSync(filePath)) {
                console.log(`[FileCleanup] Deleting local file: ${filePath}`);
                await fs.promises.unlink(filePath);
            } else {
                console.warn(`[FileCleanup] Local file not found on disk: ${filePath}`);
            }
            return;
        }

        // New Logic: Delete from Cloudflare R2
        if (process.env.R2_PUBLIC_URL && mediaUrl.startsWith(process.env.R2_PUBLIC_URL.replace(/\/$/, ""))) {
            const publicUrlBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
            const fileKey = mediaUrl.substring(publicUrlBase.length + 1); // Extract key
            
            if (s3Client && fileKey) {
                console.log(`[FileCleanup] Deleting R2 object key: ${fileKey}`);
                const command = new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileKey,
                });
                await s3Client.send(command);
                console.log(`[FileCleanup] Successfully deleted R2 object: ${fileKey}`);
            }
            return;
        }
    } catch (error) {
        console.error(`[FileCleanup] Error deleting file from URL ${mediaUrl}:`, error);
    }
}

module.exports = { deleteFileByUrl };
