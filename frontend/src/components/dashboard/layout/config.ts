import type { NavItemConfig } from '@/types/nav';
import type { UserRole } from '@/types/user';
import { paths } from '@/paths';

export function getNavItems(role: UserRole | undefined): NavItemConfig[] {
  if (role === 'employee') {
    return [
      { key: 'overview', title: 'Профиль', href: paths.dashboard.overview, icon: 'user' },
      { key: 'my-zones', title: 'Мои зоны', href: paths.dashboard.myZones, icon: 'map-pin' },
    ];
  }
  return [
    { key: 'overview', title: 'Профиль', href: paths.dashboard.overview, icon: 'user' },
    { key: 'organization', title: 'Организация', href: paths.dashboard.organization, icon: 'buildings' },
    { key: 'users', title: 'Пользователи', href: paths.dashboard.users, icon: 'users' },
    { key: 'positions', title: 'Должности', href: paths.dashboard.positions, icon: 'identification-badge' },
    { key: 'zones', title: 'Зоны', href: paths.dashboard.zones, icon: 'map-pin' },
    { key: 'suppliers', title: 'Поставщики', href: paths.dashboard.suppliers, icon: 'truck' },
  ];
}
