import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { DisposalNewPage } from '@/components/dashboard/disposals/disposal-new-page';

export const metadata = { title: `Новая утилизация | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <DisposalNewPage />;
}
