'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { TranslateIcon } from '@phosphor-icons/react/dist/ssr/Translate';

import { usePopover } from '@/hooks/use-popover';
import { locales, localeLabels, localeShort } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/provider';

import { MobileNav } from './mobile-nav';
import { UserPopover } from './user-popover';

export function MainNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const { locale, setLocale, t } = useI18n();
  const [langAnchor, setLangAnchor] = React.useState<HTMLElement | null>(null);

  const userPopover = usePopover<HTMLDivElement>();

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-paper)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}
        >
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <IconButton
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' } }}
            >
              <ListIcon />
            </IconButton>
            <Tooltip title={t('header.search')}>
              <IconButton>
                <MagnifyingGlassIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <Tooltip title={t('header.language')}>
              <IconButton onClick={(e) => setLangAnchor(e.currentTarget)}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TranslateIcon />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {localeShort[locale]}
                  </Typography>
                </Stack>
              </IconButton>
            </Tooltip>
            <Menu
              open={Boolean(langAnchor)}
              anchorEl={langAnchor}
              onClose={() => setLangAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {locales.map((l) => (
                <MenuItem
                  key={l}
                  selected={l === locale}
                  onClick={() => { setLocale(l); setLangAnchor(null); }}
                >
                  <ListItemText primary={localeLabels[l]} secondary={localeShort[l]} />
                  {l === locale ? (
                    <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                      <CheckIcon />
                    </Box>
                  ) : null}
                </MenuItem>
              ))}
            </Menu>
            <Tooltip title={t('header.notifications')}>
              <Badge badgeContent={4} color="success" variant="dot">
                <IconButton>
                  <BellIcon />
                </IconButton>
              </Badge>
            </Tooltip>
            <Avatar
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              src="/assets/avatar.png"
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Stack>
      </Box>
      <UserPopover anchorEl={userPopover.anchorRef.current} onClose={userPopover.handleClose} open={userPopover.open} />
      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
      />
    </React.Fragment>
  );
}
