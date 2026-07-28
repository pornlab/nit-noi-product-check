import { apiRequest } from './http';
import type { Position } from '@/types/position';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const positionsApi = {
  list: (filter: { isActive?: boolean; search?: string } = {}) =>
    apiRequest<Position[]>(
      '/positions' +
        qs({
          isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
          search: filter.search,
        }),
    ),
  create: (input: { name: string; description?: string | null }) =>
    apiRequest<Position>('/positions', { method: 'POST', body: input }),
  update: (id: string, input: { name?: string; description?: string | null; isActive?: boolean }) =>
    apiRequest<Position>(`/positions/${id}`, { method: 'PATCH', body: input }),
};
