import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { MyZones } from '@/components/dashboard/zones/my-zones';

export const metadata = { title: `Мои зоны | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <MyZones />;
}
