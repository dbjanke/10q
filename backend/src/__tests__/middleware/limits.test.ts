import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { rateLimit } from '../../middleware/rateLimit.js';
import { concurrencyLimit } from '../../middleware/concurrencyLimit.js';

describe('Middleware - rateLimit', () => {
    it('should block when limit is exceeded', async () => {
        const app = express();
        app.use(rateLimit({ windowMs: 1000, max: 1 }));
        app.get('/test', (_req, res) => res.status(200).send('ok'));

        const first = await request(app).get('/test');
        const second = await request(app).get('/test');

        expect(first.status).toBe(200);
        expect(second.status).toBe(429);
        expect(second.body.error).toBe('Too many requests');
    });
});

describe('Middleware - concurrencyLimit', () => {
    it('should block when concurrency limit is reached', async () => {
        const app = express();
        app.use(concurrencyLimit({ max: 0 }));
        app.get('/test', (_req, res) => res.status(200).send('ok'));

        const response = await request(app).get('/test');

        expect(response.status).toBe(503);
        expect(response.body.error).toBe('Server busy');
    });
});
