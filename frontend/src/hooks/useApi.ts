import {
  Conversation,
  ConversationWithMessages,
  CreateConversationResponse,
  ResponseSubmissionResult,
  Group,
  Permission,
  User,
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
    credentials: 'include',
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

export async function getCurrentUser(): Promise<User> {
  const response = await fetchApi<{ user: User }>('/auth/me');
  return response.user;
}

export async function logout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST' });
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

export async function getUsers(): Promise<User[]> {
  return fetchApi<User[]>('/admin/users');
}

export async function inviteUser(email: string, role: 'admin' | 'user' = 'user'): Promise<User> {
  return fetchApi<User>('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function updateUser(
  id: number,
  updates: Partial<Pick<User, 'role' | 'status' | 'groupIds'>>
): Promise<User> {
  return fetchApi<User>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await fetchApi(`/admin/users/${id}`, { method: 'DELETE' });
}

export async function getPermissions(): Promise<Permission[]> {
  const response = await fetchApi<{ permissions: Permission[] }>('/admin/permissions');
  return response.permissions;
}

export async function getGroups(): Promise<Group[]> {
  return fetchApi<Group[]>('/admin/groups');
}

export async function createGroup(name: string): Promise<Group> {
  return fetchApi<Group>('/admin/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateGroup(
  id: number,
  updates: Partial<Pick<Group, 'name' | 'permissions'>>
): Promise<Group> {
  return fetchApi<Group>(`/admin/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteGroup(id: number): Promise<void> {
  await fetchApi(`/admin/groups/${id}`, { method: 'DELETE' });
}
