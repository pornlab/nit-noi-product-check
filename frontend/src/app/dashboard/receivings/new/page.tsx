import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ReceivingNewPage } from '@/components/dashboard/receivings/receiving-new-page';

export const metadata = { title: `Поступление товара | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <ReceivingNewPage />;
}
