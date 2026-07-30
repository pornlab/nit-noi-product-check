'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';

import type { Category } from '@/types/category';
import type { CreateProductInput, Product, UpdateProductInput } from '@/types/product';
import type { Unit } from '@/types/unit';
import type { Zone } from '@/types/zone';
import { unitLabels } from '@/types/unit';
import { categoriesApi } from '@/lib/api/categories';
import { productsApi } from '@/lib/api/products';
import { zonesApi } from '@/lib/api/zones';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';
import { ProductDialog } from './product-dialog';

type ActiveFilter = 'all' | 'active' | 'inactive';
type BoolFilter = 'all' | 'yes' | 'no';
const UNIT_VALUES: Unit[] = ['PIECE', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'PACK', 'BOX', 'BOTTLE', 'CAN', 'BAG'];

export function ProductsPage(): React.JSX.Element {
  const { user } = useUser();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();

  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>(''); // '', 'none', or category id
  const [zoneFilter, setZoneFilter] = React.useState<string>(''); // '' or zone id
  const [unitFilter, setUnitFilter] = React.useState<Unit | ''>('');
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>('all');
  const [trackedFilter, setTrackedFilter] = React.useState<BoolFilter>('all');
  const [purchFilter, setPurchFilter] = React.useState<BoolFilter>('all');

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Product[] }>({
    loading: true, error: null, items: [],
  });

  const [dialog, setDialog] = React.useState<{
    open: boolean; mode: 'create' | 'edit'; product: Product | null;
    saving: boolean; error: string | null;
  }>({ open: false, mode: 'create', product: null, saving: false, error: null });

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadCategories = React.useCallback(async () => {
    const { data } = await categoriesApi.list();
    if (data) setCategories(data);
  }, []);

  const loadZones = React.useCallback(async () => {
    const { data } = await zonesApi.list();
    if (data) setZones(data);
  }, []);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await productsApi.list({
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      zoneId: zoneFilter || undefined,
      baseUnit: unitFilter || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      isInventoryTracked: trackedFilter === 'all' ? undefined : trackedFilter === 'yes',
      isPurchasable: purchFilter === 'all' ? undefined : purchFilter === 'yes',
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [search, categoryFilter, zoneFilter, unitFilter, activeFilter, trackedFilter, purchFilter]);

  React.useEffect(() => { void loadCategories(); }, [loadCategories]);
  React.useEffect(() => { void loadZones(); }, [loadZones]);
  React.useEffect(() => { void load(); }, [load]);

  const openCreate = (): void =>
    setDialog({ open: true, mode: 'create', product: null, saving: false, error: null });

  const openEdit = (p: Product): void =>
    setDialog({ open: true, mode: 'edit', product: p, saving: false, error: null });

  const closeDialog = (): void => setDialog((d) => ({ ...d, open: false, error: null }));

  const submit = async (payload: CreateProductInput | UpdateProductInput): Promise<void> => {
    setDialog((d) => ({ ...d, saving: true, error: null }));
    const { error } = dialog.mode === 'create'
      ? await productsApi.create(payload as CreateProductInput)
      : await productsApi.update(dialog.product!.id, payload as UpdateProductInput);
    setDialog((d) => ({ ...d, saving: false, error: error ? error.message : null }));
    if (error) { notify(error.message, 'error'); return; }
    notify('Товар сохранён');
    setDialog((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (p: Product): void => {
    if (p.isActive) {
      confirm({
        title: 'Деактивировать товар',
        message: `Деактивировать товар «${p.name}»? Товар останется в системе и будет доступен в истории операций.`,
        danger: true,
        onConfirm: async () => {
          const { error } = await productsApi.update(p.id, { isActive: false });
          if (error) { notify(error.message, 'error'); return; }
          notify('Товар деактивирован');
          await load();
        },
      });
    } else {
      confirm({
        title: 'Активировать товар',
        message: `Активировать товар «${p.name}»?`,
        onConfirm: async () => {
          const { error } = await productsApi.update(p.id, { isActive: true });
          if (error) { notify(error.message, 'error'); return; }
          notify('Товар активирован');
          await load();
        },
      });
    }
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Товары</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>Добавить товар</Button> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Поиск (название, описание, SKU, штрихкод)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 320 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Категория</InputLabel>
            <Select
              label="Категория"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">Все категории</MenuItem>
              <MenuItem value="none">Без категории</MenuItem>
              {categories.filter((c) => c.isActive).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Зона</InputLabel>
            <Select
              label="Зона"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">Все зоны</MenuItem>
              {zones.filter((z) => z.isActive).map((z) => (
                <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Единица</InputLabel>
            <Select
              label="Единица"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as Unit | '')}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">Любая</MenuItem>
              {UNIT_VALUES.map((u) => <MenuItem key={u} value={u}>{unitLabels[u]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
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
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Инвентаризация</InputLabel>
            <Select
              label="Инвентаризация"
              value={trackedFilter}
              onChange={(e) => setTrackedFilter(e.target.value as BoolFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="yes">Участвует</MenuItem>
              <MenuItem value="no">Не участвует</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Закупки</InputLabel>
            <Select
              label="Закупки"
              value={purchFilter}
              onChange={(e) => setPurchFilter(e.target.value as BoolFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="yes">Закупается</MenuItem>
              <MenuItem value="no">Не закупается</MenuItem>
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
                    <TableCell>Категория</TableCell>
                    <TableCell>Зоны</TableCell>
                    <TableCell align="right">Остаток</TableCell>
                    <TableCell>Единица</TableCell>
                    {canEdit ? <TableCell align="right">Действия</TableCell> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.items.map((p) => (
                    <TableRow
                      key={p.id}
                      sx={{
                        bgcolor: p.isActive ? 'inherit' : 'action.hover',
                        opacity: p.isActive ? 1 : 0.72,
                      }}
                    >
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        {p.category ? (
                          <Box
                            component="button"
                            type="button"
                            onClick={() => setCategoryFilter(p.category!.id)}
                            sx={{
                              background: 'transparent',
                              border: 'none',
                              p: 0,
                              cursor: 'pointer',
                              color: categoryFilter === p.category.id ? 'primary.main' : 'inherit',
                              textDecoration: 'none',
                              fontSize: 'inherit',
                              fontFamily: 'inherit',
                              textAlign: 'left',
                              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                            }}
                          >
                            {p.category.name}{p.category.isActive ? '' : ' (неактивна)'}
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {(p.zones ?? []).length === 0 ? (
                          <Typography component="span" color="text.secondary">—</Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {(p.zones ?? []).map((z) => (
                              <Chip
                                key={z.id}
                                size="small"
                                label={z.name}
                                variant={zoneFilter === z.id ? 'filled' : 'outlined'}
                                color={zoneFilter === z.id ? 'primary' : 'default'}
                                onClick={() => setZoneFilter(z.id)}
                                sx={{ height: 22 }}
                              />
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <ProductStockCell qty={p.lastQuantity} at={p.lastInventoryAt} stock={p.lastStock} />
                      </TableCell>
                      <TableCell>{unitLabels[p.baseUnit]}</TableCell>
                      {canEdit ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Редактировать"><IconButton size="small" onClick={() => openEdit(p)}><PencilSimpleIcon /></IconButton></Tooltip>
                            <Tooltip title={p.isActive ? 'Деактивировать' : 'Активировать'}>
                              <IconButton size="small" color={p.isActive ? 'success' : 'error'} onClick={() => toggleActive(p)}>
                                {p.isActive ? <CheckCircleIcon /> : <ProhibitIcon />}
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

      <ProductDialog
        open={dialog.open}
        mode={dialog.mode}
        product={dialog.product}
        categories={categories}
        zones={zones}
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

function formatQty(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function ProductStockCell({
  qty, at, stock,
}: {
  qty: string | null;
  at: string | null;
  stock: import('@/types/product').ProductStockZoneEntry[];
}): React.JSX.Element {
  if (qty === null || at === null) {
    return <Typography component="span" color="text.secondary">—</Typography>;
  }
  const tooltipContent = (
    <Box>
      <Box sx={{ fontWeight: 600, mb: stock.length > 0 ? 0.5 : 0 }}>{formatDateTime(at)}</Box>
      {stock.map((s) => (
        <Box key={s.zoneId}>
          {s.zoneName}: {formatQty(s.quantity)}
        </Box>
      ))}
    </Box>
  );
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
      <Typography component="span">{formatQty(qty)}</Typography>
      <Tooltip title={tooltipContent} enterTouchDelay={0} arrow>
        <InfoIcon size={14} color="var(--mui-palette-text-secondary, #8B909B)" style={{ cursor: 'help' }} />
      </Tooltip>
    </Stack>
  );
}
