import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import * as conversationService from '../../services/conversation.service.js';
import * as openaiService from '../../services/openai.service.js';

vi.mock('../../services/conversation.service.js');
vi.mock('../../services/openai.service.js');
vi.mock('../../config/commands.js', () => ({
    loadCommands: vi.fn().mockReturnValue([{ number: 1, name: 'Q1', prompt: 'Ask something', staticQuestion: 'What are you wrestling with?' }]),
    getCommand: vi.fn().mockReturnValue({ number: 1, name: 'Q1', prompt: 'Ask something', staticQuestion: 'What are you wrestling with?' }),
    getNumOptions: vi.fn().mockReturnValue(3),
    getInsightsPrompt: vi.fn().mockReturnValue('Highlight prompt'),
}));
vi.mock('../../config/database.js', () => ({
    getDatabase: vi.fn(),
    initializeDatabase: vi.fn(),
}));

const MOCK_CONVERSATION = {
    id: 1,
    title: 'Test',
    summary: null,
    createdAt: new Date(),
    completed: false,
    currentQuestionNumber: 0,
};

const MOCK_QUESTION_MESSAGE = {
    id: 2,
    conversationId: 1,
    type: 'question',
    content: 'Generated Q1?',
    questionNumber: 1,
    createdAt: new Date(),
};

const MOCK_CONTEXT_MESSAGE = {
    id: 1,
    conversationId: 1,
    type: 'conversation_context',
    content: '## CONTEXT\n\nArticle summary text.',
    createdAt: new Date(),
};

describe('POST /api/conversations - context behaviour', () => {
    let app: express.Application;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            req.user = { id: 1, email: 'test@example.com', role: 'user', status: 'active', createdAt: new Date() } as any;
            next();
        });
        app.use('/api', router);
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(conversationService.createConversation).mockReturnValue(MOCK_CONVERSATION as any);
        vi.mocked(conversationService.saveMessage).mockReturnValue(MOCK_QUESTION_MESSAGE as any);
        vi.mocked(conversationService.deleteQuestionMessage).mockReturnValue(undefined);
        vi.mocked(conversationService.updateConversationProgress).mockReturnValue(undefined);
        vi.mocked(openaiService.generateQuestion).mockResolvedValue(['Generated Q1?']);
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('without context: uses staticQuestion and passes empty history', async () => {
        const res = await request(app)
            .post('/api/conversations')
            .send({ title: 'My session' });

        expect(res.status).toBe(201);
        expect(openaiService.generateQuestion).toHaveBeenCalledWith(
            [],       // empty history
            1,
            undefined,
            1         // count=1 because staticQuestion is set
        );
        // context message should NOT be saved
        const contextSave = vi.mocked(conversationService.saveMessage).mock.calls.find(
            ([, type]) => type === 'conversation_context'
        );
        expect(contextSave).toBeUndefined();
    });

    it('with context: saves conversation_context message and uses staticQuestion', async () => {
        vi.mocked(conversationService.getConversationMessages).mockReturnValue([MOCK_CONTEXT_MESSAGE as any]);

        const res = await request(app)
            .post('/api/conversations')
            .send({
                title: 'Article session',
                contextSummary: 'Article summary text.',
                contextKeyInsights: '• Insight one\n• Insight two',
            });

        expect(res.status).toBe(201);

        // context message saved with formatted header
        const contextSave = vi.mocked(conversationService.saveMessage).mock.calls.find(
            ([, type]) => type === 'conversation_context'
        );
        expect(contextSave).toBeDefined();
        expect(contextSave![2]).toBe('## CONTEXT\n\nArticle summary text.');

        // Q1 still uses staticQuestion (count=1, no bypassStatic)
        expect(openaiService.generateQuestion).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ type: 'conversation_context' })]),
            1,
            '• Insight one\n• Insight two',
            1      // count=1 because staticQuestion is always honored
        );

        // key insights saved as an insight message so ConversationView shows them at Q1
        const insightSave = vi.mocked(conversationService.saveMessage).mock.calls.find(
            ([, type]) => type === 'insight'
        );
        expect(insightSave).toBeDefined();
        expect(insightSave![2]).toBe('• Insight one\n• Insight two');
    });
});
