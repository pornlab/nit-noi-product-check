import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { CategoriesPage } from '@/components/dashboard/categories/categories-page';

export const metadata = { title: `Категории | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <CategoriesPage />;
}
