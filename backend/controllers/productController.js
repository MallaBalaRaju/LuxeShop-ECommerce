const Product = require('../models/Product');

// Default seed products
const seedProductsData = [
    {
        name: "Apex Mechanical Keyboard",
        description: "Sleek RGB mechanical keyboard with custom switches and aluminum frame.",
        price: 129.99,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Zenith Wireless Mouse",
        description: "Ergonomic high-precision wireless mouse with 20,000 DPI sensor and long-lasting battery.",
        price: 79.99,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Nebula Active Noise-Canceling Headphones",
        description: "Premium over-ear wireless headphones featuring active noise cancellation and high-fidelity sound.",
        price: 299.99,
        category: "Audio",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Aura Ambient LED Light Strip",
        description: "Smart LED strips with app control, voice assistant integration, and dynamic music sync modes.",
        price: 34.99,
        category: "Home Decor",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Titan Ergo Desk Chair",
        description: "Premium ergonomic office chair with adjustable lumbar support, 4D armrests, and mesh back.",
        price: 349.99,
        category: "Furniture",
        image: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Prism 4K Webcam",
        description: "Ultra-HD 4K webcam with auto-focus, background blur, and dual noise-canceling microphones.",
        price: 149.99,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Nova Portable SSD 2TB",
        description: "Blazing fast portable SSD with USB-C connectivity, 2000MB/s read speeds, and IP55 rating.",
        price: 189.99,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80"
    },
    {
        name: "Eclipse Smart Watch Pro",
        description: "Premium smartwatch with AMOLED display, health monitoring, GPS, and 7-day battery life.",
        price: 399.99,
        category: "Wearables",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80"
    }
];

/**
 * Get products with search, filter, sort, and pagination
 * 
 * Query parameters:
 *   ?search=keyboard       — text search on name and description
 *   ?category=Electronics  — filter by category
 *   ?minPrice=50           — minimum price filter
 *   ?maxPrice=200          — maximum price filter
 *   ?sort=price_asc        — sort order (price_asc, price_desc, name_asc, name_desc, newest)
 *   ?page=1                — page number
 *   ?limit=12              — items per page
 */
exports.getProducts = async (req, res) => {
    try {
        // Check if DB is empty and seed if needed
        const count = await Product.countDocuments();
        if (count === 0) {
            console.log("Database is empty. Seeding default premium products...");
            await Product.insertMany(seedProductsData);
        }

        // Build query filter
        const filter = {};

        // Text search
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { name: searchRegex },
                { description: searchRegex }
            ];
        }

        // Category filter
        if (req.query.category) {
            filter.category = new RegExp(`^${req.query.category}$`, 'i');
        }

        // Price range filter
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
        }

        // Sort configuration
        let sortOption = { createdAt: -1 }; // Default: newest first
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price_asc': sortOption = { price: 1 }; break;
                case 'price_desc': sortOption = { price: -1 }; break;
                case 'name_asc': sortOption = { name: 1 }; break;
                case 'name_desc': sortOption = { name: -1 }; break;
                case 'newest': sortOption = { createdAt: -1 }; break;
                default: sortOption = { createdAt: -1 };
            }
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        // Execute query
        const products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(filter);

        // Get available categories for filter UI
        const categories = await Product.distinct('category');

        res.status(200).json({
            products,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalProducts: total,
            categories
        });
    } catch (error) {
        console.error("Error in getProducts:", error);
        res.status(500).json({ message: "Server error fetching products", error: error.message });
    }
};

// Seed products explicitly if needed
exports.seedProducts = async (req, res) => {
    try {
        await Product.deleteMany({});
        const seeded = await Product.insertMany(seedProductsData);
        res.status(201).json({ message: "Seeded database successfully", count: seeded.length });
    } catch (error) {
        console.error("Error seeding products:", error);
        res.status(500).json({ message: "Error seeding products", error: error.message });
    }
};
