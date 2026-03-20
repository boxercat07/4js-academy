const fs = require('fs');
const path = require('path');

/**
 * Deletes a file from the server's uploads directory if it's a local URL.
 * @param {string} mediaUrl - The URL of the media (e.g., http://localhost:3000/uploads/filename.pdf)
 */
async function deleteFileByUrl(mediaUrl) {
    if (!mediaUrl || !mediaUrl.includes('/uploads/')) return;

    try {
        // Extract filename from URL (everything after /uploads/)
        const filename = mediaUrl.split('/uploads/').pop();
        if (!filename) return;

        const filePath = path.join(__dirname, '../uploads', filename);

        if (fs.existsSync(filePath)) {
            console.log(`[FileCleanup] Deleting file: ${filePath}`);
            await fs.promises.unlink(filePath);
        } else {
            console.warn(`[FileCleanup] File not found on disk: ${filePath}`);
        }
    } catch (error) {
        console.error(`[FileCleanup] Error deleting file from URL ${mediaUrl}:`, error);
    }
}

module.exports = { deleteFileByUrl };
