import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ProductAnalyticsPage } from '@/components/dashboard/products/product-analytics-page';

export const metadata = { title: `Аналитика товара | ${config.site.name}` } satisfies Metadata;

export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ProductAnalyticsPage productId={id} />;
}
