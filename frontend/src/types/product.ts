import type { Unit } from '@/types/unit';

export interface ProductCategory {
  id: string;
  name: string;
  isActive: boolean;
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
  createdAt: string;
  updatedAt: string;
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
}

export interface ProductFilters {
  search?: string;
  categoryId?: string; // UUID or 'none'
  baseUnit?: Unit;
  isInventoryTracked?: boolean;
  isPurchasable?: boolean;
  isActive?: boolean;
}
