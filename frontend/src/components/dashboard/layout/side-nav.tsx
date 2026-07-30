'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { useUser } from '@/hooks/use-user';
import { Logo } from '@/components/core/logo';

import { getNavItems } from './config';
import { navIcons } from './nav-icons';

export function SideNav(): React.JSX.Element {
  const pathname = usePathname();
  const { user } = useUser();
  const navItems = getNavItems(user?.role);

  return (
    <Box
      sx={{
        '--SideNav-background': 'var(--mui-palette-neutral-950)',
        '--SideNav-color': 'var(--mui-palette-common-white)',
        '--NavItem-color': 'var(--mui-palette-neutral-300)',
        '--NavItem-hover-background': 'rgba(255, 255, 255, 0.04)',
        '--NavItem-active-background': 'var(--mui-palette-primary-main)',
        '--NavItem-active-color': 'var(--mui-palette-primary-contrastText)',
        '--NavItem-disabled-color': 'var(--mui-palette-neutral-500)',
        '--NavItem-icon-color': 'var(--mui-palette-neutral-400)',
        '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
        '--NavItem-icon-disabled-color': 'var(--mui-palette-neutral-600)',
        bgcolor: 'var(--SideNav-background)',
        color: 'var(--SideNav-color)',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        height: '100%',
        left: 0,
        maxWidth: '100%',
        position: 'fixed',
        scrollbarWidth: 'none',
        top: 0,
        width: 'var(--SideNav-width)',
        zIndex: 'var(--SideNav-zIndex)',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex' }}>
          <Logo color="light" height={32} width={122} />
        </Box>
        <Box
          sx={{
            alignItems: 'center',
            backgroundColor: 'var(--mui-palette-neutral-950)',
            border: '1px solid var(--mui-palette-neutral-700)',
            borderRadius: '12px',
            display: 'flex',
            p: '8px 12px',
          }}
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography color="var(--mui-palette-neutral-400)" variant="body2" noWrap>
              {user?.position?.name ?? '—'}
            </Typography>
            <Typography color="inherit" variant="subtitle1" noWrap>
              {user?.name ?? '—'}
            </Typography>
          </Box>
        </Box>
      </Stack>
      <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />
      <Box component="nav" sx={{ flex: '1 1 auto', p: '12px' }}>
        {renderNavItems({ pathname, items: navItems })}
      </Box>
    </Box>
  );
}

function renderNavItems({ items = [], pathname }: { items?: NavItemConfig[]; pathname: string }): React.JSX.Element {
  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((curr) => (
        <NavItem key={curr.key} pathname={pathname} item={curr} />
      ))}
    </Stack>
  );
}

function isBranchActive(item: NavItemConfig, pathname: string): boolean {
  if (isNavItemActive({ disabled: item.disabled, external: item.external, href: item.href, matcher: item.matcher, pathname })) return true;
  for (const child of item.items ?? []) {
    if (isBranchActive(child, pathname)) return true;
  }
  return false;
}

function NavItem({ item, pathname, nested = false }: { item: NavItemConfig; pathname: string; nested?: boolean }): React.JSX.Element {
  const { disabled, external, href, icon, matcher, title, items } = item;
  const hasChildren = Array.isArray(items) && items.length > 0;
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const branchActive = hasChildren && isBranchActive(item, pathname);
  const Icon = icon ? navIcons[icon] : null;

  const [open, setOpen] = React.useState<boolean>(branchActive);
  React.useEffect(() => { if (branchActive) setOpen(true); }, [branchActive]);

  return (
    <li>
      <Box
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: 'var(--NavItem-color)',
          display: 'flex',
          flex: '0 0 auto',
          position: 'relative',
          whiteSpace: 'nowrap',
          ...(disabled && {
            bgcolor: 'var(--NavItem-disabled-background)',
            color: 'var(--NavItem-disabled-color)',
          }),
          ...(active && { bgcolor: 'var(--NavItem-active-background)', color: 'var(--NavItem-active-color)' }),
        }}
      >
        <Box
          {...(href && !disabled
            ? {
                component: external ? 'a' : RouterLink,
                href,
                target: external ? '_blank' : undefined,
                rel: external ? 'noreferrer' : undefined,
              }
            : { role: 'button', onClick: hasChildren ? () => setOpen((v) => !v) : undefined })}
          sx={{
            alignItems: 'center',
            color: 'inherit',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            flex: '1 1 auto',
            gap: 1,
            p: nested ? '6px 12px 6px 40px' : '6px 16px',
            textDecoration: 'none',
            minWidth: 0,
          }}
        >
          <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
            {Icon ? (
              <Icon
                fill={active ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)'}
                fontSize="var(--icon-fontSize-md)"
                weight={active ? 'fill' : undefined}
              />
            ) : null}
          </Box>
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography component="span" sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}>
              {title}
            </Typography>
          </Box>
        </Box>
        {hasChildren ? (
          <Box
            role="button"
            aria-label={open ? 'Свернуть' : 'Развернуть'}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              px: 1.25, py: '6px',
              color: 'inherit',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <CaretDownIcon
              fontSize="var(--icon-fontSize-sm)"
              style={{ transition: 'transform 200ms', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
          </Box>
        ) : null}
      </Box>
      {hasChildren ? (
        <Collapse in={open} unmountOnExit>
          <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }}>
            {items!.map((child) => (
              <NavItem key={child.key} pathname={pathname} item={child} nested />
            ))}
          </Stack>
        </Collapse>
      ) : null}
    </li>
  );
}
