import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { SuppliersPage } from '@/components/dashboard/suppliers/suppliers-page';

export const metadata = { title: `Поставщики | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <SuppliersPage />;
}
