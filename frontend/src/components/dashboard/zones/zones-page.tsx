'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
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
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { Zone, ZoneDetail } from '@/types/zone';
import type { User } from '@/types/user';
import { zonesApi } from '@/lib/api/zones';
import { usersApi } from '@/lib/api/users';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';

export function ZonesPage(): React.JSX.Element {
  const { user } = useUser();
  const canEdit = user?.role === 'admin';
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();

  const [search, setSearch] = React.useState('');
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Zone[] }>({
    loading: true, error: null, items: [],
  });

  const [edit, setEdit] = React.useState<{
    open: boolean; mode: 'create' | 'edit'; id?: string;
    form: { name: string; description: string; isActive: boolean };
    saving: boolean; error: string | null;
  }>({ open: false, mode: 'create', form: { name: '', description: '', isActive: true }, saving: false, error: null });

  const [assign, setAssign] = React.useState<{
    open: boolean; zone: ZoneDetail | null; loading: boolean;
    candidates: User[]; selected: User | null; isResponsible: boolean; saving: boolean; error: string | null;
  }>({ open: false, zone: null, loading: false, candidates: [], selected: null, isResponsible: false, saving: false, error: null });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await zonesApi.list({
      isActive: activeOnly ? true : undefined,
      search: search.trim() || undefined,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [activeOnly, search]);

  React.useEffect(() => { void load(); }, [load]);

  const openCreate = (): void =>
    setEdit({ open: true, mode: 'create', form: { name: '', description: '', isActive: true }, saving: false, error: null });

  const openEdit = (z: Zone): void =>
    setEdit({
      open: true, mode: 'edit', id: z.id,
      form: { name: z.name, description: z.description ?? '', isActive: z.isActive },
      saving: false, error: null,
    });

  const closeEdit = (): void => setEdit((d) => ({ ...d, open: false }));

  const submitEdit = async (): Promise<void> => {
    const name = edit.form.name.trim();
    if (!name) { setEdit((d) => ({ ...d, error: 'Название обязательно' })); return; }
    setEdit((d) => ({ ...d, saving: true, error: null }));
    const desc = edit.form.description.trim();
    const { error } = edit.mode === 'create'
      ? await zonesApi.create({ name, description: desc || null })
      : await zonesApi.update(edit.id!, { name, description: desc || null, isActive: edit.form.isActive });
    setEdit((d) => ({ ...d, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Зона сохранена');
    setEdit((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (z: Zone): void => {
    confirm({
      title: z.isActive ? 'Деактивировать зону' : 'Активировать зону',
      message: `${z.isActive ? 'Деактивировать' : 'Активировать'} зону «${z.name}»?`,
      danger: z.isActive,
      onConfirm: async () => {
        const { error } = await zonesApi.update(z.id, { isActive: !z.isActive });
        if (error) { notify(error.message, 'error'); return; }
        notify('Статус обновлён');
        await load();
      },
    });
  };

  const openAssign = async (z: Zone): Promise<void> => {
    setAssign({ open: true, zone: null, loading: true, candidates: [], selected: null, isResponsible: false, saving: false, error: null });
    const [{ data: detail, error: e1 }, { data: allUsers, error: e2 }] = await Promise.all([
      zonesApi.get(z.id),
      usersApi.list({ isActive: true }),
    ]);
    if (e1 || e2) {
      setAssign((s) => ({ ...s, loading: false, error: (e1 ?? e2)?.message ?? 'Ошибка загрузки' }));
      return;
    }
    const assignedIds = new Set((detail?.assignments ?? []).map((a) => a.userId));
    const candidates = (allUsers ?? []).filter((u) => !assignedIds.has(u.id));
    setAssign((s) => ({ ...s, loading: false, zone: detail ?? null, candidates }));
  };

  const closeAssign = (): void => setAssign((s) => ({ ...s, open: false }));

  const addAssignment = async (): Promise<void> => {
    if (!assign.zone || !assign.selected) return;
    setAssign((s) => ({ ...s, saving: true, error: null }));
    const { error } = await zonesApi.assign(assign.zone.id, {
      userId: assign.selected.id,
      isResponsible: assign.isResponsible,
    });
    if (error) {
      setAssign((s) => ({ ...s, saving: false, error: error.message }));
      notify(error.message, 'error');
      return;
    }
    notify('Сотрудник назначен');
    await openAssign(assign.zone);
    setAssign((s) => ({ ...s, saving: false, selected: null, isResponsible: false }));
    await load();
  };

  const toggleResponsible = async (userId: string, isResponsible: boolean): Promise<void> => {
    if (!assign.zone) return;
    const { error } = await zonesApi.updateAssignment(assign.zone.id, userId, isResponsible);
    if (error) { notify(error.message, 'error'); return; }
    notify('Обновлено');
    await openAssign(assign.zone);
    await load();
  };

  const removeAssignment = (userId: string, name: string): void => {
    if (!assign.zone) return;
    const zoneId = assign.zone.id;
    confirm({
      title: 'Снять назначение',
      message: `Снять пользователя «${name}» с зоны?`,
      danger: true,
      onConfirm: async () => {
        const { error } = await zonesApi.unassign(zoneId, userId);
        if (error) { notify(error.message, 'error'); return; }
        notify('Назначение удалено');
        await openAssign(assign.zone!);
        await load();
      },
    });
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Зоны</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>Добавить зону</Button> : null}
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
            <Box sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">Ничего не найдено</Typography></Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Сотрудников</TableCell>
                  <TableCell align="right">Ответственных</TableCell>
                  {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {state.items.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell>{z.name}</TableCell>
                    <TableCell>{z.description ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={z.isActive ? 'Активна' : 'Неактивна'} color={z.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">{z.usersCount}</TableCell>
                    <TableCell align="right">{z.responsibleCount}</TableCell>
                    {canEdit ? (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Назначения">
                            <IconButton size="small" onClick={() => openAssign(z)}><UsersIcon /></IconButton>
                          </Tooltip>
                          <Tooltip title="Редактировать">
                            <IconButton size="small" onClick={() => openEdit(z)}><PencilSimpleIcon /></IconButton>
                          </Tooltip>
                          <Button size="small" onClick={() => toggleActive(z)}>
                            {z.isActive ? 'Деактивировать' : 'Активировать'}
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

      <Dialog open={edit.open} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>{edit.mode === 'create' ? 'Новая зона' : 'Редактирование зоны'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Название" required fullWidth autoFocus
              value={edit.form.name}
              onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))}
              inputProps={{ maxLength: 100 }} />
            <TextField label="Описание" fullWidth multiline minRows={2}
              value={edit.form.description}
              onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, description: e.target.value } }))}
              inputProps={{ maxLength: 500 }} />
            {edit.mode === 'edit' ? (
              <Stack direction="row" alignItems="center">
                <Switch checked={edit.form.isActive}
                  onChange={(_, v) => setEdit((d) => ({ ...d, form: { ...d.form, isActive: v } }))} />
                <Typography variant="body2">{edit.form.isActive ? 'Активна' : 'Неактивна'}</Typography>
              </Stack>
            ) : null}
            {edit.error ? <Alert severity="error">{edit.error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={edit.saving}>Отмена</Button>
          <Button variant="contained" onClick={submitEdit} disabled={edit.saving}>
            {edit.saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assign.open} onClose={closeAssign} fullWidth maxWidth="sm">
        <DialogTitle>Назначения зоны «{assign.zone?.name ?? ''}»</DialogTitle>
        <DialogContent>
          {assign.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} /><Typography variant="body2">Загрузка…</Typography>
            </Box>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="subtitle2">Текущие назначения</Typography>
              {(assign.zone?.assignments ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">Никто не назначен</Typography>
              ) : (
                <Stack spacing={1}>
                  {assign.zone!.assignments.map((a) => (
                    <Stack key={a.userId} direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{a.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.email}</Typography>
                      </Box>
                      <Stack direction="row" alignItems="center">
                        <Switch checked={a.isResponsible} onChange={(_, v) => toggleResponsible(a.userId, v)} />
                        <Typography variant="caption">Ответственный</Typography>
                      </Stack>
                      <IconButton size="small" onClick={() => removeAssignment(a.userId, a.name)}>
                        <TrashIcon />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
              <Divider />
              <Typography variant="subtitle2">Добавить сотрудника</Typography>
              <Autocomplete
                options={assign.candidates}
                getOptionLabel={(u) => `${u.name} (${u.email})`}
                value={assign.selected}
                onChange={(_, v) => setAssign((s) => ({ ...s, selected: v }))}
                disabled={!assign.zone?.isActive}
                renderInput={(params) => <TextField {...params} label={assign.zone?.isActive ? 'Пользователь' : 'Зона неактивна'} />}
              />
              <Stack direction="row" alignItems="center">
                <Switch checked={assign.isResponsible} onChange={(_, v) => setAssign((s) => ({ ...s, isResponsible: v }))} />
                <Typography variant="body2">Ответственный</Typography>
              </Stack>
              {assign.error ? <Alert severity="error">{assign.error}</Alert> : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAssign}>Закрыть</Button>
          <Button variant="contained" onClick={addAssignment} disabled={!assign.selected || assign.saving || !assign.zone?.isActive}>
            {assign.saving ? 'Назначаю…' : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack}
      {confirmView}
    </>
  );
}
