const validatePassword = password => {
    if (!password) return { isValid: false, error: 'Password is required.' };

    const requirements = [
        { regex: /.{12,}/, error: 'Password must be at least 12 characters long.' },
        { regex: /[A-Z]/, error: 'Password must contain at least one uppercase letter.' },
        { regex: /[a-z]/, error: 'Password must contain at least one lowercase letter.' },
        { regex: /[0-9]/, error: 'Password must contain at least one number.' },
        { regex: /[^A-Za-z0-9]/, error: 'Password must contain at least one special character.' }
    ];

    for (const req of requirements) {
        if (!req.regex.test(password)) {
            return { isValid: false, error: req.error };
        }
    }

    return { isValid: true };
};

const validateEmail = email => {
    if (!email) return { isValid: false, error: 'Email is required.' };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(4js\.com|fourjs\.com)$/i;
    if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Only @4js.com or @fourjs.com email addresses are allowed.' };
    }
    return { isValid: true };
};

/**
 * Strips HTML tags and trims the string.
 */
const sanitizeInput = text => {
    if (typeof text !== 'string') return '';
    return text.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Validates that a string is within length bounds.
 */
const validateLength = (text, fieldName, min, max) => {
    const len = (text || '').length;
    if (len < min) return { isValid: false, error: `${fieldName} must be at least ${min} characters.` };
    if (len > max) return { isValid: false, error: `${fieldName} cannot exceed ${max} characters.` };
    return { isValid: true };
};

module.exports = {
    validatePassword,
    validateEmail,
    sanitizeInput,
    validateLength
};
