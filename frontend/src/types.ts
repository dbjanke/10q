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
  type: 'question' | 'response' | 'summary';
  content: string;
  questionNumber?: number;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export type Permission = 'prompt_tools';

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
  firstQuestion: Message;
}

export interface ResponseSubmissionResult {
  savedResponse: Message;
  nextQuestion?: Message;
  summary?: string;
  isComplete: boolean;
}
