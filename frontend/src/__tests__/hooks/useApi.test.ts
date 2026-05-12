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

        it('should include context fields in the request body when provided', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(mockCreateConversationResponse));

            await api.createConversation('Article Topic', {
                contextSummary: 'A two-paragraph summary.',
                contextKeyInsights: '• Insight one\n• Insight two',
            });

            const body = JSON.parse((global.fetch as any).mock.calls[1][1].body);
            expect(body.title).toBe('Article Topic');
            expect(body.contextSummary).toBe('A two-paragraph summary.');
            expect(body.contextKeyInsights).toBe('• Insight one\n• Insight two');
        });

        it('should handle errors when creating conversation', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('Title is required', 400));

            await expect(api.createConversation('')).rejects.toThrow('Title is required');
        });
    });

    describe('uploadArticle', () => {
        it('should POST the file as FormData with the CSRF token header', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess({ keyInsights: '• Insight', summary: 'Summary text' }));

            const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
            const result = await api.uploadArticle(file);

            const [url, options] = (global.fetch as any).mock.calls[1];
            expect(url).toBe('/api/articles');
            expect(options.method).toBe('POST');
            expect(options.headers['X-CSRF-Token']).toBe('test-token');
            expect(options.headers['Content-Type']).toBeUndefined();
            expect(options.body).toBeInstanceOf(FormData);
            expect(result).toEqual({ keyInsights: '• Insight', summary: 'Summary text' });
        });

        it('should throw when the upload fails', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('PDF exceeds size limit', 413));

            const file = new File(['data'], 'big.pdf', { type: 'application/pdf' });
            await expect(api.uploadArticle(file)).rejects.toThrow('PDF exceeds size limit');
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
                .mockResolvedValueOnce(mockFetchSuccess({}));

            await api.regenerateQuestion(1);

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/regenerate-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
            });
        });
    });

    describe('regenerateInsights', () => {
        it('should post to regenerate insights endpoint', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(
                    mockFetchSuccess({
                        insights: {
                            id: 9,
                            conversationId: 1,
                            type: 'insight',
                            content: 'Latest insights',
                            createdAt: new Date().toISOString(),
                        },
                    })
                );

            const result = await api.regenerateInsights(1);

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/regenerate-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
            });

            expect(result.insights.type).toBe('insight');
        });
    });

    describe('submitResponse', () => {
        it('should submit a response and get next questions array', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(mockResponseSubmissionResult));

            const result = await api.submitResponse(1, 'My thoughtful response', 'What brings you here?');

            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
                credentials: 'include',
                body: JSON.stringify({ response: 'My thoughtful response', selectedQuestion: 'What brings you here?' }),
            });

            expect(result).toEqual(mockResponseSubmissionResult);
            expect(result.savedResponse.type).toBe('response');
            expect(result.nextQuestions?.[0].type).toBe('question');
            expect(result.isComplete).toBe(false);
        });

        it('should include selectedQuestion in the request body', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(mockResponseSubmissionResult));

            await api.submitResponse(1, 'My answer', 'The selected question text');

            const callBody = JSON.parse(
                (global.fetch as any).mock.calls[1][1].body
            );
            expect(callBody.selectedQuestion).toBe('The selected question text');
            expect(callBody.response).toBe('My answer');
        });

        it('should handle completion of 10th question', async () => {
            const completedResult = {
                savedResponse: mockResponseSubmissionResult.savedResponse,
                isComplete: true,
            };

            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(completedResult));

            const result = await api.submitResponse(1, 'Final response', 'Last question?');

            expect(result.isComplete).toBe(true);
            expect(result.nextQuestions).toBeUndefined();
        });

        it('should handle submission errors', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchError('Failed to generate question', 500));

            await expect(api.submitResponse(1, 'Response', 'Q?')).rejects.toThrow(
                'Failed to generate question'
            );
        });
    });

    describe('getCurrentUser', () => {
        it('should fetch the current user', async () => {
            const mockUser = {
                id: 1, email: 'test@example.com', name: 'Test User',
                role: 'user', status: 'active', createdAt: new Date().toISOString(),
            };
            (global.fetch as any).mockResolvedValueOnce(mockFetchSuccess({ user: mockUser }));

            const result = await api.getCurrentUser();

            expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
                method: 'GET',
            }));
            expect(result).toEqual(mockUser);
        });

        it('should throw when not authenticated', async () => {
            (global.fetch as any).mockResolvedValueOnce(mockFetchError('Authentication required', 401));
            await expect(api.getCurrentUser()).rejects.toThrow('Authentication required');
        });
    });

    describe('logout', () => {
        it('should POST to the logout endpoint', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchNoContent());

            await api.logout();

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/auth/logout', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'X-CSRF-Token': 'test-token' }),
            }));
        });
    });

    describe('updateConversationTitle', () => {
        it('should PATCH the conversation title', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess({ title: 'New Title' }));

            const result = await api.updateConversationTitle(1, 'New Title');

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/conversations/1/title', expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ title: 'New Title' }),
            }));
            expect(result.title).toBe('New Title');
        });
    });

    describe('getExportUrl', () => {
        it('should return correct export URL', () => {
            const url = api.getExportUrl(42);
            expect(url).toBe('/api/conversations/42/export');
        });
    });

    describe('admin: users', () => {
        it('getUsers should fetch all users', async () => {
            const users = [{ id: 1, email: 'a@b.com', role: 'user', status: 'active', createdAt: new Date().toISOString() }];
            (global.fetch as any).mockResolvedValueOnce(mockFetchSuccess(users));
            const result = await api.getUsers();
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ method: 'GET' }));
            expect(result).toEqual(users);
        });

        it('inviteUser should POST to admin users', async () => {
            const newUser = { id: 2, email: 'new@b.com', role: 'user', status: 'invited', createdAt: new Date().toISOString() };
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(newUser));

            const result = await api.inviteUser('new@b.com');

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/users', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ email: 'new@b.com', role: 'user' }),
            }));
            expect(result).toEqual(newUser);
        });

        it('inviteUser should pass a custom role', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess({ id: 3, email: 'admin@b.com', role: 'admin', status: 'invited', createdAt: new Date().toISOString() }));

            await api.inviteUser('admin@b.com', 'admin');

            const body = JSON.parse((global.fetch as any).mock.calls[1][1].body);
            expect(body.role).toBe('admin');
        });

        it('updateUser should PATCH the user', async () => {
            const updated = { id: 1, email: 'a@b.com', role: 'admin', status: 'active', createdAt: new Date().toISOString() };
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(updated));

            const result = await api.updateUser(1, { role: 'admin' });

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/users/1', expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ role: 'admin' }),
            }));
            expect(result).toEqual(updated);
        });

        it('deleteUser should DELETE the user', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchNoContent());

            await api.deleteUser(1);

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/users/1', expect.objectContaining({ method: 'DELETE' }));
        });
    });

    describe('admin: permissions', () => {
        it('getPermissions should fetch permissions array', async () => {
            const permissions = [{ id: 'read', name: 'Read' }, { id: 'write', name: 'Write' }];
            (global.fetch as any).mockResolvedValueOnce(mockFetchSuccess({ permissions }));

            const result = await api.getPermissions();

            expect(global.fetch).toHaveBeenCalledWith('/api/admin/permissions', expect.objectContaining({ method: 'GET' }));
            expect(result).toEqual(permissions);
        });
    });

    describe('admin: groups', () => {
        it('getGroups should fetch all groups', async () => {
            const groups = [{ id: 1, name: 'Editors', permissions: [] }];
            (global.fetch as any).mockResolvedValueOnce(mockFetchSuccess(groups));

            const result = await api.getGroups();

            expect(global.fetch).toHaveBeenCalledWith('/api/admin/groups', expect.objectContaining({ method: 'GET' }));
            expect(result).toEqual(groups);
        });

        it('createGroup should POST a new group', async () => {
            const newGroup = { id: 2, name: 'Reviewers', permissions: [] };
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(newGroup));

            const result = await api.createGroup('Reviewers');

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/groups', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'Reviewers' }),
            }));
            expect(result).toEqual(newGroup);
        });

        it('updateGroup should PATCH the group', async () => {
            const updated = { id: 1, name: 'Senior Editors', permissions: ['read'] };
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchSuccess(updated));

            const result = await api.updateGroup(1, { name: 'Senior Editors' });

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/groups/1', expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ name: 'Senior Editors' }),
            }));
            expect(result).toEqual(updated);
        });

        it('deleteGroup should DELETE the group', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce(mockFetchSuccess({ csrfToken: 'test-token' }))
                .mockResolvedValueOnce(mockFetchNoContent());

            await api.deleteGroup(1);

            expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/groups/1', expect.objectContaining({ method: 'DELETE' }));
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
