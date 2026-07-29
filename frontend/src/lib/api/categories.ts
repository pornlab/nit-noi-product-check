import { apiRequest } from './http';
import type { Category, CategoryFilters, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const categoriesApi = {
  list: (filter: CategoryFilters = {}) =>
    apiRequest<Category[]>(
      '/categories' +
        qs({
          isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
          search: filter.search,
        }),
    ),
  get: (id: string) => apiRequest<Category>(`/categories/${id}`),
  create: (input: CreateCategoryInput) =>
    apiRequest<Category>('/categories', { method: 'POST', body: input }),
  update: (id: string, input: UpdateCategoryInput) =>
    apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: input }),
};
