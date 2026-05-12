import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import * as conversationService from '../../services/conversation.service.js';
import * as exportService from '../../services/export.service.js';

vi.mock('../../services/conversation.service.js');
vi.mock('../../services/export.service.js');
vi.mock('../../config/database.js', () => ({
    getDatabase: vi.fn(),
    initializeDatabase: vi.fn(),
}));
vi.mock('../../utils/logger.js', () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function makeConversation(overrides = {}) {
    return {
        id: 1,
        title: 'Test Conversation',
        createdAt: new Date(),
        completed: false,
        currentQuestionNumber: 0,
        messages: [],
        ...overrides,
    };
}

function createAuthApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.user = {
            id: 1,
            email: 'test@example.com',
            role: 'user',
            status: 'active',
            createdAt: new Date(),
        } as any;
        next();
    });
    app.use('/api', router);
    return app;
}

function createUnauthApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return app;
}

describe('Routes - Export', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should require authentication', async () => {
        const response = await request(createUnauthApp()).get('/api/conversations/1/export');
        expect(response.status).toBe(401);
        expect(response.body.error).toContain('Authentication required');
    });

    it('should return 400 for a non-numeric conversation ID', async () => {
        const response = await request(createAuthApp()).get('/api/conversations/abc/export');
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid conversation ID');
    });

    it('should return 404 when the conversation does not exist', async () => {
        vi.mocked(conversationService.getConversationById).mockReturnValue(null);
        const response = await request(createAuthApp()).get('/api/conversations/999/export');
        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Conversation not found');
    });

    it('should return markdown with the correct Content-Type header', async () => {
        vi.mocked(conversationService.getConversationById).mockReturnValue(makeConversation() as any);
        vi.mocked(exportService.exportToMarkdown).mockReturnValue('# Test Conversation\n\n');

        const response = await request(createAuthApp()).get('/api/conversations/1/export');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/markdown');
    });

    it('should set a Content-Disposition attachment header with a sanitized filename', async () => {
        vi.mocked(conversationService.getConversationById).mockReturnValue(
            makeConversation({ title: 'My Cool Conversation!' }) as any
        );
        vi.mocked(exportService.exportToMarkdown).mockReturnValue('# My Cool Conversation!\n\n');

        const response = await request(createAuthApp()).get('/api/conversations/1/export');

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('My_Cool_Conversation_.md');
    });

    it('should return the markdown body produced by exportToMarkdown', async () => {
        const expectedMarkdown = '# Test Conversation\n\n**Status:** Completed\n\n';
        vi.mocked(conversationService.getConversationById).mockReturnValue(makeConversation() as any);
        vi.mocked(exportService.exportToMarkdown).mockReturnValue(expectedMarkdown);

        const response = await request(createAuthApp()).get('/api/conversations/1/export');

        expect(response.text).toBe(expectedMarkdown);
    });

    it('should return 500 when exportToMarkdown throws', async () => {
        vi.mocked(conversationService.getConversationById).mockReturnValue(makeConversation() as any);
        vi.mocked(exportService.exportToMarkdown).mockImplementation(() => {
            throw new Error('serialization error');
        });

        const response = await request(createAuthApp()).get('/api/conversations/1/export');

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('Failed to export conversation');
    });
});