import { getDatabase } from '../../config/database.js';
import { Conversation, ConversationWithMessages, Message } from '../../types.js';
import { ConversationStore } from '../conversation.store.js';

export class SQLiteConversationStore implements ConversationStore {
    createConversation(title: string): Conversation {
        const db = getDatabase();

        const result = db
            .prepare('INSERT INTO conversations (title, current_question_number) VALUES (?, 0)')
            .run(title);

        const conversation = db
            .prepare('SELECT * FROM conversations WHERE id = ?')
            .get(result.lastInsertRowid) as any;

        return mapConversation(conversation);
    }

    getAllConversations(): Conversation[] {
        const db = getDatabase();

        const rows = db
            .prepare('SELECT * FROM conversations ORDER BY created_at DESC')
            .all() as any[];

        return rows.map(mapConversation);
    }

    getConversationById(id: number): ConversationWithMessages | null {
        const db = getDatabase();

        const conversation = db
            .prepare('SELECT * FROM conversations WHERE id = ?')
            .get(id) as any;

        if (!conversation) {
            return null;
        }

        const messages = db
            .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
            .all(id) as any[];

        return {
            ...mapConversation(conversation),
            messages: messages.map(mapMessage),
        };
    }

    deleteConversation(id: number): boolean {
        const db = getDatabase();

        const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id);

        return result.changes > 0;
    }

    saveMessage(
        conversationId: number,
        type: 'question' | 'response' | 'summary',
        content: string,
        questionNumber?: number
    ): Message {
        const db = getDatabase();

        const result = db
            .prepare(
                'INSERT INTO messages (conversation_id, type, content, question_number) VALUES (?, ?, ?, ?)'
            )
            .run(conversationId, type, content, questionNumber || null);

        const message = db
            .prepare('SELECT * FROM messages WHERE id = ?')
            .get(result.lastInsertRowid) as any;

        return mapMessage(message);
    }

    updateConversationProgress(
        conversationId: number,
        questionNumber: number,
        completed: boolean = false
    ): void {
        const db = getDatabase();

        db.prepare(
            'UPDATE conversations SET current_question_number = ?, completed = ? WHERE id = ?'
        ).run(questionNumber, completed ? 1 : 0, conversationId);
    }

    updateConversationSummary(conversationId: number, summary: string): void {
        const db = getDatabase();

        db.prepare('UPDATE conversations SET summary = ?, completed = 1 WHERE id = ?').run(
            summary,
            conversationId
        );
    }

    getConversationMessages(conversationId: number): Message[] {
        const db = getDatabase();

        const messages = db
            .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
            .all(conversationId) as any[];

        return messages.map(mapMessage);
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
