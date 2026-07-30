import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { InventoryHistoryPage } from '@/components/dashboard/inventory/inventory-history-page';

export const metadata = { title: `История инвентаризаций | ${config.site.name}` } satisfies Metadata;

export default async function Page({ params }: { params: Promise<{ zoneId: string }> }): Promise<React.JSX.Element> {
  const { zoneId } = await params;
  return <InventoryHistoryPage zoneId={zoneId} />;
}
