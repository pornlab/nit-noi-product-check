import type { Unit } from '@/types/unit';

export interface ProductCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ProductZoneRef {
  id: string;
  name: string;
}

export interface ProductStockZoneEntry {
  zoneId: string;
  zoneName: string;
  /** null, если в зоне ещё не было инвентаризации. */
  quantity: string | null;
  /** null, если в зоне ещё не было инвентаризации. */
  completedAt: string | null;
  receivedAfter: string;
  disposedAfter: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory | null;
  baseUnit: Unit;
  sku: string | null;
  barcode: string | null;
  isInventoryTracked: boolean;
  isPurchasable: boolean;
  isActive: boolean;
  minQuantity: string | null;
  optimalQuantity: string | null;
  createdAt: string;
  updatedAt: string;
  zones: ProductZoneRef[];
  lastQuantity: string | null;
  lastInventoryAt: string | null;
  lastStock: ProductStockZoneEntry[];
  lastPrice: string | null;
  lastPriceAt: string | null;
  lastPriceCurrency: string | null;
}

export interface CreateProductInput {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  baseUnit: Unit;
  sku?: string | null;
  barcode?: string | null;
  isInventoryTracked?: boolean;
  isPurchasable?: boolean;
  zoneIds?: string[];
  minQuantity?: number | null;
  optimalQuantity?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  baseUnit?: Unit;
  sku?: string | null;
  barcode?: string | null;
  isInventoryTracked?: boolean;
  isPurchasable?: boolean;
  isActive?: boolean;
  zoneIds?: string[];
  minQuantity?: number | null;
  optimalQuantity?: number | null;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string; // UUID or 'none'
  zoneId?: string;
  baseUnit?: Unit;
  isInventoryTracked?: boolean;
  isPurchasable?: boolean;
  isActive?: boolean;
}
