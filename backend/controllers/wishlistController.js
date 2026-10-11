const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

/**
 * Get user's wishlist
 * GET /api/wishlist
 * Protected route
 */
exports.getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate('products', 'name description price category image');

        if (!wishlist) {
            wishlist = { products: [] };
        }

        res.status(200).json(wishlist);
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Server error fetching wishlist', error: error.message });
    }
};

/**
 * Add product to wishlist
 * POST /api/wishlist
 * Protected route
 * Body: { productId: "..." }
 */
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            wishlist = await Wishlist.create({
                user: req.user._id,
                products: [productId]
            });
        } else {
            // Check if already in wishlist
            if (wishlist.products.includes(productId)) {
                return res.status(400).json({ message: 'Product already in wishlist' });
            }
            wishlist.products.push(productId);
            await wishlist.save();
        }

        await wishlist.populate('products', 'name description price category image');

        res.status(200).json({ message: 'Added to wishlist', wishlist });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Server error adding to wishlist', error: error.message });
    }
};

/**
 * Remove product from wishlist
 * DELETE /api/wishlist/:productId
 * Protected route
 */
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        const index = wishlist.products.indexOf(productId);
        if (index === -1) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }

        wishlist.products.splice(index, 1);
        await wishlist.save();

        await wishlist.populate('products', 'name description price category image');

        res.status(200).json({ message: 'Removed from wishlist', wishlist });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Server error removing from wishlist', error: error.message });
    }
};
