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
    });

    describe('createConversation', () => {
        it('should create a conversation and return first question', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchSuccess(mockCreateConversationResponse)
            );

            const result = await api.createConversation('Test Topic');

            expect(global.fetch).toHaveBeenCalledWith('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title: 'Test Topic' }),
            });

            expect(result).toEqual(mockCreateConversationResponse);
            expect(result.conversation.title).toBe('Career transition thoughts');
            expect(result.firstQuestion.type).toBe('question');
        });

        it('should handle errors when creating conversation', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchError('Title is required', 400)
            );

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
            (global.fetch as any).mockResolvedValueOnce(mockFetchNoContent());

            const result = await api.deleteConversation(1);

            expect(global.fetch).toHaveBeenCalledWith('/api/conversations/1', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            expect(result).toBeNull();
        });

        it('should handle delete errors', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchError('Conversation not found', 404)
            );

            await expect(api.deleteConversation(999)).rejects.toThrow(
                'Conversation not found'
            );
        });
    });

    describe('submitResponse', () => {
        it('should submit a response and get next question', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchSuccess(mockResponseSubmissionResult)
            );

            const result = await api.submitResponse(1, 'My thoughtful response');

            expect(global.fetch).toHaveBeenCalledWith('/api/conversations/1/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            (global.fetch as any).mockResolvedValueOnce(mockFetchSuccess(completedResult));

            const result = await api.submitResponse(1, 'Final response');

            expect(result.isComplete).toBe(true);
            expect(result.nextQuestion).toBeUndefined();
        });

        it('should handle submission errors', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchError('Failed to generate question', 500)
            );

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
            (global.fetch as any).mockResolvedValueOnce(
                mockFetchError('Custom error message', 400)
            );

            await expect(api.createConversation('Test')).rejects.toThrow(
                'Custom error message'
            );
        });

        it('should handle responses without error message', async () => {
            (global.fetch as any).mockResolvedValueOnce(
                Promise.resolve({
                    ok: false,
                    status: 500,
                    json: async () => ({}),
                } as Response)
            );

            await expect(api.createConversation('Test')).rejects.toThrow('HTTP 500');
        });

        it('should handle JSON parsing errors', async () => {
            (global.fetch as any).mockResolvedValueOnce(
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
