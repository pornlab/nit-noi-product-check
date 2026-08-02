import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { DisposalsPage } from '@/components/dashboard/disposals/disposals-page';

export const metadata = { title: `Утилизации | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <DisposalsPage />;
}
