const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, getMyOrders, getOrderById, cancelOrder } = require('../controllers/orderController');

// All order routes are protected (require authentication)

// POST /api/orders — Create a new order
router.post('/', protect, createOrder);

// GET /api/orders — Get current user's orders
router.get('/', protect, getMyOrders);

// GET /api/orders/:id — Get a specific order
router.get('/:id', protect, getOrderById);

// PUT /api/orders/:id/cancel — Cancel an order
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
