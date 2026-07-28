import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { PositionsPage } from '@/components/dashboard/positions/positions-page';

export const metadata = { title: `Должности | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <PositionsPage />;
}
