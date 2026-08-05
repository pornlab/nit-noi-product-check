'use client';

import * as React from 'react';
import RouterLink from 'next/link';
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
import { alpha } from '@mui/material/styles';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';

import type { Category } from '@/types/category';
import type { CreateProductInput, Product, UpdateProductInput } from '@/types/product';
import type { Unit } from '@/types/unit';
import type { Zone } from '@/types/zone';
import { categoriesApi } from '@/lib/api/categories';
import { productsApi } from '@/lib/api/products';
import { zonesApi } from '@/lib/api/zones';
import { useNotify } from '@/lib/api/notify';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useUser } from '@/hooks/use-user';
import { useI18n } from '@/lib/i18n/provider';
import { paths } from '@/paths';
import { unitLabelKey } from '@/lib/i18n/unit';
import { ProductDialog } from './product-dialog';

type ActiveFilter = 'all' | 'active' | 'inactive';
type BoolFilter = 'all' | 'yes' | 'no';
type StockFilter = 'all' | 'below-optimal' | 'below-min';
const UNIT_VALUES: Unit[] = ['PIECE', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'PACK', 'BOX', 'BOTTLE', 'CAN', 'BAG'];

export function ProductsPage(): React.JSX.Element {
  const { user } = useUser();
  const { t } = useI18n();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canAnalytics = user?.role === 'admin' || user?.role === 'analytics';
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
  const [stockFilter, setStockFilter] = React.useState<StockFilter>('all');

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
    notify(t('products.savedNotify'));
    setDialog((d) => ({ ...d, open: false }));
    await load();
  };

  const toggleActive = (p: Product): void => {
    if (p.isActive) {
      confirm({
        title: t('products.confirmDeactivateTitle'),
        message: t('products.confirmDeactivateBody', { name: p.name }),
        danger: true,
        onConfirm: async () => {
          const { error } = await productsApi.update(p.id, { isActive: false });
          if (error) { notify(error.message, 'error'); return; }
          notify(t('products.deactivatedNotify'));
          await load();
        },
      });
    } else {
      confirm({
        title: t('products.confirmActivateTitle'),
        message: t('products.confirmActivateBody', { name: p.name }),
        onConfirm: async () => {
          const { error } = await productsApi.update(p.id, { isActive: true });
          if (error) { notify(error.message, 'error'); return; }
          notify(t('products.activatedNotify'));
          await load();
        },
      });
    }
  };

  const displayedItems = React.useMemo(() => {
    if (stockFilter === 'all') return state.items;
    return state.items.filter((p) => {
      const sev = stockSeverity(p);
      return stockFilter === 'below-min' ? sev === 'critical' : sev === 'critical' || sev === 'low';
    });
  }, [state.items, stockFilter]);

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">{t('products.pageTitle')}</Typography>
          <Box sx={{ flex: 1 }} />
          {canEdit ? <Button variant="contained" onClick={openCreate}>{t('products.addProduct')}</Button> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder={t('products.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 320 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('products.filterCategoryLabel')}</InputLabel>
            <Select
              label={t('products.filterCategoryLabel')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">{t('products.filterCategoryAll')}</MenuItem>
              <MenuItem value="none">{t('products.filterCategoryNone')}</MenuItem>
              {categories.filter((c) => c.isActive).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('products.filterZoneLabel')}</InputLabel>
            <Select
              label={t('products.filterZoneLabel')}
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">{t('products.filterZoneAll')}</MenuItem>
              {zones.filter((z) => z.isActive).map((z) => (
                <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('products.filterUnitLabel')}</InputLabel>
            <Select
              label={t('products.filterUnitLabel')}
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as Unit | '')}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">{t('products.filterUnitAny')}</MenuItem>
              {UNIT_VALUES.map((u) => <MenuItem key={u} value={u}>{t(unitLabelKey(u))}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('products.filterActiveLabel')}</InputLabel>
            <Select
              label={t('products.filterActiveLabel')}
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="all">{t('products.filterActiveAll')}</MenuItem>
              <MenuItem value="active">{t('products.filterActiveActive')}</MenuItem>
              <MenuItem value="inactive">{t('products.filterActiveInactive')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('products.filterInventoryLabel')}</InputLabel>
            <Select
              label={t('products.filterInventoryLabel')}
              value={trackedFilter}
              onChange={(e) => setTrackedFilter(e.target.value as BoolFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="all">{t('products.filterActiveAll')}</MenuItem>
              <MenuItem value="yes">{t('products.filterInventoryYes')}</MenuItem>
              <MenuItem value="no">{t('products.filterInventoryNo')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('products.filterStockLabel')}</InputLabel>
            <Select
              label={t('products.filterStockLabel')}
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="all">{t('products.filterStockAll')}</MenuItem>
              <MenuItem value="below-optimal">{t('products.filterStockBelowOptimal')}</MenuItem>
              <MenuItem value="below-min">{t('products.filterStockBelowMin')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('products.filterPurchaseLabel')}</InputLabel>
            <Select
              label={t('products.filterPurchaseLabel')}
              value={purchFilter}
              onChange={(e) => setPurchFilter(e.target.value as BoolFilter)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="all">{t('products.filterActiveAll')}</MenuItem>
              <MenuItem value="yes">{t('products.filterPurchaseYes')}</MenuItem>
              <MenuItem value="no">{t('products.filterPurchaseNo')}</MenuItem>
            </Select>
          </FormControl>
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
          ) : displayedItems.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">{t('products.empty')}</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('products.columnName')}</TableCell>
                    <TableCell>{t('products.columnZones')}</TableCell>
                    <TableCell align="right">{t('products.columnStock')}</TableCell>
                    <TableCell>{t('products.columnUnit')}</TableCell>
                    <TableCell align="right">{t('products.columnPrice')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('products.targetTooltip')}>
                        <span>{t('products.columnTarget')}</span>
                      </Tooltip>
                    </TableCell>
                    {canEdit ? <TableCell align="right">{t('products.columnActions')}</TableCell> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedItems.map((p) => {
                    const severity = stockSeverity(p);
                    return (
                    <TableRow
                      key={p.id}
                      sx={{
                        bgcolor: p.isActive
                          ? (severity === 'critical'
                            ? (t) => alpha(t.palette.error.main, 0.14)
                            : severity === 'low'
                            ? (t) => alpha(t.palette.warning.main, 0.18)
                            : 'inherit')
                          : 'action.hover',
                        opacity: p.isActive ? 1 : 0.72,
                      }}
                    >
                      <TableCell>
                        {canAnalytics ? (
                          <Typography
                            component={RouterLink}
                            href={paths.dashboard.productAnalytics(p.id)}
                            variant="body2"
                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {p.name}
                          </Typography>
                        ) : (
                          <Typography variant="body2">{p.name}</Typography>
                        )}
                        {p.category ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {p.category.name}{p.category.isActive ? '' : t('products.inactiveCategoryTag')}
                          </Typography>
                        ) : null}
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
                      <TableCell>{t(unitLabelKey(p.baseUnit))}</TableCell>
                      <TableCell align="right">
                        <ProductPriceCell
                          price={p.lastPrice}
                          at={p.lastPriceAt}
                          currency={p.lastPriceCurrency}
                          unit={t(unitLabelKey(p.baseUnit))}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <ProductStockTargetCell
                          min={p.minQuantity}
                          optimal={p.optimalQuantity}
                        />
                      </TableCell>
                      {canEdit ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => openEdit(p)}><PencilSimpleIcon /></IconButton></Tooltip>
                            <Tooltip title={p.isActive ? t('common.deactivate') : t('common.activate')}>
                              <IconButton size="small" color={p.isActive ? 'success' : 'error'} onClick={() => toggleActive(p)}>
                                {p.isActive ? <CheckCircleIcon /> : <ProhibitIcon />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      ) : null}
                    </TableRow>
                    );
                  })}
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
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day}.${month} ${time}`;
}

function formatDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
  return new Date(iso).toLocaleDateString('ru-RU');
}

function currencySymbol(code: string): string {
  switch (code.toUpperCase()) {
    case 'THB': { return '฿'; }
    case 'USD': { return '$'; }
    case 'EUR': { return '€'; }
    case 'RUB': { return '₽'; }
    default: { return code; }
  }
}

/**
 * Оценка «хватает ли товара» для подсветки строки.
 * Учитываем то, что видим на экране: последняя инвентаризация + приходы после неё.
 * Если инвентаризации нигде не было и приходов тоже — 'unknown', подсветку не рисуем.
 */
function stockSeverity(p: Product): 'unknown' | 'critical' | 'low' | 'ok' {
  const inv = p.lastQuantity === null ? null : Number(p.lastQuantity);
  const received = (p.lastStock ?? []).reduce((s, e) => s + (Number(e.receivedAfter) || 0), 0);
  const disposed = (p.lastStock ?? []).reduce((s, e) => s + (Number(e.disposedAfter) || 0), 0);
  if (inv === null && received === 0 && disposed === 0) return 'unknown';
  const current = (inv ?? 0) + received - disposed;

  const min = p.minQuantity === null ? null : Number(p.minQuantity);
  const optimal = p.optimalQuantity === null ? null : Number(p.optimalQuantity);
  if (min !== null && current < min) return 'critical';
  if (optimal !== null && current < optimal) return 'low';
  return 'ok';
}

function ProductStockTargetCell({
  min, optimal,
}: {
  min: string | null;
  optimal: string | null;
}): React.JSX.Element {
  if (min === null && optimal === null) {
    return <Typography component="span" color="text.secondary">—</Typography>;
  }
  return (
    <Typography component="span" sx={{ whiteSpace: 'nowrap' }}>
      {optimal === null ? '—' : formatQty(optimal)}
      <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>
        ({min === null ? '—' : formatQty(min)})
      </Box>
    </Typography>
  );
}

function ProductPriceCell({
  price, at, currency, unit,
}: {
  price: string | null;
  at: string | null;
  currency: string | null;
  unit: string;
}): React.JSX.Element {
  const { t } = useI18n();
  if (price === null || at === null) {
    return <Typography component="span" color="text.secondary">—</Typography>;
  }
  const n = Number(price);
  const priceStr = Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : price;
  const sym = currencySymbol(currency ?? 'THB');
  const tooltipContent = (
    <Box>
      <Box>{t('products.priceTooltipLastReceived', { date: formatDate(at) })}</Box>
      <Box>{t('products.priceTooltipPerUnit', { price: priceStr, sym, unit })}</Box>
    </Box>
  );
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
      <Typography component="span" sx={{ whiteSpace: 'nowrap' }}>{priceStr} {sym}</Typography>
      <Tooltip title={tooltipContent} enterTouchDelay={0} arrow>
        <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center' }}>
          <InfoIcon size={14} color="var(--mui-palette-text-secondary, #8B909B)" style={{ cursor: 'help' }} />
        </Box>
      </Tooltip>
    </Stack>
  );
}

function ProductStockCell({
  qty, stock,
}: {
  qty: string | null;
  at: string | null;
  stock: import('@/types/product').ProductStockZoneEntry[];
}): React.JSX.Element {
  const { t } = useI18n();
  const totalReceivedAfter = stock.reduce((s, e) => s + (Number(e.receivedAfter) || 0), 0);
  const totalDisposedAfter = stock.reduce((s, e) => s + (Number(e.disposedAfter) || 0), 0);

  // Полный «нулевой» кейс: ни инвентаризации, ни приходов, ни утилизаций.
  if (qty === null && totalReceivedAfter === 0 && totalDisposedAfter === 0) {
    return <Typography component="span" color="text.secondary">—</Typography>;
  }

  const tooltipContent = (
    <Box>
      <Box sx={{ whiteSpace: 'nowrap', fontWeight: 600, mb: 0.5 }}>
        {t('products.stockTotalLabel')}:{' '}
        {totalDisposedAfter > 0 ? (
          <Box component="span" sx={{ color: 'error.light', mr: 0.5 }}>
            (−{formatQty(String(totalDisposedAfter))})
          </Box>
        ) : null}
        {qty === null ? '—' : formatQty(qty)}
        {totalReceivedAfter > 0 ? (
          <Box component="span" sx={{ color: 'success.light', ml: 0.5 }}>
            (+{formatQty(String(totalReceivedAfter))})
          </Box>
        ) : null}
      </Box>
      {stock.map((s) => {
        const after = Number(s.receivedAfter) || 0;
        const disposed = Number(s.disposedAfter) || 0;
        const hasInv = s.completedAt !== null && s.quantity !== null;
        return (
          <Box key={s.zoneId} sx={{ whiteSpace: 'nowrap' }}>
            {hasInv ? `${formatDateTime(s.completedAt!)} ` : ''}
            {s.zoneName}:{' '}
            {disposed > 0 ? (
              <Box component="span" sx={{ color: 'error.light', mr: 0.5 }}>
                (−{formatQty(String(disposed))})
              </Box>
            ) : null}
            {hasInv ? formatQty(s.quantity!) : '—'}
            {after > 0 ? (
              <Box component="span" sx={{ color: 'success.light', ml: 0.5 }}>
                (+{formatQty(String(after))})
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
      <Typography
        component="span"
        sx={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'baseline',
          columnGap: 0.5,
          rowGap: 0.25,
        }}
      >
        {totalDisposedAfter > 0 ? (
          <Box component="span" sx={{ color: 'error.main', whiteSpace: 'nowrap' }}>
            (−{formatQty(String(totalDisposedAfter))})
          </Box>
        ) : null}
        <Box component="span" sx={{ whiteSpace: 'nowrap', color: qty === null ? 'text.secondary' : 'inherit' }}>
          {qty === null ? '—' : formatQty(qty)}
        </Box>
        {totalReceivedAfter > 0 ? (
          <Box component="span" sx={{ color: 'success.main', whiteSpace: 'nowrap' }}>
            (+{formatQty(String(totalReceivedAfter))})
          </Box>
        ) : null}
      </Typography>
      <Tooltip title={tooltipContent} enterTouchDelay={0} arrow>
        <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center' }}>
          <InfoIcon size={14} color="var(--mui-palette-text-secondary, #8B909B)" style={{ cursor: 'help' }} />
        </Box>
      </Tooltip>
    </Stack>
  );
}
