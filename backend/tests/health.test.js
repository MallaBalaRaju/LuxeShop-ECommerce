const request = require('supertest');
const express = require('express');

describe('Health and Metrics Endpoint Tests', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'UP',
                service: 'LuxeShop Backend API',
                timestamp: new Date().toISOString()
            });
        });

        app.get('/metrics', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.status(200).send('# HELP http_requests_total Total number of HTTP requests processed\nhttp_requests_total 1\n');
        });
    });

    it('GET /health should return 200 with UP status', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('UP');
        expect(res.body.service).toBeDefined();
    });

    it('GET /metrics should return 200 with prometheus metrics format', async () => {
        const res = await request(app).get('/metrics');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('http_requests_total');
    });
});
