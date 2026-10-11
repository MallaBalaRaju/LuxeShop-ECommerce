const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');

// All wishlist routes are protected (require authentication)

// GET /api/wishlist — Get user's wishlist
router.get('/', protect, getWishlist);

// POST /api/wishlist — Add product to wishlist
router.post('/', protect, addToWishlist);

// DELETE /api/wishlist/:productId — Remove product from wishlist
router.delete('/:productId', protect, removeFromWishlist);

module.exports = router;
