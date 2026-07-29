import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { IdentificationBadgeIcon } from '@phosphor-icons/react/dist/ssr/IdentificationBadge';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import { TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

export const navIcons = {
  buildings: BuildingsIcon,
  'identification-badge': IdentificationBadgeIcon,
  'map-pin': MapPinIcon,
  package: PackageIcon,
  tag: TagIcon,
  truck: TruckIcon,
  user: UserIcon,
  users: UsersIcon,
} as Record<string, Icon>;
