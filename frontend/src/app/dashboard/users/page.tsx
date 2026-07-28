import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { UsersPage } from '@/components/dashboard/users/users-page';

export const metadata = { title: `Пользователи | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <UsersPage />;
}
