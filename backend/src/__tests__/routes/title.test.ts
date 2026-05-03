import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import * as conversationService from '../../services/conversation.service.js';
import { getUserStore } from '../../stores/user.store.js';

vi.mock('../../services/conversation.service.js');
vi.mock('../../stores/user.store.js', () => ({
    getUserStore: vi.fn(),
}));

function createApp() {
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

    vi.mocked(getUserStore).mockReturnValue({
        getUserPermissions: vi.fn().mockReturnValue([]),
    } as any);

    app.use('/api', router);
    return app;
}

const mockConversation = {
    id: 1,
    title: 'Original Title',
    summary: null,
    createdAt: new Date(),
    completed: false,
    currentQuestionNumber: 1,
    messages: [],
};

describe('Routes - Update Title', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates the title and returns the new value', async () => {
        const app = createApp();
        vi.mocked(conversationService.getConversationById).mockReturnValue(mockConversation as any);

        const response = await request(app)
            .patch('/api/conversations/1/title')
            .send({ title: 'New Title' });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('New Title');
        expect(conversationService.updateConversationTitle).toHaveBeenCalledWith(1, 'New Title');
    });

    it('trims whitespace from the title', async () => {
        const app = createApp();
        vi.mocked(conversationService.getConversationById).mockReturnValue(mockConversation as any);

        const response = await request(app)
            .patch('/api/conversations/1/title')
            .send({ title: '  Trimmed Title  ' });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Trimmed Title');
        expect(conversationService.updateConversationTitle).toHaveBeenCalledWith(1, 'Trimmed Title');
    });

    it('returns 400 when title is empty', async () => {
        const app = createApp();

        const response = await request(app)
            .patch('/api/conversations/1/title')
            .send({ title: '' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Title is required');
        expect(conversationService.updateConversationTitle).not.toHaveBeenCalled();
    });

    it('returns 400 when title is only whitespace', async () => {
        const app = createApp();

        const response = await request(app)
            .patch('/api/conversations/1/title')
            .send({ title: '   ' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Title is required');
    });

    it('returns 400 when title exceeds max length', async () => {
        const app = createApp();

        const response = await request(app)
            .patch('/api/conversations/1/title')
            .send({ title: 'A'.repeat(51) });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/too long/i);
    });

    it('returns 404 when conversation does not belong to user', async () => {
        const app = createApp();
        vi.mocked(conversationService.getConversationById).mockReturnValue(null);

        const response = await request(app)
            .patch('/api/conversations/1/title')
            .send({ title: 'New Title' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Conversation not found');
    });

    it('returns 400 for an invalid conversation ID', async () => {
        const app = createApp();

        const response = await request(app)
            .patch('/api/conversations/abc/title')
            .send({ title: 'New Title' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid conversation ID');
    });
});
