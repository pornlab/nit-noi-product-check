import { apiRequest } from './http';
import type { User, UserRole } from '@/types/user';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const usersApi = {
  list: (filter: {
    role?: UserRole;
    positionId?: string;
    zoneId?: string;
    isActive?: boolean;
    search?: string;
  } = {}) =>
    apiRequest<User[]>(
      '/users' +
        qs({
          role: filter.role,
          positionId: filter.positionId,
          zoneId: filter.zoneId,
          isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
          search: filter.search,
        }),
    ),
  get: (id: string) => apiRequest<User>(`/users/${id}`),
  create: (input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    positionId?: string | null;
    isActive?: boolean;
  }) => apiRequest<User>('/users', { method: 'POST', body: input }),
  update: (id: string, input: {
    name?: string;
    role?: UserRole;
    positionId?: string | null;
    isActive?: boolean;
  }) => apiRequest<User>(`/users/${id}`, { method: 'PATCH', body: input }),
  changePassword: (id: string, password: string) =>
    apiRequest<void>(`/users/${id}/password`, { method: 'PATCH', body: { password } }),
  replaceZones: (id: string, zones: Array<{ zoneId: string; isResponsible: boolean }>) =>
    apiRequest<User>(`/users/${id}/zones`, { method: 'PUT', body: { zones } }),
};
