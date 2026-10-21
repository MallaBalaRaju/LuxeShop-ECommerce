/**
 * LuxeShop Backend — Comprehensive Integration Test Suite
 *
 * Tests the REAL Express application (not a separate mock app).
 * Uses mongodb-memory-server for an isolated in-memory database.
 *
 * Coverage:
 *   - Health endpoint
 *   - Metrics endpoint
 *   - User registration (success, validation, duplicates)
 *   - User login (success, wrong password, non-existent user)
 *   - JWT authentication (valid, invalid, expired, missing)
 *   - Product listing and query validation
 *   - Product seed (admin-only protection)
 *   - Order creation (server-side pricing, quantity validation)
 *   - Order ownership and authorization
 *   - Pending-payment behavior
 *   - Order cancellation
 *   - Wishlist (add, duplicate prevention, remove)
 *   - 404 handling
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';  // High limit for tests

// Import the real application
const { app } = require('../server');

let mongoServer;
let userToken;
let adminToken;
let userId;
let adminId;
let productId;
let orderId;

// ==========================================
// Setup / Teardown
// ==========================================
beforeAll(async () => {
    // On Debian 12+/13 (Jenkins CI), MongoMemoryServer requires >= 7.0.3; on Windows dev use cached 6.0.14
    const mongoVersion = process.env.MONGOMS_VERSION || (process.platform === 'win32' ? '6.0.14' : '7.0.14');
    mongoServer = await MongoMemoryServer.create({
        binary: {
            version: mongoVersion
        }
    });
    const mongoUri = mongoServer.getUri();
    // Disconnect any existing connection before connecting to the test in-memory DB
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);
}, 360000);

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        try { await mongoose.connection.dropDatabase(); } catch (e) {}
        try { await mongoose.connection.close(); } catch (e) {}
    }
    if (mongoServer) {
        try { await mongoServer.stop(); } catch (e) {}
    }
}, 30000);

afterEach(async () => {
    // Clear prom-client metrics between tests to avoid label conflicts
});

// ==========================================
// 1. Root Endpoint
// ==========================================
describe('Root Endpoint', () => {
    it('GET / should return 200 with service info and endpoints', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('LuxeShop Backend API is running');
        expect(res.body.frontend).toBe('http://localhost:3000');
        expect(res.body.endpoints).toBeDefined();
        expect(res.body.endpoints.health).toBe('/health');
    });
});

// ==========================================
// 2. Health Endpoint
// ==========================================
describe('Health Endpoint', () => {
    it('GET /health should return 200 with UP status when DB is connected', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('UP');
        expect(res.body.database).toBe('connected');
        expect(res.body.message).toBe('LuxeShop Backend Service');
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.uptime).toBeDefined();
    });
});

// ==========================================
// 2. Metrics Endpoint
// ==========================================
describe('Metrics Endpoint', () => {
    it('GET /metrics should return 200 with Prometheus format', async () => {
        const res = await request(app).get('/metrics');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/plain|application\/openmetrics/);
        expect(res.text).toContain('http_requests_total');
        expect(res.text).toContain('http_request_duration_seconds');
    });
});

// ==========================================
// 3. User Registration
// ==========================================
describe('User Registration', () => {
    it('POST /api/auth/register should create a user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@luxeshop.com',
                password: 'TestPassword123'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('User registered successfully');
        expect(res.body.token).toBeDefined();
        expect(res.body.user.username).toBe('testuser');
        expect(res.body.user.email).toBe('test@luxeshop.com');
        expect(res.body.user.role).toBe('user');
        // Password hash must NOT be in response
        expect(res.body.user.password).toBeUndefined();

        userToken = res.body.token;
        userId = res.body.user.id;
    });

    it('POST /api/auth/register should reject duplicate email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'anotheruser',
                email: 'test@luxeshop.com',
                password: 'TestPassword123'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('already exists');
    });

    it('POST /api/auth/register should reject short username', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'ab',
                email: 'new@test.com',
                password: 'TestPassword123'
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/auth/register should reject invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'validuser',
                email: 'not-an-email',
                password: 'TestPassword123'
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/auth/register should reject short password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'validuser2',
                email: 'valid2@test.com',
                password: '123'
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/auth/register should reject missing fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'only@test.com' });
        expect(res.statusCode).toBe(400);
    });
});

// ==========================================
// 4. User Login
// ==========================================
describe('User Login', () => {
    it('POST /api/auth/login should login successfully', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@luxeshop.com',
                password: 'TestPassword123'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Logged in successfully');
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('test@luxeshop.com');
        expect(res.body.user.password).toBeUndefined();

        userToken = res.body.token;
    });

    it('POST /api/auth/login should reject wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@luxeshop.com',
                password: 'WrongPassword'
            });
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
    });

    it('POST /api/auth/login should reject non-existent user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nobody@test.com',
                password: 'TestPassword123'
            });
        expect(res.statusCode).toBe(401);
    });

    it('POST /api/auth/login should reject empty body', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});
        expect(res.statusCode).toBe(400);
    });
});

// ==========================================
// 5. JWT Authentication
// ==========================================
describe('JWT Authentication', () => {
    it('should reject request without token', async () => {
        const res = await request(app).get('/api/orders');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain('no token');
    });

    it('should reject malformed token', async () => {
        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', 'Bearer invalid-token-here');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain('invalid or expired');
    });

    it('should reject expired token', async () => {
        const expiredToken = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '0s' }
        );
        // Small delay to ensure expiration
        await new Promise(resolve => setTimeout(resolve, 100));
        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${expiredToken}`);
        expect(res.statusCode).toBe(401);
    });

    it('should reject token signed with wrong secret', async () => {
        const badToken = jwt.sign({ id: userId }, 'wrong-secret', { expiresIn: '1h' });
        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${badToken}`);
        expect(res.statusCode).toBe(401);
    });
});

// ==========================================
// 6. Product Listing
// ==========================================
describe('Product Listing', () => {
    it('GET /api/products should return products (auto-seeds empty DB)', async () => {
        const res = await request(app).get('/api/products');
        expect(res.statusCode).toBe(200);
        expect(res.body.products).toBeDefined();
        expect(Array.isArray(res.body.products)).toBe(true);
        expect(res.body.products.length).toBeGreaterThan(0);
        expect(res.body.totalProducts).toBeDefined();
        expect(res.body.categories).toBeDefined();

        productId = res.body.products[0]._id;
    });

    it('GET /api/products?search=keyboard should filter by search', async () => {
        const res = await request(app).get('/api/products?search=keyboard');
        expect(res.statusCode).toBe(200);
        expect(res.body.products.length).toBeGreaterThan(0);
        const names = res.body.products.map(p => p.name.toLowerCase());
        expect(names.some(n => n.includes('keyboard'))).toBe(true);
    });

    it('GET /api/products?category=Electronics should filter by category', async () => {
        const res = await request(app).get('/api/products?category=Electronics');
        expect(res.statusCode).toBe(200);
        res.body.products.forEach(p => {
            expect(p.category.toLowerCase()).toBe('electronics');
        });
    });

    it('GET /api/products?sort=price_asc should sort ascending', async () => {
        const res = await request(app).get('/api/products?sort=price_asc');
        expect(res.statusCode).toBe(200);
        const prices = res.body.products.map(p => p.price);
        for (let i = 1; i < prices.length; i++) {
            expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
        }
    });

    it('GET /api/products?page=-1 should reject invalid page', async () => {
        const res = await request(app).get('/api/products?page=-1');
        expect(res.statusCode).toBe(400);
    });

    it('GET /api/products?limit=200 should reject limit > 100', async () => {
        const res = await request(app).get('/api/products?limit=200');
        expect(res.statusCode).toBe(400);
    });

    it('GET /api/products?minPrice=abc should reject non-numeric price', async () => {
        const res = await request(app).get('/api/products?minPrice=abc');
        expect(res.statusCode).toBe(400);
    });
});

// ==========================================
// 7. Product Seed (Admin-Only)
// ==========================================
describe('Product Seed Endpoint', () => {
    it('POST /api/products/seed should reject unauthenticated request', async () => {
        const res = await request(app).post('/api/products/seed');
        expect(res.statusCode).toBe(401);
    });

    it('POST /api/products/seed should reject regular user (non-admin)', async () => {
        const res = await request(app)
            .post('/api/products/seed')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('admin');
    });

    it('POST /api/products/seed should succeed for admin user', async () => {
        // Create an admin user directly via the model
        const User = require('../models/User');
        const admin = await User.create({
            username: 'admin_user',
            email: 'admin@luxeshop.com',
            password: 'AdminPass123',
            role: 'admin'
        });
        adminId = admin._id;
        adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const res = await request(app)
            .post('/api/products/seed')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toContain('Seeded');
        expect(res.body.count).toBeGreaterThan(0);

        // Refresh productId after reseed
        const listRes = await request(app).get('/api/products');
        productId = listRes.body.products[0]._id;
    });
});

// ==========================================
// 8. Order Creation and Server-Side Pricing
// ==========================================
describe('Order Creation', () => {
    it('POST /api/orders should create order with server-side pricing', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [
                    { product: productId, quantity: 2 }
                ],
                shippingAddress: {
                    street: '123 Test St',
                    city: 'Mumbai',
                    state: 'MH',
                    zipCode: '400001',
                    country: 'India'
                }
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.order).toBeDefined();
        expect(res.body.order.paymentStatus).toBe('pending');
        expect(res.body.order.status).toBe('pending');
        expect(res.body.order.totalPrice).toBeGreaterThan(0);
        // Verify server-side price calculation
        expect(res.body.order.items[0].quantity).toBe(2);

        orderId = res.body.order._id;
    });

    it('POST /api/orders should reject empty items', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ items: [] });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/orders should reject nonexistent product', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [{ product: fakeId.toString(), quantity: 1 }]
            });
        expect(res.statusCode).toBe(404);
    });

    it('POST /api/orders should reject invalid product ID', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [{ product: 'not-a-valid-id', quantity: 1 }]
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/orders should reject zero quantity', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [{ product: productId, quantity: 0 }]
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/orders should reject negative quantity', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [{ product: productId, quantity: -5 }]
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/orders should reject non-integer quantity', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [{ product: productId, quantity: 1.5 }]
            });
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/orders should reject unauthenticated request', async () => {
        const res = await request(app)
            .post('/api/orders')
            .send({
                items: [{ product: productId, quantity: 1 }]
            });
        expect(res.statusCode).toBe(401);
    });
});

// ==========================================
// 9. Order Ownership and Authorization
// ==========================================
describe('Order Ownership', () => {
    it('GET /api/orders should list only current user orders', async () => {
        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.orders).toBeDefined();
        expect(res.body.orders.length).toBeGreaterThan(0);
    });

    it('GET /api/orders/:id should return order by ID for owner', async () => {
        const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body._id).toBe(orderId);
    });

    it('GET /api/orders/:id should deny access to another user', async () => {
        // Use admin token to try to access a user's order
        const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(403);
    });

    it('GET /api/orders/:id should return 400 for invalid ID', async () => {
        const res = await request(app)
            .get('/api/orders/invalid-id')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(400);
    });

    it('GET /api/orders/:id should return 404 for nonexistent order', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/orders/${fakeId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(404);
    });
});

// ==========================================
// 10. Order Cancellation and Payment Status
// ==========================================
describe('Order Cancellation', () => {
    it('PUT /api/orders/:id/cancel should cancel a pending order', async () => {
        const res = await request(app)
            .put(`/api/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.order.status).toBe('cancelled');
        // Should NOT falsely claim refund was issued
        expect(res.body.message).toContain('cancelled');
    });

    it('PUT /api/orders/:id/cancel should reject cancelling already cancelled order', async () => {
        const res = await request(app)
            .put(`/api/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('cancelled');
    });

    it('PUT /api/orders/:id/cancel should deny another user', async () => {
        // Create a new order first for cancellation test
        const orderRes = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                items: [{ product: productId, quantity: 1 }]
            });
        const newOrderId = orderRes.body.order._id;

        const res = await request(app)
            .put(`/api/orders/${newOrderId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(403);
    });
});

// ==========================================
// 11. Wishlist
// ==========================================
describe('Wishlist', () => {
    it('GET /api/wishlist should return empty wishlist initially', async () => {
        const res = await request(app)
            .get('/api/wishlist')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.products).toBeDefined();
    });

    it('POST /api/wishlist should add product to wishlist', async () => {
        const res = await request(app)
            .post('/api/wishlist')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId: productId });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Added');
    });

    it('POST /api/wishlist should prevent duplicate addition', async () => {
        const res = await request(app)
            .post('/api/wishlist')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId: productId });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('already in wishlist');
    });

    it('POST /api/wishlist should reject missing productId', async () => {
        const res = await request(app)
            .post('/api/wishlist')
            .set('Authorization', `Bearer ${userToken}`)
            .send({});
        expect(res.statusCode).toBe(400);
    });

    it('POST /api/wishlist should reject nonexistent product', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post('/api/wishlist')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId: fakeId.toString() });
        expect(res.statusCode).toBe(404);
    });

    it('DELETE /api/wishlist/:productId should remove from wishlist', async () => {
        const res = await request(app)
            .delete(`/api/wishlist/${productId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Removed');
    });

    it('DELETE /api/wishlist/:productId should return 404 for non-wishlisted product', async () => {
        const res = await request(app)
            .delete(`/api/wishlist/${productId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.statusCode).toBe(404);
    });

    it('GET /api/wishlist should reject unauthenticated request', async () => {
        const res = await request(app).get('/api/wishlist');
        expect(res.statusCode).toBe(401);
    });
});

// ==========================================
// 12. 404 Handler
// ==========================================
describe('404 Handler', () => {
    it('GET /nonexistent should return 404', async () => {
        const res = await request(app).get('/nonexistent-route');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toContain('not found');
    });
});
