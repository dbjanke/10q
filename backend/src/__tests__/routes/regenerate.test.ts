import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import * as conversationService from '../../services/conversation.service.js';
import * as openaiService from '../../services/openai.service.js';
import { getUserStore } from '../../stores/user.store.js';

vi.mock('../../services/conversation.service.js');
vi.mock('../../services/openai.service.js');
vi.mock('../../stores/user.store.js', () => ({
    getUserStore: vi.fn(),
}));

function createApp(permissions: string[] = []) {
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
        getUserPermissions: vi.fn().mockReturnValue(permissions),
    } as any);

    app.use('/api', router);
    return app;
}

describe('Routes - Regenerate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should reject regenerate summary without permission', async () => {
        const app = createApp([]);
        const response = await request(app).post('/api/conversations/1/regenerate-summary');

        expect(response.status).toBe(403);
    });

    it('should regenerate summary for completed conversation', async () => {
        const app = createApp(['regenerate_summary_question']);

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: 'Old summary',
            createdAt: new Date(),
            completed: true,
            currentQuestionNumber: 10,
            messages: [],
        } as any);

        vi.mocked(conversationService.getConversationMessages).mockReturnValue([] as any);
        vi.mocked(openaiService.generateSummary).mockResolvedValue('New summary');
        vi.mocked(conversationService.saveMessage).mockReturnValue({
            id: 1,
            conversationId: 1,
            type: 'summary',
            content: 'New summary',
            createdAt: new Date(),
        } as any);

        const response = await request(app).post('/api/conversations/1/regenerate-summary');

        expect(response.status).toBe(200);
        expect(response.body.summary).toBe('New summary');
        expect(conversationService.deleteConversationMessagesByType).toHaveBeenCalledWith(1, 'summary');
        expect(conversationService.updateConversationSummary).toHaveBeenCalledWith(1, 'New summary');
    });

    it('should reject regenerate question when current question already answered', async () => {
        const app = createApp(['regenerate_summary_question']);

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date(),
            completed: false,
            currentQuestionNumber: 2,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'response',
                    content: 'Answer',
                    questionNumber: 2,
                    createdAt: new Date(),
                },
            ],
        } as any);

        const response = await request(app).post('/api/conversations/1/regenerate-question');

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('answered');
    });

    it('should regenerate current question when allowed', async () => {
        const app = createApp(['regenerate_summary_question']);

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date(),
            completed: false,
            currentQuestionNumber: 2,
            messages: [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'Old question',
                    questionNumber: 2,
                    createdAt: new Date(),
                },
            ],
        } as any);

        vi.mocked(openaiService.generateQuestion).mockResolvedValue('New question');
        vi.mocked(conversationService.saveMessage).mockReturnValue({
            id: 2,
            conversationId: 1,
            type: 'question',
            content: 'New question',
            questionNumber: 2,
            createdAt: new Date(),
        } as any);

        const response = await request(app).post('/api/conversations/1/regenerate-question');

        expect(response.status).toBe(200);
        expect(response.body.question.content).toBe('New question');
        expect(conversationService.deleteQuestionMessage).toHaveBeenCalledWith(1, 2);
    });
});
