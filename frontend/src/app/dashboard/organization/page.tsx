import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { OrganizationView } from '@/components/dashboard/organization/organization-view';

export const metadata = { title: `Организация | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <OrganizationView />;
}
