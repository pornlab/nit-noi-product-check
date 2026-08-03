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
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
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
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { KeyIcon } from '@phosphor-icons/react/dist/ssr/Key';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';

import type { Position } from '@/types/position';
import type { User, UserRole } from '@/types/user';
import type { Zone } from '@/types/zone';
import { positionsApi } from '@/lib/api/positions';
import { usersApi } from '@/lib/api/users';
import { zonesApi } from '@/lib/api/zones';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';

const roleLabels: Record<UserRole, string> = { admin: 'Администратор', manager: 'Менеджер', employee: 'Сотрудник', analytics: 'Аналитика' };
const roleOptions: UserRole[] = ['admin', 'manager', 'employee', 'analytics'];

export function UsersPage(): React.JSX.Element {
  const { user: current } = useUser();
  const canEdit = current?.role === 'admin';
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<UserRole | ''>('');
  const [positionFilter, setPositionFilter] = React.useState<string>('');
  const [zoneFilter, setZoneFilter] = React.useState<string>('');
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'active' | 'inactive'>('all');

  const [positions, setPositions] = React.useState<Position[]>([]);
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: User[] }>({
    loading: true, error: null, items: [],
  });

  const [edit, setEdit] = React.useState<{
    open: boolean; mode: 'create' | 'edit'; id?: string;
    form: { name: string; email: string; password: string; role: UserRole; positionId: string; isActive: boolean };
    saving: boolean; error: string | null;
  }>({ open: false, mode: 'create', form: { name: '', email: '', password: '', role: 'employee', positionId: '', isActive: true }, saving: false, error: null });

  const [password, setPassword] = React.useState<{ open: boolean; id?: string; name?: string; value: string; saving: boolean; error: string | null }>(
    { open: false, value: '', saving: false, error: null },
  );

  const [zoneDlg, setZoneDlg] = React.useState<{
    open: boolean; user: User | null; loading: boolean; saving: boolean; error: string | null;
    picks: Record<string, { checked: boolean; isResponsible: boolean }>;
  }>({ open: false, user: null, loading: false, saving: false, error: null, picks: {} });

  const loadPositions = React.useCallback(async () => {
    const { data } = await positionsApi.list();
    if (data) setPositions(data);
  }, []);
  const loadZones = React.useCallback(async () => {
    const { data } = await zonesApi.list();
    if (data) setZones(data);
  }, []);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await usersApi.list({
      role: roleFilter || undefined,
      positionId: positionFilter || undefined,
      zoneId: zoneFilter || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      search: search.trim() || undefined,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [roleFilter, positionFilter, zoneFilter, activeFilter, search]);

  React.useEffect(() => { void loadPositions(); void loadZones(); }, [loadPositions, loadZones]);
  React.useEffect(() => { void load(); }, [load]);

  const openCreate = (): void => setEdit({
    open: true, mode: 'create',
    form: { name: '', email: '', password: '', role: 'employee', positionId: '', isActive: true },
    saving: false, error: null,
  });

  const openEdit = (u: User): void => setEdit({
    open: true, mode: 'edit', id: u.id,
    form: { name: u.name, email: u.email, password: '', role: u.role, positionId: u.position?.id ?? '', isActive: u.isActive },
    saving: false, error: null,
  });

  const closeEdit = (): void => setEdit((d) => ({ ...d, open: false }));

  const submitEdit = async (): Promise<void> => {
    const name = edit.form.name.trim();
    const email = edit.form.email.trim();
    if (!name) { setEdit((d) => ({ ...d, error: 'Имя обязательно' })); return; }
    if (edit.mode === 'create') {
      if (!email) { setEdit((d) => ({ ...d, error: 'Email обязателен' })); return; }
      if (edit.form.password.length < 6) { setEdit((d) => ({ ...d, error: 'Пароль минимум 6 символов' })); return; }
    }
    setEdit((d) => ({ ...d, saving: true, error: null }));
    const positionId = edit.form.positionId || null;
    const { error } = edit.mode === 'create'
      ? await usersApi.create({ name, email, password: edit.form.password, role: edit.form.role, positionId, isActive: edit.form.isActive })
      : await usersApi.update(edit.id!, { name, role: edit.form.role, positionId, isActive: edit.form.isActive });
    setEdit((d) => ({ ...d, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Пользователь сохранён');
    setEdit((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (u: User): void => {
    confirm({
      title: u.isActive ? 'Деактивировать пользователя' : 'Активировать пользователя',
      message: `${u.isActive ? 'Деактивировать' : 'Активировать'} пользователя «${u.name}»?`,
      danger: u.isActive,
      onConfirm: async () => {
        const { error } = await usersApi.update(u.id, { isActive: !u.isActive });
        if (error) { notify(error.message, 'error'); return; }
        notify('Статус обновлён');
        await load();
      },
    });
  };

  const openPassword = (u: User): void =>
    setPassword({ open: true, id: u.id, name: u.name, value: '', saving: false, error: null });

  const submitPassword = async (): Promise<void> => {
    if (password.value.length < 6) { setPassword((s) => ({ ...s, error: 'Пароль минимум 6 символов' })); return; }
    setPassword((s) => ({ ...s, saving: true, error: null }));
    const { error } = await usersApi.changePassword(password.id!, password.value);
    setPassword((s) => ({ ...s, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Пароль обновлён');
    setPassword({ open: false, value: '', saving: false, error: null });
  };

  const openZoneDlg = async (u: User): Promise<void> => {
    setZoneDlg({ open: true, user: u, loading: true, saving: false, error: null, picks: {} });
    const { data: fresh, error } = await usersApi.get(u.id);
    if (error) { setZoneDlg((s) => ({ ...s, loading: false, error: error.message })); return; }
    const map: Record<string, { checked: boolean; isResponsible: boolean }> = {};
    for (const z of zones) map[z.id] = { checked: false, isResponsible: false };
    for (const z of fresh?.zones ?? []) {
      map[z.id] = { checked: true, isResponsible: z.isResponsible };
    }
    setZoneDlg((s) => ({ ...s, loading: false, picks: map, user: fresh ?? u }));
  };

  const submitZones = async (): Promise<void> => {
    if (!zoneDlg.user) return;
    setZoneDlg((s) => ({ ...s, saving: true, error: null }));
    const payload = Object.entries(zoneDlg.picks)
      .filter(([, v]) => v.checked)
      .map(([zoneId, v]) => ({ zoneId, isResponsible: v.isResponsible }));
    const { error } = await usersApi.replaceZones(zoneDlg.user.id, payload);
    setZoneDlg((s) => ({ ...s, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Зоны обновлены');
    setZoneDlg((s) => ({ ...s, open: false }));
    await load();
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Пользователи</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>Добавить пользователя</Button> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField size="small" placeholder="Поиск (имя или email)" value={search} onChange={(e) => setSearch(e.target.value)} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Роль</InputLabel>
            <Select label="Роль" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}>
              <MenuItem value="">Любая</MenuItem>
              {roleOptions.map((r) => <MenuItem key={r} value={r}>{roleLabels[r]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Должность</InputLabel>
            <Select label="Должность" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
              <MenuItem value="">Любая</MenuItem>
              {positions.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Зона</InputLabel>
            <Select label="Зона" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <MenuItem value="">Любая</MenuItem>
              {zones.map((z) => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Активность</InputLabel>
            <Select label="Активность" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}>
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="inactive">Неактивные</MenuItem>
            </Select>
          </FormControl>
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
                  <TableCell>Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Должность</TableCell>
                  <TableCell>Зоны</TableCell>
                  <TableCell>Статус</TableCell>
                  {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {state.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip size="small" label={roleLabels[u.role]}
                        color={u.role === 'admin' ? 'error' : u.role === 'manager' ? 'warning' : 'info'} />
                    </TableCell>
                    <TableCell>{u.position?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {(u.zones ?? []).length === 0 ? '—' :
                          (u.zones ?? []).map((z) => (
                            <Tooltip key={z.id} title={z.isResponsible ? 'Ответственный' : ''}>
                              <Chip
                                size="small"
                                label={z.isResponsible ? `★ ${z.name}` : z.name}
                                variant="outlined"
                              />
                            </Tooltip>
                          ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.isActive ? 'Активен' : 'Неактивен'}
                        variant="outlined"
                        color={u.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    {canEdit ? (
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Редактировать"><IconButton size="small" onClick={() => openEdit(u)}><PencilSimpleIcon /></IconButton></Tooltip>
                          <Tooltip title="Пароль"><IconButton size="small" onClick={() => openPassword(u)}><KeyIcon /></IconButton></Tooltip>
                          <Tooltip title="Зоны"><IconButton size="small" onClick={() => openZoneDlg(u)}><MapPinIcon /></IconButton></Tooltip>
                          <Tooltip title={u.isActive ? 'Деактивировать' : 'Активировать'}>
                            <IconButton size="small" color={u.isActive ? 'success' : 'error'} onClick={() => toggleActive(u)}>
                              {u.isActive ? <CheckCircleIcon /> : <ProhibitIcon />}
                            </IconButton>
                          </Tooltip>
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
        <DialogTitle>{edit.mode === 'create' ? 'Новый пользователь' : 'Редактирование пользователя'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Имя" required fullWidth autoFocus value={edit.form.name}
              onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} />
            <TextField label="Email" required fullWidth type="email" value={edit.form.email}
              onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, email: e.target.value } }))}
              disabled={edit.mode === 'edit'} />
            {edit.mode === 'create' ? (
              <TextField label="Пароль" required fullWidth type="password" value={edit.form.password}
                onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, password: e.target.value } }))} />
            ) : null}
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select label="Роль" value={edit.form.role} onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, role: e.target.value as UserRole } }))}>
                {roleOptions.map((r) => <MenuItem key={r} value={r}>{roleLabels[r]}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Должность</InputLabel>
              <Select label="Должность" value={edit.form.positionId}
                onChange={(e) => setEdit((d) => ({ ...d, form: { ...d.form, positionId: e.target.value } }))}>
                <MenuItem value=""><em>Без должности</em></MenuItem>
                {positions.filter((p) => p.isActive || p.id === edit.form.positionId).map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}{p.isActive ? '' : ' (неактивна)'}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" alignItems="center">
              <Switch checked={edit.form.isActive} onChange={(_, v) => setEdit((d) => ({ ...d, form: { ...d.form, isActive: v } }))} />
              <Typography variant="body2">{edit.form.isActive ? 'Активен' : 'Неактивен'}</Typography>
            </Stack>
            {edit.error ? <Alert severity="error">{edit.error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={edit.saving}>Отмена</Button>
          <Button variant="contained" onClick={submitEdit} disabled={edit.saving}>{edit.saving ? 'Сохранение…' : 'Сохранить'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={password.open} onClose={() => setPassword((s) => ({ ...s, open: false }))} fullWidth maxWidth="xs">
        <DialogTitle>Сменить пароль — {password.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Новый пароль" fullWidth type="password" value={password.value}
              onChange={(e) => setPassword((s) => ({ ...s, value: e.target.value }))} />
            {password.error ? <Alert severity="error">{password.error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPassword((s) => ({ ...s, open: false }))} disabled={password.saving}>Отмена</Button>
          <Button variant="contained" onClick={submitPassword} disabled={password.saving}>
            {password.saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={zoneDlg.open} onClose={() => setZoneDlg((s) => ({ ...s, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>Назначения — {zoneDlg.user?.name}</DialogTitle>
        <DialogContent>
          {zoneDlg.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} /><Typography variant="body2">Загрузка…</Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {zones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Нет доступных зон</Typography>
              ) : zones.map((z) => {
                const pick = zoneDlg.picks[z.id] ?? { checked: false, isResponsible: false };
                const disabled = !z.isActive && !pick.checked;
                return (
                  <Stack key={z.id} direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{z.name}{z.isActive ? '' : ' (неактивна)'}</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center">
                      <Switch checked={pick.checked} disabled={disabled}
                        onChange={(_, v) => setZoneDlg((s) => ({ ...s, picks: { ...s.picks, [z.id]: { ...pick, checked: v } } }))} />
                      <Typography variant="caption">Назначен</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center">
                      <Switch checked={pick.isResponsible} disabled={!pick.checked}
                        onChange={(_, v) => setZoneDlg((s) => ({ ...s, picks: { ...s.picks, [z.id]: { ...pick, isResponsible: v } } }))} />
                      <Typography variant="caption">Ответственный</Typography>
                    </Stack>
                  </Stack>
                );
              })}
              {zoneDlg.error ? <Alert severity="error">{zoneDlg.error}</Alert> : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoneDlg((s) => ({ ...s, open: false }))} disabled={zoneDlg.saving}>Отмена</Button>
          <Button variant="contained" onClick={submitZones} disabled={zoneDlg.saving}>
            {zoneDlg.saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack}
      {confirmView}
    </>
  );
}
