import { apiRequest } from './http';
import type { CreateSupplierPayload, Supplier, SupplierFilters, UpdateSupplierPayload } from '@/types/supplier';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const suppliersApi = {
  list: (filter: SupplierFilters = {}) =>
    apiRequest<Supplier[]>(
      '/suppliers' +
        qs({
          isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
          search: filter.search,
        }),
    ),
  get: (id: string) => apiRequest<Supplier>(`/suppliers/${id}`),
  create: (input: CreateSupplierPayload) =>
    apiRequest<Supplier>('/suppliers', { method: 'POST', body: input }),
  update: (id: string, input: UpdateSupplierPayload) =>
    apiRequest<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: input }),
};
