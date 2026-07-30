import type { Unit } from '@/types/unit';

export interface ZoneInventoryProduct {
  id: string;
  name: string;
  unit: Unit;
  category: { id: string; name: string } | null;
  lastQuantity: string | null;
}

export interface ZoneInventoryResponse {
  zone: { id: string; name: string };
  products: ZoneInventoryProduct[];
  lastCompletedAt: string | null;
  lastCompletedBy: { id: string; name: string } | null;
}

export interface InventoryZoneSummary {
  id: string;
  name: string;
  lastCompletedAt: string | null;
}

export interface InventorySessionSummary {
  id: string;
  sequenceNumber: number;
  completedAt: string;
  createdBy: { id: string; name: string; role: 'admin' | 'manager' | 'employee' };
}

export interface InventorySessionDetailItem {
  id: string;
  productId: string;
  name: string;
  unit: Unit;
  category: { id: string; name: string } | null;
  quantity: string;
  updatedAt: string;
  updatedBy: { id: string; name: string; role: 'admin' | 'manager' | 'employee' } | null;
}

export interface InventorySessionDetail {
  id: string;
  sequenceNumber: number;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  completedAt: string | null;
  zone: { id: string; name: string };
  createdBy: { id: string; name: string; email: string; role: 'admin' | 'manager' | 'employee' };
  items: InventorySessionDetailItem[];
}

export function formatInventoryNumber(seq: number): string {
  return `INV-${String(seq).padStart(3, '0')}`;
}

export interface CreateInventoryInput {
  zoneId: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface CreateInventoryResponse {
  id: string;
  zoneId: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  itemsCount: number;
  completedAt: string;
}
