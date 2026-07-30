import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { InventorySessionPage } from '@/components/dashboard/inventory/inventory-session-page';

export const metadata = { title: `Инвентаризация — зона | ${config.site.name}` } satisfies Metadata;

export default async function Page({ params }: { params: Promise<{ zoneId: string }> }): Promise<React.JSX.Element> {
  const { zoneId } = await params;
  return <InventorySessionPage zoneId={zoneId} />;
}
