import type { NavItemConfig } from '@/types/nav';
import type { UserRole } from '@/types/user';
import { paths } from '@/paths';

export function getNavItems(role: UserRole | undefined): NavItemConfig[] {
  if (role === 'employee') {
    return [
      { key: 'my-zones', title: 'Мои зоны', href: paths.dashboard.myZones, icon: 'map-pin' },
      { key: 'inventory', title: 'Инвентаризация', href: paths.dashboard.inventory, icon: 'clipboard' },
    ];
  }
  return [
    { key: 'inventory', title: 'Инвентаризация', href: paths.dashboard.inventory, icon: 'clipboard' },
    { key: 'products', title: 'Товары', href: paths.dashboard.products, icon: 'package' },
    {
      key: 'organization',
      title: 'Организация',
      href: paths.dashboard.organization,
      icon: 'buildings',
      matcher: { type: 'startsWith', href: paths.dashboard.organization },
      items: [
        { key: 'users', title: 'Пользователи', href: paths.dashboard.users, icon: 'users' },
        { key: 'positions', title: 'Должности', href: paths.dashboard.positions, icon: 'identification-badge' },
        { key: 'zones', title: 'Зоны', href: paths.dashboard.zones, icon: 'map-pin' },
        { key: 'suppliers', title: 'Поставщики', href: paths.dashboard.suppliers, icon: 'truck' },
        { key: 'categories', title: 'Категории', href: paths.dashboard.categories, icon: 'tag' },
      ],
    },
  ];
}
