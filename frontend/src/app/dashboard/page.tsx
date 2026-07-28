import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { ProfileCard } from '@/components/dashboard/profile/profile-card';

export const metadata = { title: `Профиль | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <ProfileCard />;
}
