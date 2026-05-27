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
    }
];

// Get all products. Auto-seeds if empty.
exports.getProducts = async (req, res) => {
    try {
        let products = await Product.find({});
        
        if (products.length === 0) {
            console.log("Database is empty. Seeding default premium products...");
            await Product.insertMany(seedProductsData);
            products = await Product.find({});
        }
        
        res.status(200).json(products);
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
