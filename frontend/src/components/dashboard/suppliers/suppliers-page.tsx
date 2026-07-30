'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
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
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';

import type { CreateSupplierPayload, Supplier, UpdateSupplierPayload } from '@/types/supplier';
import { suppliersApi } from '@/lib/api/suppliers';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';
import { SupplierDialog } from './supplier-dialog';

type ActiveFilter = 'all' | 'active' | 'inactive';

export function SuppliersPage(): React.JSX.Element {
  const { user } = useUser();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();

  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>('all');
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Supplier[] }>({
    loading: true, error: null, items: [],
  });

  const [dialog, setDialog] = React.useState<{
    open: boolean; mode: 'create' | 'edit'; supplier: Supplier | null;
    saving: boolean; error: string | null;
  }>({ open: false, mode: 'create', supplier: null, saving: false, error: null });

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await suppliersApi.list({
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      search: search || undefined,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [activeFilter, search]);

  React.useEffect(() => { void load(); }, [load]);

  const openCreate = (): void =>
    setDialog({ open: true, mode: 'create', supplier: null, saving: false, error: null });

  const openEdit = (s: Supplier): void =>
    setDialog({ open: true, mode: 'edit', supplier: s, saving: false, error: null });

  const closeDialog = (): void => setDialog((d) => ({ ...d, open: false, error: null }));

  const submit = async (payload: CreateSupplierPayload | UpdateSupplierPayload): Promise<void> => {
    setDialog((d) => ({ ...d, saving: true, error: null }));
    const { error } = dialog.mode === 'create'
      ? await suppliersApi.create(payload as CreateSupplierPayload)
      : await suppliersApi.update(dialog.supplier!.id, payload as UpdateSupplierPayload);
    setDialog((d) => ({ ...d, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Поставщик сохранён');
    setDialog((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (s: Supplier): void => {
    if (s.isActive) {
      confirm({
        title: 'Деактивировать поставщика',
        message: `Деактивировать поставщика «${s.name}»? Поставщик останется в справочнике и истории, но его нельзя будет использовать в новых операциях.`,
        danger: true,
        onConfirm: async () => {
          const { error } = await suppliersApi.update(s.id, { isActive: false });
          if (error) { notify(error.message, 'error'); return; }
          notify('Поставщик деактивирован');
          await load();
        },
      });
    } else {
      confirm({
        title: 'Активировать поставщика',
        message: `Активировать поставщика «${s.name}»?`,
        onConfirm: async () => {
          const { error } = await suppliersApi.update(s.id, { isActive: true });
          if (error) { notify(error.message, 'error'); return; }
          notify('Поставщик активирован');
          await load();
        },
      });
    }
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Поставщики</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>Добавить поставщика</Button> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Поиск по названию, контакту, телефону или email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 320 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Активность</InputLabel>
            <Select
              label="Активность"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
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
              <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">Повторить</Button>}>
                {state.error}
              </Alert>
            </Box>
          ) : state.items.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">Ничего не найдено</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Название</TableCell>
                    <TableCell>Контактное лицо</TableCell>
                    <TableCell>Телефон</TableCell>
                    <TableCell>Email</TableCell>
                    {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.items.map((s) => (
                    <TableRow
                      key={s.id}
                      sx={{
                        bgcolor: s.isActive ? 'inherit' : 'action.hover',
                        opacity: s.isActive ? 1 : 0.72,
                      }}
                    >
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.contactPerson ?? '—'}</TableCell>
                      <TableCell>{s.phone ?? '—'}</TableCell>
                      <TableCell>{s.email ?? '—'}</TableCell>
                      {canEdit ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Редактировать"><IconButton size="small" onClick={() => openEdit(s)}><PencilSimpleIcon /></IconButton></Tooltip>
                            <Tooltip title={s.isActive ? 'Деактивировать' : 'Активировать'}>
                              <IconButton size="small" color={s.isActive ? 'success' : 'error'} onClick={() => toggleActive(s)}>
                                {s.isActive ? <CheckCircleIcon /> : <ProhibitIcon />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Stack>

      <SupplierDialog
        open={dialog.open}
        mode={dialog.mode}
        supplier={dialog.supplier}
        saving={dialog.saving}
        serverError={dialog.error}
        onCancel={closeDialog}
        onSubmit={submit}
      />

      {snack}
      {confirmView}
    </>
  );
}
