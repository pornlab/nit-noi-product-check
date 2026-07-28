import { apiRequest } from './http';
import type { Zone, ZoneAssignment, ZoneDetail } from '@/types/zone';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const zonesApi = {
  list: (filter: { isActive?: boolean; search?: string } = {}) =>
    apiRequest<Zone[]>(
      '/zones' +
        qs({
          isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
          search: filter.search,
        }),
    ),
  get: (id: string) => apiRequest<ZoneDetail>(`/zones/${id}`),
  create: (input: { name: string; description?: string | null }) =>
    apiRequest<Zone>('/zones', { method: 'POST', body: input }),
  update: (id: string, input: { name?: string; description?: string | null; isActive?: boolean }) =>
    apiRequest<Zone>(`/zones/${id}`, { method: 'PATCH', body: input }),
  assign: (zoneId: string, input: { userId: string; isResponsible?: boolean }) =>
    apiRequest<ZoneAssignment>(`/zones/${zoneId}/users`, { method: 'POST', body: input }),
  updateAssignment: (zoneId: string, userId: string, isResponsible: boolean) =>
    apiRequest<ZoneAssignment>(`/zones/${zoneId}/users/${userId}`, {
      method: 'PATCH',
      body: { isResponsible },
    }),
  unassign: (zoneId: string, userId: string) =>
    apiRequest<void>(`/zones/${zoneId}/users/${userId}`, { method: 'DELETE' }),
};
