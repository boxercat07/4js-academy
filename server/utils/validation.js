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
    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith('@4js.com') && !emailLower.endsWith('@fourjs.com')) {
        return { isValid: false, error: 'Only @4js.com or @fourjs.com email addresses are allowed.' };
    }
    return { isValid: true };
};

module.exports = {
    validatePassword,
    validateEmail
};
