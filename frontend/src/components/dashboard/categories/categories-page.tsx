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

import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';
import { categoriesApi } from '@/lib/api/categories';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';
import { CategoryDialog } from './category-dialog';

type ActiveFilter = 'all' | 'active' | 'inactive';

export function CategoriesPage(): React.JSX.Element {
  const { user } = useUser();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();

  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>('all');
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Category[] }>({
    loading: true, error: null, items: [],
  });

  const [dialog, setDialog] = React.useState<{
    open: boolean; mode: 'create' | 'edit'; category: Category | null;
    saving: boolean; error: string | null;
  }>({ open: false, mode: 'create', category: null, saving: false, error: null });

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await categoriesApi.list({
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      search: search || undefined,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [activeFilter, search]);

  React.useEffect(() => { void load(); }, [load]);

  const openCreate = (): void =>
    setDialog({ open: true, mode: 'create', category: null, saving: false, error: null });

  const openEdit = (c: Category): void =>
    setDialog({ open: true, mode: 'edit', category: c, saving: false, error: null });

  const closeDialog = (): void => setDialog((d) => ({ ...d, open: false, error: null }));

  const submit = async (payload: CreateCategoryInput | UpdateCategoryInput): Promise<void> => {
    setDialog((d) => ({ ...d, saving: true, error: null }));
    const { error } = dialog.mode === 'create'
      ? await categoriesApi.create(payload as CreateCategoryInput)
      : await categoriesApi.update(dialog.category!.id, payload as UpdateCategoryInput);
    setDialog((d) => ({ ...d, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Категория сохранена');
    setDialog((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (c: Category): void => {
    if (c.isActive) {
      confirm({
        title: 'Деактивировать категорию',
        message: `Деактивировать категорию «${c.name}»? Категория останется в системе и может быть активирована повторно.`,
        danger: true,
        onConfirm: async () => {
          const { error } = await categoriesApi.update(c.id, { isActive: false });
          if (error) { notify(error.message, 'error'); return; }
          notify('Категория деактивирована');
          await load();
        },
      });
    } else {
      confirm({
        title: 'Активировать категорию',
        message: `Активировать категорию «${c.name}»?`,
        onConfirm: async () => {
          const { error } = await categoriesApi.update(c.id, { isActive: true });
          if (error) { notify(error.message, 'error'); return; }
          notify('Категория активирована');
          await load();
        },
      });
    }
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Категории</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>Добавить категорию</Button> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Поиск по названию или описанию"
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
                    <TableCell>Описание</TableCell>
                    {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.items.map((c) => (
                    <TableRow
                      key={c.id}
                      sx={{
                        bgcolor: c.isActive ? 'inherit' : 'action.hover',
                        opacity: c.isActive ? 1 : 0.72,
                      }}
                    >
                      <TableCell>{c.name}</TableCell>
                      <TableCell sx={{ maxWidth: 480, whiteSpace: 'pre-wrap' }}>{c.description ?? '—'}</TableCell>
                      {canEdit ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Редактировать"><IconButton size="small" onClick={() => openEdit(c)}><PencilSimpleIcon /></IconButton></Tooltip>
                            <Tooltip title={c.isActive ? 'Деактивировать' : 'Активировать'}>
                              <IconButton size="small" color={c.isActive ? 'success' : 'error'} onClick={() => toggleActive(c)}>
                                {c.isActive ? <CheckCircleIcon /> : <ProhibitIcon />}
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

      <CategoryDialog
        open={dialog.open}
        mode={dialog.mode}
        category={dialog.category}
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
