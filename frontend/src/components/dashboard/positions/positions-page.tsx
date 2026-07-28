'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

import type { Position } from '@/types/position';
import { positionsApi } from '@/lib/api/positions';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';

export function PositionsPage(): React.JSX.Element {
  const { user } = useUser();
  const canEdit = user?.role === 'admin';
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();

  const [search, setSearch] = React.useState('');
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Position[] }>({
    loading: true, error: null, items: [],
  });

  const [dialog, setDialog] = React.useState<{
    open: boolean; mode: 'create' | 'edit'; id?: string;
    form: { name: string; description: string; isActive: boolean };
    saving: boolean; error: string | null;
  }>({ open: false, mode: 'create', form: { name: '', description: '', isActive: true }, saving: false, error: null });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await positionsApi.list({
      isActive: activeOnly ? true : undefined,
      search: search.trim() || undefined,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [activeOnly, search]);

  React.useEffect(() => { void load(); }, [load]);

  const openCreate = (): void =>
    setDialog({ open: true, mode: 'create', form: { name: '', description: '', isActive: true }, saving: false, error: null });

  const openEdit = (p: Position): void =>
    setDialog({
      open: true, mode: 'edit', id: p.id,
      form: { name: p.name, description: p.description ?? '', isActive: p.isActive },
      saving: false, error: null,
    });

  const closeDialog = (): void => setDialog((d) => ({ ...d, open: false }));

  const submit = async (): Promise<void> => {
    const name = dialog.form.name.trim();
    if (!name) { setDialog((d) => ({ ...d, error: 'Название обязательно' })); return; }
    setDialog((d) => ({ ...d, saving: true, error: null }));
    const desc = dialog.form.description.trim();
    const payload = { name, description: desc || null };
    const { error } = dialog.mode === 'create'
      ? await positionsApi.create(payload)
      : await positionsApi.update(dialog.id!, { ...payload, isActive: dialog.form.isActive });
    setDialog((d) => ({ ...d, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Должность сохранена');
    setDialog((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (p: Position): void => {
    confirm({
      title: p.isActive ? 'Деактивировать должность' : 'Активировать должность',
      message: `${p.isActive ? 'Деактивировать' : 'Активировать'} должность «${p.name}»?`,
      danger: p.isActive,
      onConfirm: async () => {
        const { error } = await positionsApi.update(p.id, { isActive: !p.isActive });
        if (error) { notify(error.message, 'error'); return; }
        notify('Статус обновлён');
        await load();
      },
    });
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Должности</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>Добавить должность</Button> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <TextField size="small" placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Stack direction="row" alignItems="center">
            <Switch checked={activeOnly} onChange={(_, v) => setActiveOnly(v)} />
            <Typography variant="body2">Только активные</Typography>
          </Stack>
        </Stack>

        <Card>
          {state.loading ? (
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} /><Typography variant="body2">Загрузка…</Typography>
            </Box>
          ) : state.error ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">Повторить</Button>}>{state.error}</Alert>
            </Box>
          ) : state.items.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">Ничего не найдено</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Сотрудников</TableCell>
                  {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {state.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.description ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={p.isActive ? 'Активна' : 'Неактивна'} color={p.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">{p.usersCount}</TableCell>
                    {canEdit ? (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Редактировать">
                            <IconButton size="small" onClick={() => openEdit(p)}><PencilSimpleIcon /></IconButton>
                          </Tooltip>
                          <Button size="small" onClick={() => toggleActive(p)}>
                            {p.isActive ? 'Деактивировать' : 'Активировать'}
                          </Button>
                        </Stack>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </Stack>

      <Dialog open={dialog.open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.mode === 'create' ? 'Новая должность' : 'Редактирование должности'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название"
              required fullWidth autoFocus
              value={dialog.form.name}
              onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Описание"
              fullWidth multiline minRows={2}
              value={dialog.form.description}
              onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, description: e.target.value } }))}
              inputProps={{ maxLength: 500 }}
            />
            {dialog.mode === 'edit' ? (
              <Stack direction="row" alignItems="center">
                <Switch checked={dialog.form.isActive}
                  onChange={(_, v) => setDialog((d) => ({ ...d, form: { ...d.form, isActive: v } }))} />
                <Typography variant="body2">{dialog.form.isActive ? 'Активна' : 'Неактивна'}</Typography>
              </Stack>
            ) : null}
            {dialog.error ? <Alert severity="error">{dialog.error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={dialog.saving}>Отмена</Button>
          <Button variant="contained" onClick={submit} disabled={dialog.saving}>
            {dialog.saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack}
      {confirmView}
    </>
  );
}
