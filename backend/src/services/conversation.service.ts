import { Conversation, Message, ConversationWithMessages } from '../types.js';
import { getConversationStore } from '../stores/conversation.store.js';

export function createConversation(userId: number, title: string): Conversation {
  return getConversationStore().createConversation(userId, title);
}

export function getAllConversations(userId: number): Conversation[] {
  return getConversationStore().getAllConversations(userId);
}

export function getConversationById(userId: number, id: number): ConversationWithMessages | null {
  return getConversationStore().getConversationById(userId, id);
}

export function deleteConversation(userId: number, id: number): boolean {
  return getConversationStore().deleteConversation(userId, id);
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

export function deleteConversationMessagesByType(
  conversationId: number,
  type: 'question' | 'response' | 'summary'
): void {
  getConversationStore().deleteConversationMessagesByType(conversationId, type);
}

export function deleteQuestionMessage(conversationId: number, questionNumber: number): void {
  getConversationStore().deleteQuestionMessage(conversationId, questionNumber);
}
