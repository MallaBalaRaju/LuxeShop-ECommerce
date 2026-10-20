const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const client = require('prom-client');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =========================
// Prometheus Metrics Setup
// =========================

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpActiveConnections = new client.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections'
});

const ordersCreatedTotal = new client.Counter({
    name: 'orders_created_total',
    help: 'Total number of orders created'
});

const userRegistrationsTotal = new client.Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations'
});

// =========================
// Middleware
// =========================

// CORS Configuration — restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Track metrics middleware
app.use((req, res, next) => {
    httpActiveConnections.inc();
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        httpActiveConnections.dec();
        const endTime = process.hrtime.bigint();
        const durationInSeconds = Number(endTime - startTime) / 1e9;

        // Record path or route definition if available
        const routePath = req.route ? req.route.path : req.path;
        const labels = {
            method: req.method,
            route: routePath,
            status_code: res.statusCode
        };

        httpRequestsTotal.inc(labels);
        httpRequestDuration.observe(labels, durationInSeconds);
    });
    next();
});

// =========================
// Routes
// =========================

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);

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

// Enhanced Health Check
app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    res.status(dbState === 1 ? 200 : 503).json({
        status: dbState === 1 ? 'UP' : 'DEGRADED',
        message: 'LuxeShop Backend Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus[dbState] || 'unknown',
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

// =========================
// MongoDB Connection
// =========================

if (process.env.NODE_ENV !== 'test') {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/luxeshop';

    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('Successfully connected to MongoDB database');
            // Start server only after DB connection is successful
            app.listen(PORT, () => {
                console.log(`Backend server running on port ${PORT}`);
                console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            });
        })
        .catch((error) => {
            console.error('MongoDB database connection error:', error.message);
            process.exit(1);
        });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Performing graceful shutdown...');
    await mongoose.connection.close();
    process.exit(0);
});

// Export app and metrics for use in controllers and tests
module.exports = { app, ordersCreatedTotal, userRegistrationsTotal };
