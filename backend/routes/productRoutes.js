const express = require('express');
const router = express.Router();
const { getProducts, seedProducts } = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateProductQuery } = require('../middleware/validator');

// GET /api/products — Public, with query validation
// Supports: ?search=, ?category=, ?minPrice=, ?maxPrice=, ?page=, ?limit=, ?sort=
router.get('/', validateProductQuery, getProducts);

// POST /api/products/seed — Admin only, reseeds the database with default products
router.post('/seed', protect, adminOnly, seedProducts);

module.exports = router;
