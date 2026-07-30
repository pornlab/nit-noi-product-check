import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ReceivingsPage } from '@/components/dashboard/receivings/receivings-page';

export const metadata = { title: `Поступления | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <ReceivingsPage />;
}
