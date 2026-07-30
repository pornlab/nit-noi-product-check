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
import { paths } from '@/paths';

function isSameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear()
      && d.getMonth() === ref.getMonth()
      && d.getDate() === ref.getDate();
}

function formatLastCompleted(iso: string | null): { text: string; today: boolean } {
  if (!iso) return { text: 'ещё не проводилась', today: false };
  const now = new Date();
  const d = new Date(iso);
  const today = isSameLocalDay(iso, now);
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (today) return { text: `сегодня в ${timeStr}`, today: true };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(iso, yesterday)) return { text: `вчера в ${timeStr}`, today: false };
  const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { text: `${dateStr} в ${timeStr}`, today: false };
}

export function InventoryZonesPage(): React.JSX.Element {
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: InventoryZoneSummary[] }>({
    loading: true, error: null, items: [],
  });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await inventoryApi.listZones();
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Инвентаризация</Typography>
      <Typography variant="body2" color="text.secondary">
        Выберите зону, чтобы пересчитать остатки.
      </Typography>

      {state.loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} /><Typography variant="body2">Загрузка…</Typography>
        </Box>
      ) : state.error ? (
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">Повторить</Button>}>
          {state.error}
        </Alert>
      ) : state.items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Доступных зон нет.</Typography>
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
                          Последняя инвентаризация
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
                        {z.lastCompletedAt ? 'Открыть' : 'Начать инвентаризацию'}
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
