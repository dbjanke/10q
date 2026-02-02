import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDatabase, closeTestDatabase } from '../fixtures/testDatabase.js';

// Mock the database module
let mockDb: Database.Database;

vi.mock('../../config/database.js', () => ({
    getDatabase: () => {
        if (!mockDb) {
            throw new Error('Database not initialized');
        }
        return mockDb;
    },
    initializeDatabase: () => {
        mockDb = createTestDatabase();
        return mockDb;
    },
    closeDatabase: () => {
        if (mockDb) {
            mockDb.close();
            mockDb = null as any;
        }
    },
}));

// Import after mocking
const conversationService = await import('../../services/conversation.service.js');

describe('conversation.service', () => {
    beforeEach(() => {
        mockDb = createTestDatabase();
    });

    afterEach(() => {
        if (mockDb) {
            closeTestDatabase(mockDb);
        }
    });

    describe('createConversation', () => {
        it('should create a new conversation with a title', () => {
            const title = 'Test Conversation';
            const conversation = conversationService.createConversation(title);

            expect(conversation).toBeDefined();
            expect(conversation.id).toBeGreaterThan(0);
            expect(conversation.title).toBe(title);
            expect(conversation.completed).toBe(false);
            expect(conversation.currentQuestionNumber).toBe(0);
            expect(conversation.summary).toBeUndefined();
        });

        it('should create multiple conversations with unique IDs', () => {
            const conv1 = conversationService.createConversation('First');
            const conv2 = conversationService.createConversation('Second');

            expect(conv1.id).not.toBe(conv2.id);
            expect(conv1.title).toBe('First');
            expect(conv2.title).toBe('Second');
        });
    });

    describe('getAllConversations', () => {
        it('should return empty array when no conversations exist', () => {
            const conversations = conversationService.getAllConversations();
            expect(conversations).toEqual([]);
        });

        it('should return all conversations', () => {
            conversationService.createConversation('First');
            conversationService.createConversation('Second');
            conversationService.createConversation('Third');

            const conversations = conversationService.getAllConversations();

            expect(conversations).toHaveLength(3);
            const titles = conversations.map(c => c.title);
            expect(titles).toContain('First');
            expect(titles).toContain('Second');
            expect(titles).toContain('Third');
        });
    });

    describe('getConversationById', () => {
        it('should return conversation with messages', () => {
            const created = conversationService.createConversation('Test');
            conversationService.saveMessage(created.id, 'question', 'What is this?', 1);
            conversationService.saveMessage(created.id, 'response', 'An answer', 1);

            const conversation = conversationService.getConversationById(created.id);

            expect(conversation).toBeDefined();
            expect(conversation?.id).toBe(created.id);
            expect(conversation?.messages).toHaveLength(2);
            expect(conversation?.messages[0].type).toBe('question');
            expect(conversation?.messages[1].type).toBe('response');
        });

        it('should return null for non-existent conversation', () => {
            const conversation = conversationService.getConversationById(999);
            expect(conversation).toBeNull();
        });
    });

    describe('deleteConversation', () => {
        it('should delete conversation and return true', () => {
            const conversation = conversationService.createConversation('To Delete');
            const deleted = conversationService.deleteConversation(conversation.id);

            expect(deleted).toBe(true);

            const found = conversationService.getConversationById(conversation.id);
            expect(found).toBeNull();
        });

        it('should cascade delete associated messages', () => {
            const conversation = conversationService.createConversation('Test');
            conversationService.saveMessage(conversation.id, 'question', 'Question?', 1);
            conversationService.saveMessage(conversation.id, 'response', 'Response', 1);

            conversationService.deleteConversation(conversation.id);

            // Verify messages were deleted
            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(0);
        });

        it('should return false for non-existent conversation', () => {
            const deleted = conversationService.deleteConversation(999);
            expect(deleted).toBe(false);
        });
    });

    describe('saveMessage', () => {
        it('should save a question message', () => {
            const conversation = conversationService.createConversation('Test');
            const message = conversationService.saveMessage(
                conversation.id,
                'question',
                'What is your question?',
                1
            );

            expect(message).toBeDefined();
            expect(message.id).toBeGreaterThan(0);
            expect(message.conversationId).toBe(conversation.id);
            expect(message.type).toBe('question');
            expect(message.content).toBe('What is your question?');
            expect(message.questionNumber).toBe(1);
        });

        it('should save a response message', () => {
            const conversation = conversationService.createConversation('Test');
            const message = conversationService.saveMessage(
                conversation.id,
                'response',
                'My response',
                1
            );

            expect(message.type).toBe('response');
            expect(message.content).toBe('My response');
        });

        it('should save a summary message without question number', () => {
            const conversation = conversationService.createConversation('Test');
            const message = conversationService.saveMessage(
                conversation.id,
                'summary',
                'This is a summary'
            );

            expect(message.type).toBe('summary');
            expect(message.questionNumber).toBeUndefined();
        });
    });

    describe('updateConversationProgress', () => {
        it('should update question number', () => {
            const conversation = conversationService.createConversation('Test');
            conversationService.updateConversationProgress(conversation.id, 5);

            const updated = conversationService.getConversationById(conversation.id);
            expect(updated?.currentQuestionNumber).toBe(5);
            expect(updated?.completed).toBe(false);
        });

        it('should mark conversation as completed', () => {
            const conversation = conversationService.createConversation('Test');
            conversationService.updateConversationProgress(conversation.id, 10, true);

            const updated = conversationService.getConversationById(conversation.id);
            expect(updated?.currentQuestionNumber).toBe(10);
            expect(updated?.completed).toBe(true);
        });
    });

    describe('updateConversationSummary', () => {
        it('should update summary and mark as completed', () => {
            const conversation = conversationService.createConversation('Test');
            const summary = 'This is a summary of the conversation';

            conversationService.updateConversationSummary(conversation.id, summary);

            const updated = conversationService.getConversationById(conversation.id);
            expect(updated?.summary).toBe(summary);
            expect(updated?.completed).toBe(true);
        });
    });
});
