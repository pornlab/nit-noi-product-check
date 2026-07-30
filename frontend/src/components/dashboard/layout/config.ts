import type { NavItemConfig } from '@/types/nav';
import type { UserRole } from '@/types/user';
import { paths } from '@/paths';

/**
 * Значение `title` — это i18n-ключ вида `nav.inventory`. Переводится в side-nav/mobile-nav.
 */
export function getNavItems(role: UserRole | undefined): NavItemConfig[] {
  if (role === 'employee') {
    return [
      { key: 'my-zones', title: 'nav.myZones', href: paths.dashboard.myZones, icon: 'map-pin' },
      { key: 'inventory', title: 'nav.inventory', href: paths.dashboard.inventory, icon: 'clipboard' },
    ];
  }
  return [
    { key: 'inventory', title: 'nav.inventory', href: paths.dashboard.inventory, icon: 'clipboard' },
    { key: 'receivings', title: 'nav.receivings', href: paths.dashboard.receivings, icon: 'tray-arrow-down' },
    { key: 'products', title: 'nav.products', href: paths.dashboard.products, icon: 'package' },
    {
      key: 'organization',
      title: 'nav.organization',
      href: paths.dashboard.organization,
      icon: 'buildings',
      matcher: { type: 'startsWith', href: paths.dashboard.organization },
      items: [
        { key: 'users', title: 'nav.users', href: paths.dashboard.users, icon: 'users' },
        { key: 'positions', title: 'nav.positions', href: paths.dashboard.positions, icon: 'identification-badge' },
        { key: 'zones', title: 'nav.zones', href: paths.dashboard.zones, icon: 'map-pin' },
        { key: 'suppliers', title: 'nav.suppliers', href: paths.dashboard.suppliers, icon: 'truck' },
        { key: 'categories', title: 'nav.categories', href: paths.dashboard.categories, icon: 'tag' },
      ],
    },
  ];
}
