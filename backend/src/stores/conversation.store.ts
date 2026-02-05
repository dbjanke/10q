import { Conversation, ConversationWithMessages, Message } from '../types.js';
import { SQLiteConversationStore } from './sqlite/conversation.store.js';

export interface ConversationStore {
    createConversation(title: string): Conversation;
    getAllConversations(): Conversation[];
    getConversationById(id: number): ConversationWithMessages | null;
    deleteConversation(id: number): boolean;
    saveMessage(
        conversationId: number,
        type: 'question' | 'response' | 'summary',
        content: string,
        questionNumber?: number
    ): Message;
    updateConversationProgress(
        conversationId: number,
        questionNumber: number,
        completed?: boolean
    ): void;
    updateConversationSummary(conversationId: number, summary: string): void;
    getConversationMessages(conversationId: number): Message[];
    checkHealth(): void;
}

let store: ConversationStore | null = null;

export function getConversationStore(): ConversationStore {
    if (store) {
        return store;
    }

    const backend = process.env.DATA_STORE || 'sqlite';

    switch (backend) {
        case 'sqlite':
        default:
            store = new SQLiteConversationStore();
            return store;
    }
}
