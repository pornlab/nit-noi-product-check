'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { ReceivingDetail } from '@/types/receiving';
import { currencySymbol, formatReceivingNumber } from '@/types/receiving';
import { receivingsApi } from '@/lib/api/receivings';
import { type Unit } from '@/types/unit';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useNotify } from '@/lib/api/notify';
import { useUser } from '@/hooks/use-user';
import { useI18n } from '@/lib/i18n/provider';
import { unitLabelKey } from '@/lib/i18n/unit';
import { paths } from '@/paths';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

function formatDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date}, ${time}`;
}
function formatQty(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
function formatMoney(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface Field { label: string; value: React.ReactNode }
function Meta({ items }: { items: Field[] }): React.JSX.Element {
  return (
    <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" useFlexGap>
      {items.map((f) => (
        <Box key={f.label} sx={{ minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {f.label}
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.25 }}>{f.value}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

export function ReceivingDetailPage({ receivingId }: { receivingId: string }): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useI18n();
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();
  const roleLabel = (r: string): string =>
    r === 'admin' ? t('roles.admin') : r === 'manager' ? t('roles.manager') : r === 'employee' ? t('roles.employee') : r;
  const canDelete = user?.role === 'admin';
  const canEdit = user?.role === 'admin';
  const [deleting, setDeleting] = React.useState(false);
  const [state, setState] = React.useState<{
    loading: boolean; error: string | null; data: ReceivingDetail | null;
  }>({ loading: true, error: null, data: null });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await receivingsApi.get(receivingId);
    if (error) setState({ loading: false, error: error.message, data: null });
    else setState({ loading: false, error: null, data: data ?? null });
  }, [receivingId]);

  React.useEffect(() => { void load(); }, [load]);

  if (state.loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
        <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
      </Box>
    );
  }
  if (state.error) {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">{t('common.retry')}</Button>}>
          {state.error}
        </Alert>
        <Button onClick={() => router.push(paths.dashboard.receivings)}>{t('common.backToList')}</Button>
      </Stack>
    );
  }
  if (!state.data) return <Typography variant="body2">—</Typography>;

  const r = state.data;
  const sym = currencySymbol(r.currency);
  const doDelete = (): void => {
    confirm({
      title: t('receivings.confirmDeleteTitle'),
      message: t('receivings.confirmDeleteBody', { number: formatReceivingNumber(r.sequenceNumber) }),
      danger: true,
      onConfirm: async () => {
        setDeleting(true);
        const { error } = await receivingsApi.remove(r.id);
        setDeleting(false);
        if (error) { notify(error.message, 'error'); return; }
        notify(t('receivings.deletedNotify'));
        router.push(paths.dashboard.receivings);
      },
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button size="small" onClick={() => router.push(paths.dashboard.receivings)}>{t('common.backToList')}</Button>
        <Typography variant="h5">{t('receivings.detailTitle', { number: formatReceivingNumber(r.sequenceNumber) })}</Typography>
        <Box sx={{ flex: 1 }} />
        {canEdit ? (
          <Button
            variant="outlined"
            startIcon={<PencilSimpleIcon />}
            disabled={deleting}
            onClick={() => router.push(paths.dashboard.receivingEdit(r.id))}
          >
            {t('receivings.editButton')}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            color="error"
            variant="outlined"
            startIcon={<TrashIcon />}
            disabled={deleting}
            onClick={doDelete}
          >
            {t('receivings.deleteButton')}
          </Button>
        ) : null}
      </Stack>

      <Card>
        <CardContent>
          <Meta items={[
            { label: t('receivings.metaNumber'), value: <Box component="span" sx={{ fontWeight: 700 }}>{formatReceivingNumber(r.sequenceNumber)}</Box> },
            { label: t('receivings.metaDate'), value: formatDate(r.receivedAt) },
            { label: t('receivings.metaSupplier'), value: r.supplier.name },
            { label: t('receivings.metaCreatedAt'), value: formatDateTime(r.createdAt) },
            {
              label: t('receivings.metaAuthor'),
              value: (
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{r.createdBy.name}</span>
                  <Chip size="small" label={roleLabel(r.createdBy.role)} />
                </Stack>
              ),
            },
            { label: t('receivings.metaPositions'), value: r.items.length },
          ]} />
        </CardContent>
      </Card>

      <Card>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('inventory.columnProduct')}</TableCell>
                <TableCell>{t('receivings.colProductDistribution')}</TableCell>
                <TableCell align="right">{t('receivings.quantity')}</TableCell>
                <TableCell align="right">{t('receivings.cost')}, {sym}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {r.items.map((it) => {
                const unit = t(unitLabelKey(it.product.baseUnit as Unit));
                return (
                  <TableRow key={it.id}>
                    <TableCell sx={{ verticalAlign: 'top' }}>{it.product.name}</TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Stack spacing={0.25}>
                        {it.allocations.map((a) => (
                          <Typography key={a.id} variant="body2">
                            <Box component="span" sx={{ color: 'text.secondary' }}>{a.zone.name}:</Box>{' '}
                            {formatQty(a.quantity)} {unit}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ verticalAlign: 'top', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatQty(it.quantity)} {unit}
                    </TableCell>
                    <TableCell align="right" sx={{ verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(it.cost)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Stack spacing={0.25} sx={{ minWidth: 240 }}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">{t('receivings.totalItems')}</Typography>
              <Typography variant="body2">{formatMoney(r.itemsTotalCost)} {sym}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">{t('receivings.totalDelivery')}</Typography>
              <Typography variant="body2">{formatMoney(r.deliveryCost)} {sym}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('receivings.totalGrand')}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatMoney(r.grandTotal)} {sym}</Typography>
            </Stack>
          </Stack>
        </Box>
      </Card>

      {snack}
      {confirmView}
    </Stack>
  );
}
