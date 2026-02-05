import { Conversation, Message, ConversationWithMessages } from '../types.js';
import { getConversationStore } from '../stores/conversation.store.js';

export function createConversation(title: string): Conversation {
  return getConversationStore().createConversation(title);
}

export function getAllConversations(): Conversation[] {
  return getConversationStore().getAllConversations();
}

export function getConversationById(id: number): ConversationWithMessages | null {
  return getConversationStore().getConversationById(id);
}

export function deleteConversation(id: number): boolean {
  return getConversationStore().deleteConversation(id);
}

export function saveMessage(
  conversationId: number,
  type: 'question' | 'response' | 'summary',
  content: string,
  questionNumber?: number
): Message {
  return getConversationStore().saveMessage(conversationId, type, content, questionNumber);
}

export function updateConversationProgress(
  conversationId: number,
  questionNumber: number,
  completed: boolean = false
): void {
  getConversationStore().updateConversationProgress(conversationId, questionNumber, completed);
}

export function updateConversationSummary(conversationId: number, summary: string): void {
  getConversationStore().updateConversationSummary(conversationId, summary);
}

export function getConversationMessages(conversationId: number): Message[] {
  return getConversationStore().getConversationMessages(conversationId);
}
