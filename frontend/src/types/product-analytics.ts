export interface ProductAnalyticsOperation {
  date: string;
  type: 'inventory' | 'receiving' | 'disposal';
  quantity: string;
  cost: string | null;
  currency: string | null;
  zone: { id: string; name: string } | null;
  user: { id: string; name: string; role: string } | null;
  docRef: string;
}

export interface ProductAnalyticsSummary {
  product: {
    id: string;
    name: string;
    sku: string | null;
    baseUnit: string;
    isActive: boolean;
    category: { id: string; name: string } | null;
  };
  period: { from: string; to: string };
  currentStock: { quantity: string; asOf: string };
  currentStockValue: { amount: string; unitPrice: string | null; currency: string | null };
  received: { quantity: string; cost: string; count: number };
  disposed: { quantity: string; cost: string | null; count: number };
  discrepancy: { quantity: string; date: string } | null;
  operations: ProductAnalyticsOperation[];
}
