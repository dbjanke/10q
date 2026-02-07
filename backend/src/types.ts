export interface Conversation {
  id: number;
  title: string;
  summary?: string;
  createdAt: Date;
  completed: boolean;
  currentQuestionNumber: number;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  status: 'invited' | 'active' | 'disabled';
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  type: 'question' | 'response' | 'summary';
  content: string;
  questionNumber?: number;
  createdAt: Date;
}

export interface Command {
  number: number;
  name: string;
  prompt: string;
  staticQuestion?: string;
}

export interface SystemPrompts {
  questionPrompt: string;
  summaryPrompt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationRequest {
  title: string;
}

export interface SubmitResponseRequest {
  response: string;
}

export interface QuestionResponse {
  question: Message;
  questionNumber: number;
  isComplete: boolean;
}

export interface ResponseSubmissionResult {
  savedResponse: Message;
  nextQuestion?: Message;
  summary?: string;
  isComplete: boolean;
}
