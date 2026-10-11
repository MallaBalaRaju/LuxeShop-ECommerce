const express = require('express');
const router = express.Router();
const { getProducts, seedProducts } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { validateProductQuery } = require('../middleware/validator');

// GET /api/products — Public, with query validation
// Supports: ?search=, ?category=, ?minPrice=, ?maxPrice=, ?page=, ?limit=, ?sort=
router.get('/', validateProductQuery, getProducts);

// POST /api/products/seed — Protected (requires auth), reseeds the database
router.post('/seed', protect, seedProducts);

module.exports = router;
