import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ProductsPage } from '@/components/dashboard/products/products-page';

export const metadata = { title: `Товары | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <ProductsPage />;
}
