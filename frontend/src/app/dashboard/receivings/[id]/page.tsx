import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ReceivingDetailPage } from '@/components/dashboard/receivings/receiving-detail-page';

export const metadata = { title: `Поступление | ${config.site.name}` } satisfies Metadata;

export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ReceivingDetailPage receivingId={id} />;
}
