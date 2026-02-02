import { Conversation, ConversationWithMessages, Message } from '../../types';

/**
 * Mock API responses for testing
 */

export const mockConversations: Conversation[] = [
    {
        id: 1,
        title: "Career transition thoughts",
        summary: undefined,
        createdAt: new Date("2026-01-15T10:00:00Z"),
        completed: false,
        currentQuestionNumber: 3,
    },
    {
        id: 2,
        title: "Relationship boundaries",
        summary: "A thoughtful exploration of setting healthy boundaries.",
        createdAt: new Date("2026-01-10T14:30:00Z"),
        completed: true,
        currentQuestionNumber: 10,
    },
];

export const mockMessages: Message[] = [
    {
        id: 1,
        conversationId: 1,
        type: 'question',
        content: "What brings you to explore this topic right now?",
        questionNumber: 1,
        createdAt: new Date("2026-01-15T10:00:00Z"),
    },
    {
        id: 2,
        conversationId: 1,
        type: 'response',
        content: "I've been feeling stuck in my current role.",
        questionNumber: 1,
        createdAt: new Date("2026-01-15T10:05:00Z"),
    },
    {
        id: 3,
        conversationId: 1,
        type: 'question',
        content: "What feels most unresolved or important about this situation?",
        questionNumber: 2,
        createdAt: new Date("2026-01-15T10:05:01Z"),
    },
];

export const mockConversationWithMessages: ConversationWithMessages = {
    ...mockConversations[0],
    messages: mockMessages,
};

export const mockCreateConversationResponse = {
    conversation: mockConversations[0],
    firstQuestion: mockMessages[0],
};

export const mockResponseSubmissionResult = {
    savedResponse: mockMessages[1],
    nextQuestion: mockMessages[2],
    isComplete: false,
};

/**
 * Create a mock fetch function for API testing
 */
export function createMockFetch() {
    return vi.fn() as ReturnType<typeof vi.fn>;
}

/**
 * Helper to mock successful API responses
 */
export function mockFetchSuccess<T>(data: T, status = 200) {
    return Promise.resolve({
        ok: true,
        status,
        json: async () => data,
    } as Response);
}

/**
 * Helper to mock API errors
 */
export function mockFetchError(error: string, status = 500) {
    return Promise.resolve({
        ok: false,
        status,
        json: async () => ({ error }),
    } as Response);
}

/**
 * Helper to mock 204 No Content responses
 */
export function mockFetchNoContent() {
    return Promise.resolve({
        ok: true,
        status: 204,
    } as Response);
}
