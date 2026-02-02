import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import { MAX_TITLE_LENGTH, MAX_RESPONSE_LENGTH } from '../../config/validation.js';
import * as conversationService from '../../services/conversation.service.js';
import * as openaiService from '../../services/openai.service.js';

// Mock dependencies
vi.mock('../../services/conversation.service.js');
vi.mock('../../services/openai.service.js');
vi.mock('../../config/database.js', () => ({
    getDatabase: vi.fn(),
    initializeDatabase: vi.fn(),
}));

describe('Routes - Validation', () => {
    let app: express.Application;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api', router);
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    describe('POST /conversations - Title Validation', () => {
        it('should reject empty title', async () => {
            const response = await request(app)
                .post('/api/conversations')
                .send({ title: '' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should reject whitespace-only title', async () => {
            const response = await request(app)
                .post('/api/conversations')
                .send({ title: '   ' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should reject title exceeding MAX_TITLE_LENGTH', async () => {
            const tooLongTitle = 'a'.repeat(MAX_TITLE_LENGTH + 1);

            const response = await request(app)
                .post('/api/conversations')
                .send({ title: tooLongTitle });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('too long');
            expect(response.body.error).toContain(String(MAX_TITLE_LENGTH));
        });

        it('should accept title at exactly MAX_TITLE_LENGTH', async () => {
            const exactLengthTitle = 'a'.repeat(MAX_TITLE_LENGTH);

            vi.mocked(conversationService.createConversation).mockReturnValue({
                id: 1,
                title: exactLengthTitle,
                summary: null,
                createdAt: new Date().toISOString(),
                completed: false,
                currentQuestionNumber: 0,
            });

            vi.mocked(openaiService.generateQuestion).mockResolvedValue('First question?');

            vi.mocked(conversationService.saveMessage).mockReturnValue({
                id: 1,
                conversationId: 1,
                type: 'question',
                content: 'First question?',
                questionNumber: 1,
                createdAt: new Date().toISOString(),
            });

            vi.mocked(conversationService.updateConversationProgress).mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/conversations')
                .send({ title: exactLengthTitle });

            expect(response.status).toBe(201);
        });

        it('should accept valid title within limit', async () => {
            const validTitle = 'My thoughtful question';

            vi.mocked(conversationService.createConversation).mockReturnValue({
                id: 1,
                title: validTitle,
                summary: null,
                createdAt: new Date().toISOString(),
                completed: false,
                currentQuestionNumber: 0,
            });

            vi.mocked(openaiService.generateQuestion).mockResolvedValue('First question?');

            vi.mocked(conversationService.saveMessage).mockReturnValue({
                id: 1,
                conversationId: 1,
                type: 'question',
                content: 'First question?',
                questionNumber: 1,
                createdAt: new Date().toISOString(),
            });

            vi.mocked(conversationService.updateConversationProgress).mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/conversations')
                .send({ title: validTitle });

            expect(response.status).toBe(201);
        });
    });

    describe('POST /conversations/:id/response - Response Validation', () => {
        beforeEach(() => {
            vi.mocked(conversationService.getConversationById).mockReturnValue({
                id: 1,
                title: 'Test',
                summary: null,
                createdAt: new Date().toISOString(),
                completed: false,
                currentQuestionNumber: 5,
            });
        });

        it('should reject empty response', async () => {
            const response = await request(app)
                .post('/api/conversations/1/response')
                .send({ response: '' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should reject whitespace-only response', async () => {
            const response = await request(app)
                .post('/api/conversations/1/response')
                .send({ response: '   ' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should reject response exceeding MAX_RESPONSE_LENGTH', async () => {
            const tooLongResponse = 'a'.repeat(MAX_RESPONSE_LENGTH + 1);

            const response = await request(app)
                .post('/api/conversations/1/response')
                .send({ response: tooLongResponse });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('too long');
            expect(response.body.error).toContain(String(MAX_RESPONSE_LENGTH));
        });

        it('should accept response at exactly MAX_RESPONSE_LENGTH', async () => {
            const exactLengthResponse = 'a'.repeat(MAX_RESPONSE_LENGTH);

            vi.mocked(conversationService.saveMessage).mockReturnValue({
                id: 1,
                conversationId: 1,
                type: 'response',
                content: exactLengthResponse,
                questionNumber: 5,
                createdAt: new Date().toISOString(),
            });

            vi.mocked(openaiService.generateQuestion).mockResolvedValue('Next question?');

            vi.mocked(conversationService.updateConversationProgress).mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/conversations/1/response')
                .send({ response: exactLengthResponse });

            expect(response.status).toBe(200);
        });

        it('should accept valid response within limit', async () => {
            const validResponse = 'This is my thoughtful response to the question.';

            vi.mocked(conversationService.saveMessage).mockReturnValue({
                id: 1,
                conversationId: 1,
                type: 'response',
                content: validResponse,
                questionNumber: 5,
                createdAt: new Date().toISOString(),
            });

            vi.mocked(openaiService.generateQuestion).mockResolvedValue('Next question?');

            vi.mocked(conversationService.updateConversationProgress).mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/conversations/1/response')
                .send({ response: validResponse });

            expect(response.status).toBe(200);
        });
    });
});
