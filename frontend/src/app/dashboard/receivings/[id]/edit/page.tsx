import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ReceivingNewPage } from '@/components/dashboard/receivings/receiving-new-page';

export const metadata = { title: `Редактирование поступления | ${config.site.name}` } satisfies Metadata;

export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ReceivingNewPage mode="edit" receivingId={id} />;
}
