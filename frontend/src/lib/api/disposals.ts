import { apiRequest } from './http';
import type { CreateDisposalInput, DisposalDetail, DisposalSummary } from '@/types/disposal';

export interface DisposalListFilter {
  dateFrom?: string;
  dateTo?: string;
  zoneId?: string;
  role?: 'admin' | 'manager' | 'employee';
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const disposalsApi = {
  list: (filter: DisposalListFilter = {}) =>
    apiRequest<DisposalSummary[]>('/disposals' + qs({
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      zoneId: filter.zoneId,
      role: filter.role,
    })),
  get: (id: string) => apiRequest<DisposalDetail>(`/disposals/${id}`),
  create: (input: CreateDisposalInput) =>
    apiRequest<DisposalDetail>('/disposals', { method: 'POST', body: input }),
  remove: (id: string) => apiRequest<void>(`/disposals/${id}`, { method: 'DELETE' }),
};
