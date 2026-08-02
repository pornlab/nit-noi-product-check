export interface DisposalSummaryItem {
  productName: string;
  baseUnit: string;
  quantity: string;
  unitPrice: string | null;
  cost: string | null;
  currency: string | null;
}

export interface DisposalSummary {
  id: string;
  createdAt: string;
  zone: { id: string; name: string };
  createdBy: { id: string; name: string; role: 'admin' | 'manager' | 'employee' };
  skuCount: number;
  items: DisposalSummaryItem[];
  totalCost: string | null;
  currency: string | null;
}

export interface DisposalDetailItem {
  id: string;
  product: { id: string; name: string; baseUnit: string };
  quantity: string;
}

export interface DisposalDetail extends Omit<DisposalSummary, 'items'> {
  items: DisposalDetailItem[];
}

export function currencySymbol(code: string | null | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'THB': { return '฿'; }
    case 'USD': { return '$'; }
    case 'EUR': { return '€'; }
    case 'RUB': { return '₽'; }
    default: { return code ?? '฿'; }
  }
}

export interface CreateDisposalItemInput {
  productId: string;
  quantity: number;
}
export interface CreateDisposalInput {
  zoneId: string;
  items: CreateDisposalItemInput[];
}
