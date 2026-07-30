import { apiRequest } from './http';
import type {
  CreateInventoryInput,
  CreateInventoryResponse,
  InventorySessionDetail,
  InventorySessionSummary,
  InventoryZoneSummary,
  ZoneInventoryResponse,
} from '@/types/inventory';

export const inventoryApi = {
  listZones: () => apiRequest<InventoryZoneSummary[]>('/inventory/zones'),
  getZone: (zoneId: string) => apiRequest<ZoneInventoryResponse>(`/inventory/zones/${zoneId}`),
  listSessions: (zoneId: string) =>
    apiRequest<InventorySessionSummary[]>(`/inventory/zones/${zoneId}/sessions`),
  getSession: (sessionId: string) =>
    apiRequest<InventorySessionDetail>(`/inventory/sessions/${sessionId}`),
  updateItem: (sessionId: string, itemId: string, quantity: number) =>
    apiRequest<InventorySessionDetail>(`/inventory/sessions/${sessionId}/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
    }),
  create: (input: CreateInventoryInput) =>
    apiRequest<CreateInventoryResponse>('/inventory', { method: 'POST', body: input }),
};
