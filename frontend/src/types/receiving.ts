export interface ReceivingSummary {
  id: string;
  sequenceNumber: number;
  receivedAt: string; // YYYY-MM-DD
  createdAt: string;
  currency: string;
  supplier: { id: string; name: string };
  createdBy: { id: string; name: string };
  positionsCount: number;
  zonesCount: number;
  itemsTotalCost: string;
  deliveryCost: string;
  grandTotal: string;
}

export interface ReceivingDetailItemAllocation {
  id: string;
  zone: { id: string; name: string };
  quantity: string;
}

export interface ReceivingDetailItem {
  id: string;
  product: { id: string; name: string; baseUnit: string };
  quantity: string;
  cost: string;
  allocations: ReceivingDetailItemAllocation[];
}

export interface ReceivingDetail {
  id: string;
  sequenceNumber: number;
  receivedAt: string;
  createdAt: string;
  currency: string;
  supplier: { id: string; name: string };
  createdBy: { id: string; name: string; role: string };
  deliveryCost: string;
  itemsTotalCost: string;
  grandTotal: string;
  items: ReceivingDetailItem[];
}

export function currencySymbol(code: string): string {
  switch (code.toUpperCase()) {
    case 'THB': { return '฿'; }
    case 'USD': { return '$'; }
    case 'EUR': { return '€'; }
    case 'RUB': { return '₽'; }
    default: { return code; }
  }
}

export interface CreateReceivingAllocationInput {
  zoneId: string;
  quantity: number;
}
export interface CreateReceivingItemInput {
  productId: string;
  quantity: number;
  cost: number;
  allocations: CreateReceivingAllocationInput[];
}
export interface CreateReceivingInput {
  supplierId: string;
  receivedAt: string; // YYYY-MM-DD
  currency?: string;
  deliveryCost: number;
  items: CreateReceivingItemInput[];
}

export function formatReceivingNumber(seq: number): string {
  return `ПН-${String(seq).padStart(6, '0')}`;
}
