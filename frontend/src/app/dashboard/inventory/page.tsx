import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { InventoryZonesPage } from '@/components/dashboard/inventory/inventory-zones-page';

export const metadata = { title: `Инвентаризация | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <InventoryZonesPage />;
}
