const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

/**
 * Create a new order
 * POST /api/orders
 * Protected route — requires authentication
 */
exports.createOrder = async (req, res) => {
    try {
        const { items, shippingAddress } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        // Validate products exist and calculate total
        let totalPrice = 0;
        const orderItems = [];

        for (const item of items) {
            // Validate the product ID is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                return res.status(400).json({ message: `Invalid product ID: ${item.product}` });
            }

            // Validate quantity: must be a positive integer
            const qty = item.quantity;
            if (qty === undefined || qty === null || !Number.isInteger(qty) || qty <= 0) {
                return res.status(400).json({ message: `Invalid quantity for product ${item.product}: must be a positive integer` });
            }

            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.product}` });
            }

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: qty
            });

            totalPrice += product.price * qty;
        }

        const order = await Order.create({
            user: req.user._id,
            items: orderItems,
            totalPrice,
            shippingAddress: shippingAddress || {},
            status: 'pending',
            paymentStatus: 'pending'
        });

        res.status(201).json({
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Server error creating order', error: error.message });
    }
};

/**
 * Get all orders for the authenticated user
 * GET /api/orders
 * Protected route — requires authentication
 */
exports.getMyOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('items.product', 'name image');

        const total = await Order.countDocuments({ user: req.user._id });

        res.status(200).json({
            orders,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalOrders: total
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Server error fetching orders', error: error.message });
    }
};

/**
 * Get a specific order by ID
 * GET /api/orders/:id
 * Protected route — user can only see their own orders
 */
exports.getOrderById = async (req, res) => {
    try {
        // Validate ObjectId before querying to avoid CastError → 500
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid order ID' });
        }

        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name image price');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify the order belongs to the authenticated user
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Server error fetching order', error: error.message });
    }
};

/**
 * Cancel an order
 * PUT /api/orders/:id/cancel
 * Protected route — user can only cancel their own pending/confirmed orders
 */
exports.cancelOrder = async (req, res) => {
    try {
        // Validate ObjectId before querying to avoid CastError → 500
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid order ID' });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this order' });
        }

        if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
            return res.status(400).json({ message: `Cannot cancel an order that is already ${order.status}` });
        }

        order.status = 'cancelled';
        order.paymentStatus = 'refunded';
        await order.save();

        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server error cancelling order', error: error.message });
    }
};
