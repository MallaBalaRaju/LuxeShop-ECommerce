/**
 * Input Validation Middleware
 * Validates request bodies for auth and product routes
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate registration input
 */
const validateRegister = (req, res, next) => {
    const { username, email, password } = req.body;
    const errors = [];

    if (!username || username.trim().length < 3) {
        errors.push('Username must be at least 3 characters long');
    }
    if (username && username.length > 30) {
        errors.push('Username must not exceed 30 characters');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }
    if (!email || !emailRegex.test(email)) {
        errors.push('Please provide a valid email address');
    }
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }
    if (password && password.length > 128) {
        errors.push('Password must not exceed 128 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }
    next();
};

/**
 * Validate login input
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !emailRegex.test(email)) {
        errors.push('Please provide a valid email address');
    }
    if (!password || password.length === 0) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }
    next();
};

/**
 * Validate product query parameters
 */
const validateProductQuery = (req, res, next) => {
    const { page, limit, minPrice, maxPrice } = req.query;

    if (page && (isNaN(page) || parseInt(page) < 1)) {
        return res.status(400).json({ message: 'Page must be a positive integer' });
    }
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return res.status(400).json({ message: 'Limit must be between 1 and 100' });
    }
    if (minPrice && isNaN(minPrice)) {
        return res.status(400).json({ message: 'minPrice must be a number' });
    }
    if (maxPrice && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'maxPrice must be a number' });
    }
    if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
        return res.status(400).json({ message: 'minPrice cannot be greater than maxPrice' });
    }

    next();
};

module.exports = { validateRegister, validateLogin, validateProductQuery };
