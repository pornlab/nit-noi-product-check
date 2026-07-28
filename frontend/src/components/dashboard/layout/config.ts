import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [
  { key: 'overview', title: 'Профиль', href: paths.dashboard.overview, icon: 'user' },
] satisfies NavItemConfig[];
