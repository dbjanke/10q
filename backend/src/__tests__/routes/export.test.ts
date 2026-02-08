import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';

describe('Routes - Export', () => {
    it('should require authentication', async () => {
        const app = express();
        app.use(express.json());
        app.use('/api', router);

        const response = await request(app).get('/api/conversations/1/export');

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('Authentication required');
    });
});