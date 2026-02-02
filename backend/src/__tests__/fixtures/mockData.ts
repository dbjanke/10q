/**
 * Mock OpenAI responses for testing
 */
export const mockOpenAIResponses = {
    question1: "What brings you to explore this topic right now?",
    question2: "What feels most unresolved or important about this situation?",
    question3: "If you could clarify one thing about your core concern, what would it be?",
    question4: "What assumption are you making that might not be true?",
    question5: "What are you trying to protect or avoid in this situation?",
    question6: "Where do your values or goals pull against each other here?",
    question7: "What would this look like if you approached it from the opposite direction?",
    question8: "How might you see this differently five years from now?",
    question9: "If this approach succeeded, what unexpected consequences might follow?",
    question10: "What universal principle have you discovered through this exploration?",

    summary: `This conversation explored a complex personal challenge with depth and nuance. 
Through ten progressively focused questions, key themes emerged around identity, values, and change. 
The insights gained reveal a path forward that honors both practical constraints and deeper aspirations.`,
};

/**
 * Sample conversation data for testing
 */
export const mockConversations = {
    incomplete: {
        id: 1,
        title: "Career transition thoughts",
        summary: null,
        createdAt: new Date("2026-01-15T10:00:00Z"),
        completed: false,
        currentQuestionNumber: 3,
    },

    complete: {
        id: 2,
        title: "Relationship boundaries",
        summary: "A thoughtful exploration of setting healthy boundaries.",
        createdAt: new Date("2026-01-10T14:30:00Z"),
        completed: true,
        currentQuestionNumber: 10,
    },
};

/**
 * Sample messages for testing
 */
export const mockMessages = {
    question1: {
        id: 1,
        conversationId: 1,
        type: 'question' as const,
        content: mockOpenAIResponses.question1,
        questionNumber: 1,
        createdAt: new Date("2026-01-15T10:00:00Z"),
    },

    response1: {
        id: 2,
        conversationId: 1,
        type: 'response' as const,
        content: "I've been feeling stuck in my current role and considering a change.",
        questionNumber: 1,
        createdAt: new Date("2026-01-15T10:05:00Z"),
    },

    question2: {
        id: 3,
        conversationId: 1,
        type: 'question' as const,
        content: mockOpenAIResponses.question2,
        questionNumber: 2,
        createdAt: new Date("2026-01-15T10:05:01Z"),
    },

    response2: {
        id: 4,
        conversationId: 1,
        type: 'response' as const,
        content: "The lack of growth opportunities and creative work.",
        questionNumber: 2,
        createdAt: new Date("2026-01-15T10:10:00Z"),
    },
};

/**
 * Mock OpenAI client for testing
 */
export function createMockOpenAIClient() {
    return {
        chat: {
            completions: {
                create: vi.fn().mockResolvedValue({
                    choices: [
                        {
                            message: {
                                content: mockOpenAIResponses.question1,
                            },
                        },
                    ],
                }),
            },
        },
    };
}

/**
 * Create a mock OpenAI response
 */
export function mockOpenAICompletion(content: string) {
    return {
        choices: [
            {
                message: {
                    content,
                },
            },
        ],
    };
}
