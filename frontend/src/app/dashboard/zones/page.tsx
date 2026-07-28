import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { ZonesPage } from '@/components/dashboard/zones/zones-page';

export const metadata = { title: `Зоны | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <ZonesPage />;
}
