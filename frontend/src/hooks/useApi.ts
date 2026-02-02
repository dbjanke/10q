import {
  Conversation,
  ConversationWithMessages,
  CreateConversationResponse,
  ResponseSubmissionResult,
} from '../types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export async function createConversation(title: string): Promise<CreateConversationResponse> {
  return fetchApi<CreateConversationResponse>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function getAllConversations(): Promise<Conversation[]> {
  return fetchApi<Conversation[]>('/conversations');
}

export async function getConversation(id: number): Promise<ConversationWithMessages> {
  return fetchApi<ConversationWithMessages>(`/conversations/${id}`);
}

export async function deleteConversation(id: number): Promise<void> {
  return fetchApi<void>(`/conversations/${id}`, {
    method: 'DELETE',
  });
}

export async function submitResponse(
  conversationId: number,
  response: string
): Promise<ResponseSubmissionResult> {
  return fetchApi<ResponseSubmissionResult>(`/conversations/${conversationId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
}

export function getExportUrl(conversationId: number): string {
  return `${API_BASE}/conversations/${conversationId}/export`;
}
