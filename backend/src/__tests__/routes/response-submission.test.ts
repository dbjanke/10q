import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import * as conversationService from '../../services/conversation.service.js';
import * as openaiService from '../../services/openai.service.js';

vi.mock('../../services/conversation.service.js');
vi.mock('../../services/openai.service.js');
vi.mock('../../config/database.js', () => ({
    getDatabase: vi.fn(),
    initializeDatabase: vi.fn(),
}));

function createApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.user = {
            id: 1,
            email: 'test@example.com',
            role: 'admin',
            status: 'active',
            createdAt: new Date(),
        } as any;
        next();
    });
    app.use('/api', router);
    return app;
}

describe('Routes - Response Submission Resilience', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns an explicit message when next question generation fails after saving response and insights', async () => {
        const app = createApp();

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date(),
            completed: false,
            currentQuestionNumber: 3,
            messages: [
                {
                    id: 10,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 3?',
                    questionNumber: 3,
                    createdAt: new Date(),
                },
            ],
        } as any);

        vi.mocked(conversationService.saveMessage)
            .mockReturnValueOnce({
                id: 11,
                conversationId: 1,
                type: 'response',
                content: 'My response',
                questionNumber: 3,
                createdAt: new Date(),
            } as any)
            .mockReturnValueOnce({
                id: 12,
                conversationId: 1,
                type: 'insight',
                content: 'Concise insights',
                createdAt: new Date(),
            } as any);

        vi.mocked(conversationService.getConversationMessages).mockReturnValue([] as any);
        vi.mocked(openaiService.generateInsights).mockResolvedValue('Concise insights');
        vi.mocked(openaiService.generateQuestion).mockRejectedValue(new Error('insufficient_quota'));

        const response = await request(app)
            .post('/api/conversations/1/response')
            .send({ response: 'My response', selectedQuestion: 'Question 3?' });

        expect(response.status).toBe(502);
        expect(response.body.error).toContain('saved');
        expect(conversationService.saveMessage).toHaveBeenCalledWith(1, 'response', 'My response', 3);
        expect(conversationService.saveMessage).toHaveBeenCalledWith(1, 'insight', 'Concise insights');
        expect(conversationService.deleteConversationMessagesByType).toHaveBeenCalledWith(1, 'insight');
    });

    it('returns an explicit message when insights generation fails after saving response', async () => {
        const app = createApp();

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date(),
            completed: false,
            currentQuestionNumber: 3,
            messages: [
                {
                    id: 10,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 3?',
                    questionNumber: 3,
                    createdAt: new Date(),
                },
            ],
        } as any);

        vi.mocked(conversationService.saveMessage)
            .mockReturnValueOnce({
                id: 11,
                conversationId: 1,
                type: 'response',
                content: 'My response',
                questionNumber: 3,
                createdAt: new Date(),
            } as any);

        vi.mocked(conversationService.getConversationMessages).mockReturnValue([] as any);
        vi.mocked(openaiService.generateInsights).mockRejectedValue(new Error('timeout'));

        const response = await request(app)
            .post('/api/conversations/1/response')
            .send({ response: 'My response', selectedQuestion: 'Question 3?' });

        expect(response.status).toBe(502);
        expect(response.body.error).toContain('saved');
        expect(response.body.error).toContain('key insights');
        expect(openaiService.generateQuestion).not.toHaveBeenCalled();
    });

    it('returns the saved response immediately when a response already exists, without touching the DB or LLM', async () => {
        const app = createApp();

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date(),
            completed: false,
            currentQuestionNumber: 3,
            messages: [
                {
                    id: 10,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 3?',
                    questionNumber: 3,
                    createdAt: new Date(),
                },
                {
                    id: 11,
                    conversationId: 1,
                    type: 'response',
                    content: 'Saved response',
                    questionNumber: 3,
                    createdAt: new Date(),
                },
                {
                    id: 12,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 4?',
                    questionNumber: 4,
                    createdAt: new Date(),
                },
            ],
        } as any);

        const response = await request(app)
            .post('/api/conversations/1/response')
            .send({ response: 'Saved response', selectedQuestion: 'Question 3?' });

        expect(response.status).toBe(200);
        expect(response.body.savedResponse.content).toBe('Saved response');
        expect(response.body.isComplete).toBe(false);
        expect(response.body.nextQuestions).toBeUndefined();
        expect(vi.mocked(conversationService.saveMessage)).not.toHaveBeenCalled();
        expect(vi.mocked(openaiService.generateInsights)).not.toHaveBeenCalled();
        expect(vi.mocked(openaiService.generateQuestion)).not.toHaveBeenCalled();
    });

    it('returns the saved response immediately when response exists but next questions are not yet in DB', async () => {
        const app = createApp();

        vi.mocked(conversationService.getConversationById).mockReturnValue({
            id: 1,
            title: 'Test',
            summary: null,
            createdAt: new Date(),
            completed: false,
            currentQuestionNumber: 3,
            messages: [
                {
                    id: 10,
                    conversationId: 1,
                    type: 'question',
                    content: 'Question 3?',
                    questionNumber: 3,
                    createdAt: new Date(),
                },
                {
                    id: 11,
                    conversationId: 1,
                    type: 'response',
                    content: 'Saved response',
                    questionNumber: 3,
                    createdAt: new Date(),
                },
            ],
        } as any);

        const response = await request(app)
            .post('/api/conversations/1/response')
            .send({ response: 'Saved response', selectedQuestion: 'Question 3?' });

        expect(response.status).toBe(200);
        expect(response.body.savedResponse.content).toBe('Saved response');
        expect(response.body.isComplete).toBe(false);
        expect(vi.mocked(conversationService.saveMessage)).not.toHaveBeenCalled();
        expect(vi.mocked(openaiService.generateInsights)).not.toHaveBeenCalled();
        expect(vi.mocked(openaiService.generateQuestion)).not.toHaveBeenCalled();
    });
});
