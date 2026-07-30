import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { InventorySessionDetailPage } from '@/components/dashboard/inventory/inventory-session-detail-page';

export const metadata = { title: `Инвентаризация | ${config.site.name}` } satisfies Metadata;

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }): Promise<React.JSX.Element> {
  const { sessionId } = await params;
  return <InventorySessionDetailPage sessionId={sessionId} />;
}
