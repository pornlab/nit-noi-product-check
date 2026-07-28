import { config } from '@/config';

const TOKEN_STORAGE_KEY = 'warehouse-auth-token';

export function getToken(): string | null {
  if (globalThis.window === undefined) return null;
  return globalThis.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  if (globalThis.window === undefined) return;
  globalThis.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  if (globalThis.window === undefined) return;
  globalThis.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export interface ApiError {
  status: number;
  message: string;
}

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, auth = true, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${config.api.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    return { error: { status: 0, message: 'Сервер недоступен. Проверьте подключение.' } };
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = extractMessage(payload) ?? `Ошибка запроса (${response.status})`;
    return { error: { status: response.status, message } };
  }

  return { data: payload as T };
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const message = obj.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.length > 0 && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
}
