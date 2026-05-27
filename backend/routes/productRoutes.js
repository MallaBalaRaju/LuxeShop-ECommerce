const express = require('express');
const router = express.Router();
const { getProducts, seedProducts } = require('../controllers/productController');

// GET /api/products
router.get('/', getProducts);

// POST /api/products/seed
router.post('/seed', seedProducts);

module.exports = router;
