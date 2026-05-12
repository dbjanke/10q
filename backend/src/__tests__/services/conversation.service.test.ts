import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
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

let userCounter = 0;

function createTestUser(db: Database.Database): number {
    userCounter += 1;
    const result = db
        .prepare(
            "INSERT INTO users (email, name, role, status) VALUES (?, ?, 'user', 'active')"
        )
        .run(`test${userCounter}@example.com`, 'Test User');
    return Number(result.lastInsertRowid);
}

describe('conversation.service', () => {
    beforeEach(() => {
        mockDb = createTestDatabase();
    });

    afterEach(() => {
        if (mockDb) {
            closeTestDatabase(mockDb);
            mockDb = null as any;
        }
    });

    afterAll(() => {
        if (mockDb) {
            closeTestDatabase(mockDb);
            mockDb = null as any;
        }
        vi.resetModules();
    });

    describe('createConversation', () => {
        it('should create a new conversation with a title', () => {
            const userId = createTestUser(mockDb);
            const title = 'Test Conversation';
            const conversation = conversationService.createConversation(userId, title);

            expect(conversation).toBeDefined();
            expect(conversation.id).toBeGreaterThan(0);
            expect(conversation.title).toBe(title);
            expect(conversation.completed).toBe(false);
            expect(conversation.currentQuestionNumber).toBe(0);
            expect(conversation.summary).toBeUndefined();
        });

        it('should create multiple conversations with unique IDs', () => {
            const userId = createTestUser(mockDb);
            const conv1 = conversationService.createConversation(userId, 'First');
            const conv2 = conversationService.createConversation(userId, 'Second');

            expect(conv1.id).not.toBe(conv2.id);
            expect(conv1.title).toBe('First');
            expect(conv2.title).toBe('Second');
        });
    });

    describe('getAllConversations', () => {
        it('should return empty array when no conversations exist', () => {
            const userId = createTestUser(mockDb);
            const conversations = conversationService.getAllConversations(userId);
            expect(conversations).toEqual([]);
        });

        it('should return all conversations', () => {
            const userId = createTestUser(mockDb);
            conversationService.createConversation(userId, 'First');
            conversationService.createConversation(userId, 'Second');
            conversationService.createConversation(userId, 'Third');

            const conversations = conversationService.getAllConversations(userId);

            expect(conversations).toHaveLength(3);
            const titles = conversations.map(c => c.title);
            expect(titles).toContain('First');
            expect(titles).toContain('Second');
            expect(titles).toContain('Third');
        });
    });

    describe('getConversationById', () => {
        it('should return conversation with messages', () => {
            const userId = createTestUser(mockDb);
            const created = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(created.id, 'question', 'What is this?', 1);
            conversationService.saveMessage(created.id, 'response', 'An answer', 1);

            const conversation = conversationService.getConversationById(userId, created.id);

            expect(conversation).toBeDefined();
            expect(conversation?.id).toBe(created.id);
            expect(conversation?.messages).toHaveLength(2);
            expect(conversation?.messages[0].type).toBe('question');
            expect(conversation?.messages[1].type).toBe('response');
        });

        it('should return null for non-existent conversation', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.getConversationById(userId, 999);
            expect(conversation).toBeNull();
        });
    });

    describe('deleteConversation', () => {
        it('should delete conversation and return true', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'To Delete');
            const deleted = conversationService.deleteConversation(userId, conversation.id);

            expect(deleted).toBe(true);

            const found = conversationService.getConversationById(userId, conversation.id);
            expect(found).toBeNull();
        });

        it('should cascade delete associated messages', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Question?', 1);
            conversationService.saveMessage(conversation.id, 'response', 'Response', 1);

            conversationService.deleteConversation(userId, conversation.id);

            // Verify messages were deleted
            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(0);
        });

        it('should return false for non-existent conversation', () => {
            const userId = createTestUser(mockDb);
            const deleted = conversationService.deleteConversation(userId, 999);
            expect(deleted).toBe(false);
        });
    });

    describe('saveMessage', () => {
        it('should save a question message', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
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
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
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
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            const message = conversationService.saveMessage(
                conversation.id,
                'summary',
                'This is a summary'
            );

            expect(message.type).toBe('summary');
            expect(message.questionNumber).toBeUndefined();
        });

        it('should save a highlight message without question number', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            const message = conversationService.saveMessage(
                conversation.id,
                'insight',
                'Latest insights'
            );

            expect(message.type).toBe('insight');
            expect(message.questionNumber).toBeUndefined();
        });

        it('should save a conversation_context message and retrieve it', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            const content = '## CONTEXT\n\nThis is article context.';
            const message = conversationService.saveMessage(
                conversation.id,
                'conversation_context',
                content
            );

            expect(message.type).toBe('conversation_context');
            expect(message.content).toBe(content);
            expect(message.questionNumber).toBeUndefined();

            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(1);
            expect(messages[0].type).toBe('conversation_context');
        });
    });

    describe('updateConversationProgress', () => {
        it('should update question number', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.updateConversationProgress(conversation.id, 5);

            const updated = conversationService.getConversationById(userId, conversation.id);
            expect(updated?.currentQuestionNumber).toBe(5);
            expect(updated?.completed).toBe(false);
        });

        it('should mark conversation as completed', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.updateConversationProgress(conversation.id, 10, true);

            const updated = conversationService.getConversationById(userId, conversation.id);
            expect(updated?.currentQuestionNumber).toBe(10);
            expect(updated?.completed).toBe(true);
        });
    });

    describe('updateConversationSummary', () => {
        it('should update summary and mark as completed', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            const summary = 'This is a summary of the conversation';

            conversationService.updateConversationSummary(conversation.id, summary);

            const updated = conversationService.getConversationById(userId, conversation.id);
            expect(updated?.summary).toBe(summary);
            expect(updated?.completed).toBe(true);
        });
    });

    describe('updateConversationTitle', () => {
        it('should update the conversation title', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Original Title');

            conversationService.updateConversationTitle(conversation.id, 'Updated Title');

            const updated = conversationService.getConversationById(userId, conversation.id);
            expect(updated?.title).toBe('Updated Title');
        });

        it('should not affect other conversation fields when updating title', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Original');
            conversationService.updateConversationProgress(conversation.id, 5);

            conversationService.updateConversationTitle(conversation.id, 'Renamed');

            const updated = conversationService.getConversationById(userId, conversation.id);
            expect(updated?.title).toBe('Renamed');
            expect(updated?.currentQuestionNumber).toBe(5);
            expect(updated?.completed).toBe(false);
        });
    });

    describe('getConversationMessages', () => {
        it('should return all messages for a conversation', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Q1?', 1);
            conversationService.saveMessage(conversation.id, 'response', 'A1', 1);
            conversationService.saveMessage(conversation.id, 'insight', 'Some insight');

            const messages = conversationService.getConversationMessages(conversation.id);

            expect(messages).toHaveLength(3);
            expect(messages.map(m => m.type)).toEqual(['question', 'response', 'insight']);
        });

        it('should return empty array for conversation with no messages', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');

            const messages = conversationService.getConversationMessages(conversation.id);

            expect(messages).toEqual([]);
        });

        it('should only return messages for the given conversation', () => {
            const userId = createTestUser(mockDb);
            const conv1 = conversationService.createConversation(userId, 'Conv 1');
            const conv2 = conversationService.createConversation(userId, 'Conv 2');
            conversationService.saveMessage(conv1.id, 'question', 'Q for conv1', 1);
            conversationService.saveMessage(conv2.id, 'question', 'Q for conv2', 1);

            const messages = conversationService.getConversationMessages(conv1.id);

            expect(messages).toHaveLength(1);
            expect(messages[0].content).toBe('Q for conv1');
        });
    });

    describe('deleteConversationMessagesByType', () => {
        it('should delete only messages of the specified type', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Q1?', 1);
            conversationService.saveMessage(conversation.id, 'response', 'A1', 1);
            conversationService.saveMessage(conversation.id, 'insight', 'Insight 1');
            conversationService.saveMessage(conversation.id, 'insight', 'Insight 2');

            conversationService.deleteConversationMessagesByType(conversation.id, 'insight');

            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(2);
            expect(messages.every(m => m.type !== 'insight')).toBe(true);
        });

        it('should leave conversation intact when deleting a type with no messages', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Q1?', 1);

            conversationService.deleteConversationMessagesByType(conversation.id, 'summary');

            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(1);
        });

        it('should replace old insights when saving new ones', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'insight', 'Old insight');

            conversationService.deleteConversationMessagesByType(conversation.id, 'insight');
            conversationService.saveMessage(conversation.id, 'insight', 'New insight');

            const messages = conversationService.getConversationMessages(conversation.id);
            const insights = messages.filter(m => m.type === 'insight');
            expect(insights).toHaveLength(1);
            expect(insights[0].content).toBe('New insight');
        });
    });

    describe('deleteQuestionMessage', () => {
        it('should delete the question for the given question number', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Q1?', 1);
            conversationService.saveMessage(conversation.id, 'question', 'Q2?', 2);

            conversationService.deleteQuestionMessage(conversation.id, 1);

            const messages = conversationService.getConversationMessages(conversation.id);
            const questions = messages.filter(m => m.type === 'question');
            expect(questions).toHaveLength(1);
            expect(questions[0].questionNumber).toBe(2);
        });

        it('should not delete the response for the same question number', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Q1?', 1);
            conversationService.saveMessage(conversation.id, 'response', 'A1', 1);

            conversationService.deleteQuestionMessage(conversation.id, 1);

            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(1);
            expect(messages[0].type).toBe('response');
        });

        it('should be a no-op when question number does not exist', () => {
            const userId = createTestUser(mockDb);
            const conversation = conversationService.createConversation(userId, 'Test');
            conversationService.saveMessage(conversation.id, 'question', 'Q1?', 1);

            conversationService.deleteQuestionMessage(conversation.id, 5);

            const messages = conversationService.getConversationMessages(conversation.id);
            expect(messages).toHaveLength(1);
        });
    });
});
