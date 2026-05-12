import { describe, it, expect } from 'vitest';
import { exportToMarkdown } from '../../services/export.service.js';
import { ConversationWithMessages } from '../../types.js';

function makeConversation(overrides: Partial<ConversationWithMessages> = {}): ConversationWithMessages {
    return {
        id: 1,
        title: 'Test Conversation',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        completed: false,
        currentQuestionNumber: 0,
        messages: [],
        ...overrides,
    };
}

describe('export.service', () => {
    describe('exportToMarkdown', () => {
        it('should include the conversation title as an h1', () => {
            const conversation = makeConversation({ title: 'My Reflection' });
            const result = exportToMarkdown(conversation);
            expect(result).toContain('# My Reflection');
        });

        it('should include the created date', () => {
            const conversation = makeConversation();
            const result = exportToMarkdown(conversation);
            expect(result).toContain('**Created:**');
        });

        it('should show "In Progress" status when not completed', () => {
            const conversation = makeConversation({ completed: false });
            const result = exportToMarkdown(conversation);
            expect(result).toContain('**Status:** In Progress');
        });

        it('should show "Completed" status when completed', () => {
            const conversation = makeConversation({ completed: true });
            const result = exportToMarkdown(conversation);
            expect(result).toContain('**Status:** Completed');
        });

        it('should output question and response content', () => {
            const conversation = makeConversation({
                messages: [
                    {
                        id: 1, conversationId: 1, type: 'question',
                        content: 'What brings you here?', questionNumber: 1, createdAt: new Date(),
                    },
                    {
                        id: 2, conversationId: 1, type: 'response',
                        content: 'Career exploration', questionNumber: 1, createdAt: new Date(),
                    },
                ],
            });
            const result = exportToMarkdown(conversation);
            expect(result).toContain('## Question 1');
            expect(result).toContain('What brings you here?');
            expect(result).toContain('### Response');
            expect(result).toContain('Career exploration');
        });

        it('should output questions in numeric order regardless of message order', () => {
            const conversation = makeConversation({
                messages: [
                    {
                        id: 3, conversationId: 1, type: 'question',
                        content: 'Q3 text', questionNumber: 3, createdAt: new Date(),
                    },
                    {
                        id: 1, conversationId: 1, type: 'question',
                        content: 'Q1 text', questionNumber: 1, createdAt: new Date(),
                    },
                    {
                        id: 2, conversationId: 1, type: 'question',
                        content: 'Q2 text', questionNumber: 2, createdAt: new Date(),
                    },
                ],
            });
            const result = exportToMarkdown(conversation);
            const q1Pos = result.indexOf('## Question 1');
            const q2Pos = result.indexOf('## Question 2');
            const q3Pos = result.indexOf('## Question 3');
            expect(q1Pos).toBeLessThan(q2Pos);
            expect(q2Pos).toBeLessThan(q3Pos);
        });

        it('should omit the Response section when a question has no response', () => {
            const conversation = makeConversation({
                messages: [
                    {
                        id: 1, conversationId: 1, type: 'question',
                        content: 'What is your goal?', questionNumber: 1, createdAt: new Date(),
                    },
                ],
            });
            const result = exportToMarkdown(conversation);
            expect(result).toContain('## Question 1');
            expect(result).not.toContain('### Response');
        });

        it('should skip messages with question numbers outside the 1–10 range', () => {
            const conversation = makeConversation({
                messages: [
                    {
                        id: 1, conversationId: 1, type: 'question',
                        content: 'Should be ignored', questionNumber: 0, createdAt: new Date(),
                    },
                    {
                        id: 2, conversationId: 1, type: 'question',
                        content: 'Also ignored', questionNumber: 11, createdAt: new Date(),
                    },
                ],
            });
            const result = exportToMarkdown(conversation);
            expect(result).not.toContain('## Question');
            expect(result).not.toContain('Should be ignored');
            expect(result).not.toContain('Also ignored');
        });

        it('should not include a summary section when summary is absent', () => {
            const conversation = makeConversation({ summary: undefined });
            const result = exportToMarkdown(conversation);
            expect(result).not.toContain('## Summary');
        });

        it('should include the summary section when summary is present', () => {
            const conversation = makeConversation({ summary: 'You value long-term growth.' });
            const result = exportToMarkdown(conversation);
            expect(result).toContain('## Summary');
            expect(result).toContain('You value long-term growth.');
        });

        it('should place the summary after all questions', () => {
            const conversation = makeConversation({
                completed: true,
                summary: 'Final summary text',
                messages: [
                    {
                        id: 1, conversationId: 1, type: 'question',
                        content: 'Q1?', questionNumber: 1, createdAt: new Date(),
                    },
                ],
            });
            const result = exportToMarkdown(conversation);
            const q1Pos = result.indexOf('## Question 1');
            const summaryPos = result.indexOf('## Summary');
            expect(q1Pos).toBeLessThan(summaryPos);
        });

        it('should produce valid markdown for a complete 10-question conversation', () => {
            const messages = [];
            for (let i = 1; i <= 10; i++) {
                messages.push({
                    id: i * 2 - 1, conversationId: 1, type: 'question' as const,
                    content: `Question ${i}?`, questionNumber: i, createdAt: new Date(),
                });
                messages.push({
                    id: i * 2, conversationId: 1, type: 'response' as const,
                    content: `Response ${i}`, questionNumber: i, createdAt: new Date(),
                });
            }
            const conversation = makeConversation({
                completed: true,
                summary: 'Comprehensive summary.',
                messages,
            });
            const result = exportToMarkdown(conversation);
            for (let i = 1; i <= 10; i++) {
                expect(result).toContain(`## Question ${i}`);
                expect(result).toContain(`Question ${i}?`);
                expect(result).toContain(`Response ${i}`);
            }
            expect(result).toContain('## Summary');
        });

        it('should ignore highlight and summary message types (not output them as questions)', () => {
            const conversation = makeConversation({
                messages: [
                    {
                        id: 1, conversationId: 1, type: 'highlight',
                        content: 'Key insight', createdAt: new Date(),
                    },
                    {
                        id: 2, conversationId: 1, type: 'summary',
                        content: 'Saved summary', createdAt: new Date(),
                    },
                ],
            });
            const result = exportToMarkdown(conversation);
            expect(result).not.toContain('## Question');
            expect(result).not.toContain('Key insight');
        });
    });
});
