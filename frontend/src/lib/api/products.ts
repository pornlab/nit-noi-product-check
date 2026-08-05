import { apiRequest } from './http';
import type {
  CreateProductInput,
  Product,
  ProductFilters,
  UpdateProductInput,
} from '@/types/product';
import type { ProductAnalyticsSummary } from '@/types/product-analytics';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (parts.length === 0) return '';
  const s = new URLSearchParams();
  for (const [k, v] of parts) s.set(k, String(v));
  return '?' + s.toString();
}

export const productsApi = {
  list: (filter: ProductFilters = {}) =>
    apiRequest<Product[]>(
      '/products' +
        qs({
          search: filter.search,
          categoryId: filter.categoryId,
          zoneId: filter.zoneId,
          baseUnit: filter.baseUnit,
          isInventoryTracked: filter.isInventoryTracked === undefined ? undefined : String(filter.isInventoryTracked),
          isPurchasable: filter.isPurchasable === undefined ? undefined : String(filter.isPurchasable),
          isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
        }),
    ),
  get: (id: string) => apiRequest<Product>(`/products/${id}`),
  create: (input: CreateProductInput) =>
    apiRequest<Product>('/products', { method: 'POST', body: input }),
  update: (id: string, input: UpdateProductInput) =>
    apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body: input }),
  analytics: (id: string, from?: string, to?: string) =>
    apiRequest<ProductAnalyticsSummary>(
      `/products/${id}/analytics` + qs({ from, to }),
    ),
};
