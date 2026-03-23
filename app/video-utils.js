if (typeof VideoUtils === 'undefined') {
    class VideoUtils {
    /**
     * Parses a video URL and returns its type, ID, and embed URL.
     * @param {string} url - The YouTube or Vimeo URL to parse.
     * @returns {Object|null} - { type, videoId, embedUrl } or null if invalid.
     */
    static parse(url) {
        if (!url || typeof url !== 'string') return null;

        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;

        const ytMatch = url.match(ytRegex);
        if (ytMatch) {
            const videoId = ytMatch[1];
            return {
                type: 'YOUTUBE',
                videoId: videoId,
                embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`
            };
        }

        const vimeoMatch = url.match(vimeoRegex);
        if (vimeoMatch) {
            const videoId = vimeoMatch[1];
            return {
                type: 'VIMEO',
                videoId: videoId,
                embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`
            };
        }

        // YouTube ID directly (11 chars)
        if (url.length === 11 && !url.includes('.') && !url.includes('/')) {
             return {
                type: 'YOUTUBE',
                videoId: url,
                embedUrl: `https://www.youtube.com/embed/${url}?autoplay=1`
            };
        }

        return null;
    }

    /**
     * Checks if a URL is a valid (supported) video URL.
     * @param {string} url 
     * @returns {boolean}
     */
    static isValid(url) {
        return this.parse(url) !== null;
    }
}

// Export for Node environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoUtils;
}
}
