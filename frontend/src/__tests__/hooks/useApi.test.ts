import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../../hooks/useApi';
import {
    mockConversations,
    mockConversationWithMessages,
    mockCreateConversationResponse,
    mockResponseSubmissionResult,
    mockFetchSuccess,
    mockFetchError,
    mockFetchNoContent,
} from '../fixtures/mockData';

describe('useApi', () => {
    beforeEach(() => {
        // Reset fetch mock before each test
        global.fetch = vi.fn();
        api.resetCsrfTokenForTests();
    });

    describe('createConversation', () => {
        it('should create a conversation and return first question', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(mockCreateConversationResponse));

            const result = await api.createConversation('Test Topic');

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
                body: JSON.stringify({ title: 'Test Topic' }),
            });

            expect(result).toEqual(mockCreateConversationResponse);
            expect(result.conversation.title).toBe('Career transition thoughts');
            expect(result.firstQuestion.type).toBe('question');
        });

        it('should handle errors when creating conversation', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('Title is required', 400));

            await expect(api.createConversation('')).rejects.toThrow('Title is required');
        });
    });

    describe('getAllConversations', () => {
        it('should fetch all conversations', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchSuccess(mockConversations)
            );

            const result = await api.getAllConversations();

            expect(global.fetch).toHaveBeenCalledWith('/api/conversations', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                method: 'GET',
            });

            expect(result).toEqual(mockConversations);
            expect(result).toHaveLength(2);
        });

        it('should handle fetch errors', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchError('Failed to fetch conversations')
            );

            await expect(api.getAllConversations()).rejects.toThrow(
                'Failed to fetch conversations'
            );
        });
    });

    describe('getConversation', () => {
        it('should fetch a conversation by ID with messages', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchSuccess(mockConversationWithMessages)
            );

            const result = await api.getConversation(1);

            expect(global.fetch).toHaveBeenCalledWith('/api/conversations/1', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                method: 'GET',
            });

            expect(result).toEqual(mockConversationWithMessages);
            expect(result.messages).toHaveLength(3);
        });

        it('should handle 404 for non-existent conversation', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchError('Conversation not found', 404)
            );

            await expect(api.getConversation(999)).rejects.toThrow('Conversation not found');
        });
    });

    describe('deleteConversation', () => {
        it('should delete a conversation', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchNoContent());

            const result = await api.deleteConversation(1);

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
            });

            expect(result).toBeNull();
        });

        it('should handle delete errors', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('Conversation not found', 404));

            await expect(api.deleteConversation(999)).rejects.toThrow(
                'Conversation not found'
            );
        });
    });

    describe('regenerateSummary', () => {
        it('should post to regenerate summary endpoint', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess({ summary: 'Updated summary' }));

            const result = await api.regenerateSummary(1);

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/regenerate-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
            });

            expect(result.summary).toBe('Updated summary');
        });
    });

    describe('regenerateQuestion', () => {
        it('should post to regenerate question endpoint', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(
                    mockFetchSuccess({
                        question: {
                            id: 1,
                            conversationId: 1,
                            type: 'question',
                            content: 'Updated question',
                            questionNumber: 2,
                            createdAt: new Date().toISOString(),
                        },
                    })
                );

            const result = await api.regenerateQuestion(1);

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/regenerate-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
            });

            expect(result.question.content).toBe('Updated question');
        });
    });

    describe('submitResponse', () => {
        it('should submit a response and get next question', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(mockResponseSubmissionResult));

            const result = await api.submitResponse(1, 'My thoughtful response');

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
                body: JSON.stringify({ response: 'My thoughtful response' }),
            });

            expect(result).toEqual(mockResponseSubmissionResult);
            expect(result.savedResponse.type).toBe('response');
            expect(result.nextQuestion?.type).toBe('question');
            expect(result.isComplete).toBe(false);
        });

        it('should handle completion of 10th question', async () => {
            const completedResult = {
                savedResponse: mockResponseSubmissionResult.savedResponse,
                isComplete: true,
            };

            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(completedResult));

            const result = await api.submitResponse(1, 'Final response');

            expect(result.isComplete).toBe(true);
            expect(result.nextQuestion).toBeUndefined();
        });

        it('should handle submission errors', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('Failed to generate question', 500));

            await expect(api.submitResponse(1, 'Response')).rejects.toThrow(
                'Failed to generate question'
            );
        });
    });

    describe('getExportUrl', () => {
        it('should return correct export URL', () => {
            const url = api.getExportUrl(42);
            expect(url).toBe('/api/conversations/42/export');
        });
    });

    describe('error handling', () => {
        it('should extract error message from response body', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('Custom error message', 400));

            await expect(api.createConversation('Test')).rejects.toThrow(
                'Custom error message'
            );
        });

        it('should handle responses without error message', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(
                    Promise.resolve({
                        ok: false,
                        status: 500,
                        json: async () => ({}),
                    } as Response)
                );

            await expect(api.createConversation('Test')).rejects.toThrow('HTTP 500');
        });

        it('should handle JSON parsing errors', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(
                    Promise.resolve({
                        ok: false,
                        status: 500,
                        json: async () => {
                            throw new Error('Invalid JSON');
                        },
                    } as Response)
                );

            await expect(api.createConversation('Test')).rejects.toThrow('Request failed');
        });
    });
});
