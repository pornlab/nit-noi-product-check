'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { InventorySessionSummary, InventoryZoneSummary } from '@/types/inventory';
import { formatInventoryNumber } from '@/types/inventory';
import { inventoryApi } from '@/lib/api/inventory';
import { paths } from '@/paths';
import { useI18n } from '@/lib/i18n/provider';
import { useUser } from '@/hooks/use-user';

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  admin: 'error',
  manager: 'warning',
  employee: 'info',
};

function isSameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear()
      && d.getMonth() === ref.getMonth()
      && d.getDate() === ref.getDate();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDMY(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function InventoryHistoryPage({ zoneId }: { zoneId: string }): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useI18n();
  const roleLabel = (r: string): string =>
    r === 'admin' ? t('roles.admin') : r === 'manager' ? t('roles.manager') : r === 'employee' ? t('roles.employee') : r;
  const formatDate = (iso: string): string => {
    const now = new Date();
    const time = fmtTime(iso);
    if (isSameLocalDay(iso, now)) return t('inventory.dateToday', { time });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (isSameLocalDay(iso, yesterday)) return t('inventory.dateYesterday', { time });
    return t('inventory.dateAt', { date: fmtDMY(iso), time });
  };
  const [zone, setZone] = React.useState<InventoryZoneSummary | null>(null);
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: InventorySessionSummary[] }>({
    loading: true, error: null, items: [],
  });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const [zonesResp, sessionsResp] = await Promise.all([
      inventoryApi.listZones(),
      inventoryApi.listSessions(zoneId),
    ]);
    if (sessionsResp.error) {
      setState({ loading: false, error: sessionsResp.error.message, items: [] });
      return;
    }
    setZone(zonesResp.data?.find((z) => z.id === zoneId) ?? null);
    setState({ loading: false, error: null, items: sessionsResp.data ?? [] });
  }, [zoneId]);

  React.useEffect(() => { void load(); }, [load]);

  // Employee, инвентаризация зоны уже была сегодня — блокируем кнопку
  const lockedToday = React.useMemo(() => {
    if (user?.role !== 'employee') return false;
    return state.items.some((s) => isSameLocalDay(s.completedAt, new Date()));
  }, [user?.role, state.items]);

  return (
    <Stack spacing={2} sx={{ mt: -6 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button size="small" onClick={() => router.push(paths.dashboard.inventory)}>{t('inventory.historyBackToZones')}</Button>
        <Typography variant="h5">
          {zone ? t('inventory.historyPageTitle', { zone: zone.name }) : t('inventory.historyTitle')}
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          component={RouterLink}
          href={paths.dashboard.inventoryZone(zoneId)}
          variant="contained"
          size="large"
          disabled={lockedToday}
          sx={{ minHeight: 44, borderRadius: '12px', textTransform: 'none', fontWeight: 600, minWidth: { sm: 260 } }}
        >
          {lockedToday ? t('inventory.lockedToday') : t('inventory.startInventory')}
        </Button>
      </Stack>

      <Card>
        {state.loading ? (
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
          </Box>
        ) : state.error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">{t('common.retry')}</Button>}>
              {state.error}
            </Alert>
          </Box>
        ) : state.items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">{t('inventory.empty')}</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('inventory.columnNumber')}</TableCell>
                  <TableCell>{t('inventory.columnDate')}</TableCell>
                  <TableCell>{t('inventory.columnName')}</TableCell>
                  <TableCell>{t('inventory.columnRole')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.items.map((s) => (
                  <TableRow
                    key={s.id}
                    hover
                    onClick={() => router.push(paths.dashboard.inventorySession(s.id))}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatInventoryNumber(s.sequenceNumber)}
                    </TableCell>
                    <TableCell>{formatDate(s.completedAt)}</TableCell>
                    <TableCell>{s.createdBy.name}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={roleLabel(s.createdBy.role)}
                        color={ROLE_COLORS[s.createdBy.role] ?? 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  );
}
