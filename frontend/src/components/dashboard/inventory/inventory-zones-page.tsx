'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { InventoryZoneSummary } from '@/types/inventory';
import { inventoryApi } from '@/lib/api/inventory';
import { useI18n } from '@/lib/i18n/provider';
import { paths } from '@/paths';

function isSameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear()
      && d.getMonth() === ref.getMonth()
      && d.getDate() === ref.getDate();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function formatDMY(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

export function InventoryZonesPage(): React.JSX.Element {
  const { t } = useI18n();
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: InventoryZoneSummary[] }>({
    loading: true, error: null, items: [],
  });

  const formatLastCompleted = React.useCallback((iso: string | null): { text: string; today: boolean } => {
    if (!iso) return { text: t('inventory.lastNever'), today: false };
    const now = new Date();
    const today = isSameLocalDay(iso, now);
    const time = formatTime(iso);
    if (today) return { text: t('inventory.lastToday', { time }), today: true };
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameLocalDay(iso, yesterday)) return { text: t('inventory.lastYesterday', { time }), today: false };
    return { text: t('inventory.lastAtDate', { date: formatDMY(iso), time }), today: false };
  }, [t]);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await inventoryApi.listZones();
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('inventory.pageTitle')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('inventory.zonesPickHint')}
      </Typography>

      {state.loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
        </Box>
      ) : state.error ? (
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">{t('common.retry')}</Button>}>
          {state.error}
        </Alert>
      ) : state.items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('inventory.zonesEmpty')}</Typography>
      ) : (
        <Grid container spacing={2}>
          {state.items.map((z) => {
            const info = formatLastCompleted(z.lastCompletedAt);
            return (
              <Grid key={z.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      <Typography variant="h6">{z.name}</Typography>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('inventory.zoneCardLastLabel')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: info.today ? 'success.main' : 'text.primary', fontWeight: info.today ? 600 : 400 }}>
                          {info.text}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }} />
                      <Button
                        component={RouterLink}
                        href={z.lastCompletedAt ? paths.dashboard.inventoryZoneHistory(z.id) : paths.dashboard.inventoryZone(z.id)}
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{ minHeight: 48, borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
                      >
                        {z.lastCompletedAt ? t('inventory.open') : t('inventory.startInventory')}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}
