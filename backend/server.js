const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const client = require('prom-client');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Prometheus metrics collection
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status_code']
});

// Middleware
app.use(cors());
app.use(express.json());

// Track metrics middleware
app.use((req, res, next) => {
    res.on('finish', () => {
        // Record path or route definition if available
        const routePath = req.route ? req.route.path : req.path;
        httpRequestsTotal.inc({
            method: req.method,
            route: routePath,
            status_code: res.statusCode
        });
    });
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Prometheus Metrics scraping endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    try {
        const metrics = await client.register.metrics();
        res.status(200).send(metrics);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Simple Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is healthy and running' });
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/luxeshop';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB database');
        // Start server only after DB connection is successful
        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB database connection error:', error.message);
        process.exit(1);
    });
