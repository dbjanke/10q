import {
  Conversation,
  ConversationWithMessages,
  CreateConversationResponse,
  ResponseSubmissionResult,
  SubmitResponseRequest,
  Message,
  Group,
  Permission,
  User,
} from '../types';

const API_BASE = '/api';

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/auth/csrf`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as { csrfToken: string };
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

function isMutatingMethod(method?: string): boolean {
  if (!method) {
    return false;
  }
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method ?? 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (isMutatingMethod(method)) {
    const token = await fetchCsrfToken();
    headers['X-CSRF-Token'] = token;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    credentials: 'include',
    ...options,
    method,
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

export function resetCsrfTokenForTests(): void {
  csrfToken = null;
  csrfPromise = null;
}

export async function logout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST' });
}

export async function uploadArticle(file: File): Promise<{ keyInsights: string; summary: string; truncated: boolean }> {
  const token = await fetchCsrfToken();
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch(`${API_BASE}/articles`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': token },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function createConversation(
  title: string,
  context?: { contextSummary: string; contextKeyInsights: string }
): Promise<CreateConversationResponse> {
  return fetchApi<CreateConversationResponse>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, ...context }),
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

export async function updateConversationTitle(id: number, title: string): Promise<{ title: string }> {
  return fetchApi<{ title: string }>(`/conversations/${id}/title`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function regenerateSummary(conversationId: number): Promise<{ summary: string }> {
  return fetchApi<{ summary: string }>(`/conversations/${conversationId}/regenerate-summary`, {
    method: 'POST',
  });
}

export async function regenerateQuestion(conversationId: number): Promise<void> {
  await fetchApi<void>(`/conversations/${conversationId}/regenerate-question`, {
    method: 'POST',
  });
}

export async function regenerateInsights(conversationId: number): Promise<{ insights: Message }> {
  return fetchApi<{ insights: Message }>(`/conversations/${conversationId}/regenerate-insights`, {
    method: 'POST',
  });
}

export async function submitResponse(
  conversationId: number,
  response: string,
  selectedQuestion: string
): Promise<ResponseSubmissionResult> {
  const body: SubmitResponseRequest = {
    response,
    selectedQuestion,
  };
  return fetchApi<ResponseSubmissionResult>(`/conversations/${conversationId}/response`, {
    method: 'POST',
    body: JSON.stringify(body),
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
