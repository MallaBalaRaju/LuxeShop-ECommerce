const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../middleware/validator');

// POST /api/auth/register — Rate limited + validated
router.post('/register', authLimiter, validateRegister, register);

// POST /api/auth/login — Rate limited + validated
router.post('/login', authLimiter, validateLogin, login);

module.exports = router;
