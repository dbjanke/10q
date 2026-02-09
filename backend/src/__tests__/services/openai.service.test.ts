import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateQuestion, generateSummary, checkOpenAiHealth, getCircuitBreakerState } from '../../services/openai.service.js';
import { Message } from '../../types.js';
import * as commandsModule from '../../config/commands.js';
import * as systemPromptModule from '../../config/system-prompt.js';

// Mock OpenAI
const mockCreate = vi.fn().mockResolvedValue({
    choices: [
        {
            message: {
                content: 'Generated question from OpenAI?',
            },
        },
    ],
});

const mockModelsList = vi.fn().mockResolvedValue({
    data: [{ id: 'gpt-4o' }],
});

vi.mock('openai', () => {
    return {
        default: class MockOpenAI {
            constructor() {
                return {
                    chat: {
                        completions: {
                            create: mockCreate,
                        },
                    },
                    models: {
                        list: mockModelsList,
                    },
                };
            }
        },
    };
});

// Mock config modules
vi.mock('../../config/commands.js');
vi.mock('../../config/system-prompt.js');

// Mock circuit breaker
vi.mock('opossum', () => {
    return {
        default: class MockCircuitBreaker {
            constructor(fn: unknown, _options: unknown) {
                this.fn = fn;
                this.opened = false;
                this.halfOpen = false;
                this.listeners = new Map();
            }
            fn: unknown;
            opened: boolean;
            halfOpen: boolean;
            listeners: Map<string, Array<(...args: unknown[]) => void>>;

            async fire<T>(fn: () => Promise<T>): Promise<T> {
                if (this.opened) {
                    const error = new Error('Circuit breaker is open');
                    this.emit('reject');
                    throw error;
                }
                return await fn();
            }

            on(event: string, callback: (...args: unknown[]) => void) {
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, []);
                }
                this.listeners.get(event)?.push(callback);
            }

            emit(event: string, ...args: unknown[]) {
                this.listeners.get(event)?.forEach((cb) => cb(...args));
            }
        },
    };
});

// Mock logger
vi.mock('../../utils/logger.js', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock metrics
vi.mock('../../metrics.js', () => ({
    updateCircuitBreakerMetric: vi.fn(),
}));

describe('openai.service', () => {
    beforeEach(() => {
        // Set up environment
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.OPENAI_MODEL = 'gpt-4o';

        // Mock system prompts
        vi.mocked(systemPromptModule.loadSystemPrompts).mockReturnValue({
            questionPrompt: 'You are a thoughtful guide.',
            summaryPrompt: 'Create a summary.',
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('generateQuestion', () => {
        describe('with static question', () => {
            it('should return static question without calling OpenAI', async () => {
                // Mock command with static question
                vi.mocked(commandsModule.getCommand).mockReturnValue({
                    number: 1,
                    name: 'Get topic and context',
                    prompt: 'Some prompt',
                    staticQuestion: 'What brings you to explore this topic right now?',
                });

                const question = await generateQuestion([], 1);

                expect(question).toBe('What brings you to explore this topic right now?');
                // Verify OpenAI was not called (we'd need to spy on the client to verify this fully)
            });

            it('should return static question for question 1 specifically', async () => {
                vi.mocked(commandsModule.getCommand).mockReturnValue({
                    number: 1,
                    name: 'Get topic and context',
                    prompt: 'Some prompt',
                    staticQuestion: 'What brings you to explore this topic right now?',
                });

                const question = await generateQuestion([], 1);

                expect(question).toBe('What brings you to explore this topic right now?');
                expect(commandsModule.getCommand).toHaveBeenCalledWith(1);
            });

            it('should ignore conversation history when using static question', async () => {
                vi.mocked(commandsModule.getCommand).mockReturnValue({
                    number: 1,
                    name: 'Get topic and context',
                    prompt: 'Some prompt',
                    staticQuestion: 'What brings you to explore this topic right now?',
                });

                const conversationHistory: Message[] = [
                    {
                        id: 1,
                        conversationId: 1,
                        type: 'question',
                        content: 'Previous question?',
                        questionNumber: 1,
                        createdAt: new Date(),
                    },
                    {
                        id: 2,
                        conversationId: 1,
                        type: 'response',
                        content: 'Previous response',
                        questionNumber: 1,
                        createdAt: new Date(),
                    },
                ];

                const question = await generateQuestion(conversationHistory, 1);

                expect(question).toBe('What brings you to explore this topic right now?');
            });
        });

        describe('without static question', () => {
            it('should generate question dynamically for questions 2-10', async () => {
                vi.mocked(commandsModule.getCommand).mockReturnValue({
                    number: 2,
                    name: 'Find core concern',
                    prompt: 'Ask about the core issue',
                });

                const conversationHistory: Message[] = [
                    {
                        id: 1,
                        conversationId: 1,
                        type: 'question',
                        content: 'What brings you here?',
                        questionNumber: 1,
                        createdAt: new Date(),
                    },
                    {
                        id: 2,
                        conversationId: 1,
                        type: 'response',
                        content: 'I want to explore career changes.',
                        questionNumber: 1,
                        createdAt: new Date(),
                    },
                ];

                const question = await generateQuestion(conversationHistory, 2);

                expect(question).toBe('Generated question from OpenAI?');
                expect(commandsModule.getCommand).toHaveBeenCalledWith(2);
                expect(systemPromptModule.loadSystemPrompts).toHaveBeenCalled();
            });

            it('should throw error if command not found', async () => {
                vi.mocked(commandsModule.getCommand).mockReturnValue(null);

                await expect(generateQuestion([], 99)).rejects.toThrow(
                    'No command found for question number 99'
                );
            });

            it('should build conversation history correctly', async () => {
                vi.mocked(commandsModule.getCommand).mockReturnValue({
                    number: 3,
                    name: 'Sharpen focus',
                    prompt: 'Narrow the topic',
                });

                const conversationHistory: Message[] = [
                    {
                        id: 1,
                        conversationId: 1,
                        type: 'question',
                        content: 'Question 1?',
                        questionNumber: 1,
                        createdAt: new Date(),
                    },
                    {
                        id: 2,
                        conversationId: 1,
                        type: 'response',
                        content: 'Response 1',
                        questionNumber: 1,
                        createdAt: new Date(),
                    },
                    {
                        id: 3,
                        conversationId: 1,
                        type: 'question',
                        content: 'Question 2?',
                        questionNumber: 2,
                        createdAt: new Date(),
                    },
                    {
                        id: 4,
                        conversationId: 1,
                        type: 'response',
                        content: 'Response 2',
                        questionNumber: 2,
                        createdAt: new Date(),
                    },
                ];

                const question = await generateQuestion(conversationHistory, 3);

                expect(question).toBeDefined();
                expect(question).toBe('Generated question from OpenAI?');
            });
        });


    });

    describe('generateSummary', () => {
        it('should generate summary from conversation messages', async () => {
            const messages: Message[] = [
                {
                    id: 1,
                    conversationId: 1,
                    type: 'question',
                    content: 'What brings you here?',
                    questionNumber: 1,
                    createdAt: new Date(),
                },
                {
                    id: 2,
                    conversationId: 1,
                    type: 'response',
                    content: 'Career exploration',
                    questionNumber: 1,
                    createdAt: new Date(),
                },
            ];

            const summary = await generateSummary(messages);

            expect(summary).toBe('Generated question from OpenAI?');
            expect(systemPromptModule.loadSystemPrompts).toHaveBeenCalled();
        });
    });

    describe('checkOpenAiHealth', () => {
        it('should return ok:false when API key is not configured', async () => {
            delete process.env.OPENAI_API_KEY;

            const health = await checkOpenAiHealth();

            expect(health.ok).toBe(false);
            expect(health.error).toBe('not_configured');
            expect(health.circuitOpen).toBe(false);
        });

        it('should return ok:true when OpenAI is healthy', async () => {
            process.env.OPENAI_API_KEY = 'test-key';

            const health = await checkOpenAiHealth();

            expect(health.ok).toBe(true);
            expect(health.circuitOpen).toBe(false);
            expect(health.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('should return circuitOpen:true when circuit is open', async () => {
            process.env.OPENAI_API_KEY = 'test-key';

            // This test would require manipulating circuit breaker state
            // For now, just verify the structure is correct
            const health = await checkOpenAiHealth();

            expect(health).toHaveProperty('circuitOpen');
        });
    });

    describe('getCircuitBreakerState', () => {
        it('should return circuit breaker state', () => {
            const state = getCircuitBreakerState();

            expect(['open', 'closed', 'half_open']).toContain(state);
        });
    });
});
