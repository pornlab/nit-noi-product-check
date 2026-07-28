'use client';

import type { User } from '@/types/user';
import { apiRequest, clearToken, getToken, setToken } from '@/lib/api/http';

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  user: User;
}

class AuthClient {
  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    const { data, error } = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: params,
    });

    if (error) {
      if (error.status === 401) {
        return { error: 'Неверный email или пароль' };
      }
      return { error: error.message };
    }

    if (!data) {
      return { error: 'Некорректный ответ сервера' };
    }

    setToken(data.accessToken);
    return {};
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const token = getToken();
    if (!token) {
      return { data: null };
    }

    const { data, error } = await apiRequest<User>('/auth/me', { method: 'GET' });

    if (error) {
      if (error.status === 401) {
        clearToken();
        return { data: null };
      }
      return { error: error.message };
    }

    return { data: data ?? null };
  }

  async signOut(): Promise<{ error?: string }> {
    clearToken();
    return {};
  }
}

export const authClient = new AuthClient();
