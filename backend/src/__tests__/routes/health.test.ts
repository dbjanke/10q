import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../../routes.js';
import { getConversationStore } from '../../stores/conversation.store.js';
import * as openaiService from '../../services/openai.service.js';

vi.mock('../../stores/conversation.store.js', () => ({
    getConversationStore: vi.fn(),
}));

vi.mock('../../services/openai.service.js', async () => {
    const actual = await vi.importActual<typeof import('../../services/openai.service.js')>(
        '../../services/openai.service.js'
    );
    return {
        ...actual,
        checkOpenAiHealth: vi.fn(),
    };
});

describe('Routes - Health', () => {
    let app: express.Application;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api', router);
    });

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.clearAllMocks();
    });

    afterAll(() => {
        consoleErrorSpy?.mockRestore();
        vi.restoreAllMocks();
    });

    it('should return ok for ping', async () => {
        const response = await request(app).get('/api/ping');

        expect(response.status).toBe(200);
        expect(response.text).toBe('ok');
    });

    it('should return ok for deep ping when dependencies are healthy', async () => {
        vi.mocked(getConversationStore).mockReturnValue({
            checkHealth: vi.fn(),
        } as any);
        vi.mocked(openaiService.checkOpenAiHealth).mockResolvedValue({
            ok: true,
            latencyMs: 5,
        });

        const response = await request(app).get('/api/deep-ping');

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(typeof response.body.latencyMs).toBe('number');
    });

    it('should return 503 for deep ping when dependencies are unhealthy', async () => {
        vi.mocked(getConversationStore).mockReturnValue({
            checkHealth: vi.fn(() => {
                throw new Error('DB down');
            }),
        } as any);
        vi.mocked(openaiService.checkOpenAiHealth).mockResolvedValue({
            ok: true,
            latencyMs: 5,
        });

        const response = await request(app).get('/api/deep-ping');

        expect(response.status).toBe(503);
        expect(response.body.ok).toBe(false);
    });
});
