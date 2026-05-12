export interface Conversation {
  id: number;
  title: string;
  summary?: string;
  createdAt: string;
  completed: boolean;
  currentQuestionNumber: number;
}

export interface Message {
  id: number;
  conversationId: number;
  type: 'question' | 'response' | 'summary' | 'insight' | 'conversation_context';
  content: string;
  questionNumber?: number;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export type Permission = 'regenerate_summary_question' | 'regenerate_insights';

export interface Group {
  id: number;
  name: string;
  permissions: Permission[];
  memberIds?: number[];
}

export interface User {
  id: number;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  status: 'invited' | 'active' | 'disabled';
  groups?: string[];
  permissions?: Permission[];
  groupIds?: number[];
}

export interface CreateConversationResponse {
  conversation: Conversation;
}

export interface SubmitResponseRequest {
  response: string;
  selectedQuestion: string;
}

export interface ResponseSubmissionResult {
  savedResponse: Message;
  summary?: string;
  isComplete: boolean;
}
