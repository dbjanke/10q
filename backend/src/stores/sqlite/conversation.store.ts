import { performance } from 'perf_hooks';
import { getDatabase } from '../../config/database.js';
import { Conversation, ConversationWithMessages, Message } from '../../types.js';
import { ConversationStore } from '../conversation.store.js';
import { logger } from '../../utils/logger.js';

const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS || 200);

function withTiming<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const durationMs = performance.now() - start;

    if (durationMs >= SLOW_QUERY_MS) {
        logger.warn({ label, durationMs }, 'Slow query');
    }

    return result;
}

export class SQLiteConversationStore implements ConversationStore {
    createConversation(userId: number, title: string): Conversation {
        const db = getDatabase();

        const result = withTiming('conversations.insert', () =>
            db
                .prepare(
                    'INSERT INTO conversations (user_id, title, current_question_number) VALUES (?, ?, 0)'
                )
                .run(userId, title)
        );

        const conversation = withTiming('conversations.getById', () =>
            db
                .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
                .get(result.lastInsertRowid, userId) as any
        );

        return mapConversation(conversation);
    }

    getAllConversations(userId: number): Conversation[] {
        const db = getDatabase();

        const rows = withTiming('conversations.getAll', () =>
            db
                .prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC')
                .all(userId) as any[]
        );

        return rows.map(mapConversation);
    }

    getConversationById(userId: number, id: number): ConversationWithMessages | null {
        const db = getDatabase();

        const conversation = withTiming('conversations.getById', () =>
            db
                .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
                .get(id, userId) as any
        );

        if (!conversation) {
            return null;
        }

        const messages = withTiming('messages.getByConversation', () =>
            db
                .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
                .all(id) as any[]
        );

        return {
            ...mapConversation(conversation),
            messages: messages.map(mapMessage),
        };
    }

    deleteConversation(userId: number, id: number): boolean {
        const db = getDatabase();

        const result = withTiming('conversations.delete', () =>
            db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId)
        );

        return result.changes > 0;
    }

    saveMessage(
        conversationId: number,
        type: 'question' | 'response' | 'summary',
        content: string,
        questionNumber?: number
    ): Message {
        const db = getDatabase();

        const result = withTiming('messages.insert', () =>
            db
                .prepare(
                    'INSERT INTO messages (conversation_id, type, content, question_number) VALUES (?, ?, ?, ?)'
                )
                .run(conversationId, type, content, questionNumber || null)
        );

        const message = withTiming('messages.getById', () =>
            db
                .prepare('SELECT * FROM messages WHERE id = ?')
                .get(result.lastInsertRowid) as any
        );

        return mapMessage(message);
    }

    updateConversationProgress(
        conversationId: number,
        questionNumber: number,
        completed: boolean = false
    ): void {
        const db = getDatabase();

        withTiming('conversations.updateProgress', () =>
            db.prepare(
                'UPDATE conversations SET current_question_number = ?, completed = ? WHERE id = ?'
            ).run(questionNumber, completed ? 1 : 0, conversationId)
        );
    }

    updateConversationSummary(conversationId: number, summary: string): void {
        const db = getDatabase();

        withTiming('conversations.updateSummary', () =>
            db.prepare('UPDATE conversations SET summary = ?, completed = 1 WHERE id = ?').run(
                summary,
                conversationId
            )
        );
    }

    getConversationMessages(conversationId: number): Message[] {
        const db = getDatabase();

        const messages = withTiming('messages.getByConversation', () =>
            db
                .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
                .all(conversationId) as any[]
        );

        return messages.map(mapMessage);
    }

    deleteConversationMessagesByType(
        conversationId: number,
        type: 'question' | 'response' | 'summary'
    ): void {
        const db = getDatabase();

        withTiming('messages.deleteByType', () =>
            db
                .prepare('DELETE FROM messages WHERE conversation_id = ? AND type = ?')
                .run(conversationId, type)
        );
    }

    deleteQuestionMessage(conversationId: number, questionNumber: number): void {
        const db = getDatabase();

        withTiming('messages.deleteQuestion', () =>
            db
                .prepare(
                    "DELETE FROM messages WHERE conversation_id = ? AND type = 'question' AND question_number = ?"
                )
                .run(conversationId, questionNumber)
        );
    }

    checkHealth(): void {
        const db = getDatabase();
        withTiming('healthcheck', () => db.prepare('SELECT 1').get());
    }
}

function mapConversation(row: any): Conversation {
    return {
        id: row.id,
        title: row.title,
        summary: row.summary || undefined,
        createdAt: new Date(row.created_at),
        completed: Boolean(row.completed),
        currentQuestionNumber: row.current_question_number,
    };
}

function mapMessage(row: any): Message {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        type: row.type,
        content: row.content,
        questionNumber: row.question_number || undefined,
        createdAt: new Date(row.created_at),
    };
}
