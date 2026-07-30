'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { ReceivingSummary } from '@/types/receiving';
import { currencySymbol, formatReceivingNumber } from '@/types/receiving';
import { receivingsApi } from '@/lib/api/receivings';
import { useI18n } from '@/lib/i18n/provider';
import { paths } from '@/paths';

function formatDate(iso: string): string {
  // ISO YYYY-MM-DD → DD.MM.YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
  return new Date(iso).toLocaleDateString('ru-RU');
}
function formatMoney(v: string): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : v;
}

export function ReceivingsPage(): React.JSX.Element {
  const router = useRouter();
  const { t } = useI18n();

  const [state, setState] = React.useState<{
    loading: boolean; error: string | null; items: ReceivingSummary[];
  }>({ loading: true, error: null, items: [] });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await receivingsApi.list();
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Typography variant="h5">{t('receivings.pageTitle')}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="large" onClick={() => router.push(paths.dashboard.receivingsNew)}>
          {t('receivings.addReceiving')}
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
            <Typography variant="body2" color="text.secondary">
              {t('receivings.empty')}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('receivings.columnNumber')}</TableCell>
                  <TableCell>{t('receivings.columnDate')}</TableCell>
                  <TableCell>{t('receivings.columnSupplier')}</TableCell>
                  <TableCell align="right">{t('receivings.columnPositions')}</TableCell>
                  <TableCell align="right">{t('receivings.columnZones')}</TableCell>
                  <TableCell align="right">{t('receivings.columnTotal')}</TableCell>
                  <TableCell>{t('receivings.columnAuthor')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.items.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(paths.dashboard.receiving(r.id))}
                  >
                    <TableCell>{formatReceivingNumber(r.sequenceNumber)}</TableCell>
                    <TableCell>{formatDate(r.receivedAt)}</TableCell>
                    <TableCell>{r.supplier.name}</TableCell>
                    <TableCell align="right">{r.positionsCount}</TableCell>
                    <TableCell align="right">{r.zonesCount}</TableCell>
                    <TableCell align="right">{formatMoney(r.grandTotal)} {currencySymbol(r.currency)}</TableCell>
                    <TableCell>{r.createdBy.name}</TableCell>
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
