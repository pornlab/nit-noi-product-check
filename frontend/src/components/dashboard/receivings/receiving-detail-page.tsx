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
import { unitLabels, type Unit } from '@/types/unit';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useNotify } from '@/lib/api/notify';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
};

function formatDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
  return new Date(iso).toLocaleDateString('ru-RU');
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
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
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();
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
        <CircularProgress size={20} /><Typography variant="body2">Загрузка…</Typography>
      </Box>
    );
  }
  if (state.error) {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">Повторить</Button>}>
          {state.error}
        </Alert>
        <Button onClick={() => router.push(paths.dashboard.receivings)}>К списку поступлений</Button>
      </Stack>
    );
  }
  if (!state.data) return <Typography variant="body2">Нет данных</Typography>;

  const r = state.data;
  const sym = currencySymbol(r.currency);
  const doDelete = (): void => {
    confirm({
      title: 'Удалить поступление',
      message: `Удалить поступление ${formatReceivingNumber(r.sequenceNumber)}? Действие нельзя отменить.`,
      danger: true,
      onConfirm: async () => {
        setDeleting(true);
        const { error } = await receivingsApi.remove(r.id);
        setDeleting(false);
        if (error) { notify(error.message, 'error'); return; }
        notify('Поступление удалено');
        router.push(paths.dashboard.receivings);
      },
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button size="small" onClick={() => router.push(paths.dashboard.receivings)}>← К списку</Button>
        <Typography variant="h5">Поступление {formatReceivingNumber(r.sequenceNumber)}</Typography>
        <Box sx={{ flex: 1 }} />
        {canEdit ? (
          <Button
            variant="outlined"
            startIcon={<PencilSimpleIcon />}
            disabled={deleting}
            onClick={() => router.push(paths.dashboard.receivingEdit(r.id))}
          >
            Редактировать
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
            Удалить
          </Button>
        ) : null}
      </Stack>

      <Card>
        <CardContent>
          <Meta items={[
            { label: 'Номер', value: <Box component="span" sx={{ fontWeight: 700 }}>{formatReceivingNumber(r.sequenceNumber)}</Box> },
            { label: 'Дата поступления', value: formatDate(r.receivedAt) },
            { label: 'Поставщик', value: r.supplier.name },
            { label: 'Создано', value: formatDateTime(r.createdAt) },
            {
              label: 'Автор',
              value: (
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{r.createdBy.name}</span>
                  <Chip size="small" label={ROLE_LABELS[r.createdBy.role] ?? r.createdBy.role} />
                </Stack>
              ),
            },
            { label: 'Позиций', value: r.items.length },
          ]} />
        </CardContent>
      </Card>

      <Card>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell>Распределение по зонам</TableCell>
                <TableCell align="right">Количество</TableCell>
                <TableCell align="right">Стоимость, {sym}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {r.items.map((it) => {
                const unit = unitLabels[it.product.baseUnit as Unit] ?? it.product.baseUnit;
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
              <Typography variant="body2" color="text.secondary">Товары</Typography>
              <Typography variant="body2">{formatMoney(r.itemsTotalCost)} {sym}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">Доставка</Typography>
              <Typography variant="body2">{formatMoney(r.deliveryCost)} {sym}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Всего</Typography>
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
