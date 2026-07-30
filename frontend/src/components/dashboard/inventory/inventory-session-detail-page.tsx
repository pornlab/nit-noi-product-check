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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

import type { InventorySessionDetail, InventorySessionDetailItem } from '@/types/inventory';
import { formatInventoryNumber } from '@/types/inventory';
import { inventoryApi } from '@/lib/api/inventory';
import { useNotify } from '@/lib/api/notify';
import { paths } from '@/paths';
import { unitLabels } from '@/types/unit';
import { useUser } from '@/hooks/use-user';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
};
const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  admin: 'error',
  manager: 'warning',
  employee: 'info',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

function formatQty(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
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
          <Typography variant="body1" sx={{ mt: 0.25 }}>
            {f.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

/** Помечаем строку как «изменённую», если updatedAt ощутимо позже completedAt сессии. */
function isItemEdited(item: InventorySessionDetailItem, completedAt: string | null): boolean {
  if (!completedAt) return item.updatedBy !== null;
  // Prisma @default(now()) + @updatedAt для новой строки дают равные значения, но у нас
  // completedAt устанавливается на POST и обычно на несколько мс раньше строки items.
  // Считаем правкой, если разница > 2 сек ИЛИ есть updatedBy.
  if (item.updatedBy !== null) return true;
  return new Date(item.updatedAt).getTime() - new Date(completedAt).getTime() > 2000;
}

export function InventorySessionDetailPage({ sessionId }: { sessionId: string }): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const { notify, view: snack } = useNotify();
  const canEdit = user?.role === 'admin';

  const [state, setState] = React.useState<{ loading: boolean; error: string | null; data: InventorySessionDetail | null }>({
    loading: true, error: null, data: null,
  });

  const [edit, setEdit] = React.useState<{
    open: boolean;
    item: InventorySessionDetailItem | null;
    value: string;
    saving: boolean;
    error: string | null;
  }>({ open: false, item: null, value: '', saving: false, error: null });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await inventoryApi.getSession(sessionId);
    if (error) setState({ loading: false, error: error.message, data: null });
    else setState({ loading: false, error: null, data: data ?? null });
  }, [sessionId]);

  React.useEffect(() => { void load(); }, [load]);

  const openEdit = (item: InventorySessionDetailItem): void => {
    setEdit({ open: true, item, value: formatQty(item.quantity), saving: false, error: null });
  };
  const closeEdit = (): void => setEdit((s) => ({ ...s, open: false }));

  const submitEdit = async (): Promise<void> => {
    if (!edit.item || edit.saving) return;
    const raw = edit.value.trim().replace(',', '.');
    if (raw === '' || !/^\d+(\.\d{1,3})?$/.test(raw)) {
      setEdit((s) => ({ ...s, error: 'Введите число (до 3 знаков после запятой)' }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setEdit((s) => ({ ...s, error: 'Количество не может быть отрицательным' }));
      return;
    }
    setEdit((s) => ({ ...s, saving: true, error: null }));
    const { data, error } = await inventoryApi.updateItem(sessionId, edit.item.id, n);
    if (error) {
      setEdit((s) => ({ ...s, saving: false, error: error.message }));
      notify(error.message, 'error');
      return;
    }
    setState((s) => ({ ...s, data: data ?? s.data }));
    setEdit({ open: false, item: null, value: '', saving: false, error: null });
    notify('Позиция обновлена');
  };

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
        <Button onClick={() => router.push(paths.dashboard.inventory)}>К списку зон</Button>
      </Stack>
    );
  }
  if (!state.data) return <Typography variant="body2">Нет данных</Typography>;

  const s = state.data;
  const totalUnits = s.items.reduce((sum, it) => sum + Number(it.quantity), 0);

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button size="small" onClick={() => router.push(paths.dashboard.inventoryZoneHistory(s.zone.id))}>← История</Button>
          <Typography variant="h5">
            {formatInventoryNumber(s.sequenceNumber)} — {s.zone.name}
          </Typography>
          <Chip
            size="small"
            label={s.status === 'COMPLETED' ? 'Завершена' : s.status === 'DRAFT' ? 'Черновик' : 'Отменена'}
            color={s.status === 'COMPLETED' ? 'success' : s.status === 'DRAFT' ? 'default' : 'error'}
          />
        </Stack>

        <Card>
          <CardContent>
            <Meta items={[
              { label: 'Номер', value: <Box component="span" sx={{ fontWeight: 700 }}>{formatInventoryNumber(s.sequenceNumber)}</Box> },
              { label: 'Зона', value: s.zone.name },
              { label: 'Завершена', value: s.completedAt ? formatDateTime(s.completedAt) : '—' },
              {
                label: 'Кто провёл',
                value: (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{s.createdBy.name}</span>
                    <Chip
                      size="small"
                      label={ROLE_LABELS[s.createdBy.role] ?? s.createdBy.role}
                      color={ROLE_COLORS[s.createdBy.role] ?? 'default'}
                    />
                  </Stack>
                ),
              },
              { label: 'Позиций', value: s.items.length },
            ]} />
          </CardContent>
        </Card>

        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Категория</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell align="right">Количество</TableCell>
                  <TableCell>Единица</TableCell>
                  {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {s.items.map((it) => {
                  const edited = isItemEdited(it, s.completedAt);
                  return (
                    <TableRow key={it.id}>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {it.category?.name ?? '—'}
                      </TableCell>
                      <TableCell>{it.name}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                          <span>{formatQty(it.quantity)}</span>
                          {edited ? (
                            <Tooltip title={
                              it.updatedBy
                                ? `Исправлено: ${it.updatedBy.name} (${ROLE_LABELS[it.updatedBy.role] ?? it.updatedBy.role}), ${formatDateTime(it.updatedAt)}`
                                : `Изменено: ${formatDateTime(it.updatedAt)}`
                            }>
                              <Chip size="small" label="исправлено" color="warning" variant="outlined" sx={{ height: 20 }} />
                            </Tooltip>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>{unitLabels[it.unit]}</TableCell>
                      {canEdit ? (
                        <TableCell align="right">
                          <Tooltip title="Исправить количество">
                            <IconButton size="small" onClick={() => openEdit(it)}><PencilSimpleIcon /></IconButton>
                          </Tooltip>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              Всего позиций: {s.items.length} · Суммарно (базовые единицы): {formatQty(String(totalUnits))}
            </Typography>
          </Box>
        </Card>
      </Stack>

      <Dialog open={edit.open} onClose={edit.saving ? undefined : closeEdit} fullWidth maxWidth="xs">
        <DialogTitle>Исправить количество</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {edit.item ? (
              <Typography variant="body2" color="text.secondary">
                {edit.item.name} · было <b>{formatQty(edit.item.quantity)}</b> {unitLabels[edit.item.unit]}
              </Typography>
            ) : null}
            <TextField
              autoFocus
              label={`Новое количество${edit.item ? `, ${unitLabels[edit.item.unit]}` : ''}`}
              value={edit.value}
              onChange={(e) => setEdit((s) => ({ ...s, value: e.target.value, error: null }))}
              inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
              error={Boolean(edit.error)}
              helperText={edit.error ?? 'Изменение будет зафиксировано с вашим именем'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={edit.saving}>Отмена</Button>
          <Button variant="contained" onClick={submitEdit} disabled={edit.saving}>
            {edit.saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack}
    </>
  );
}
