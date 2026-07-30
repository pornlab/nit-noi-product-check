'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CaretDoubleLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretDoubleLeft';
import { CaretDoubleRightIcon } from '@phosphor-icons/react/dist/ssr/CaretDoubleRight';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

import type { Category } from '@/types/category';
import type { Product } from '@/types/product';
import type { Zone } from '@/types/zone';
import { categoriesApi } from '@/lib/api/categories';
import { productsApi } from '@/lib/api/products';
import { zonesApi } from '@/lib/api/zones';
import { useI18n } from '@/lib/i18n/provider';
import { unitLabelKey } from '@/lib/i18n/unit';

export interface ReceivingProductPickerProps {
  open: boolean;
  /** Товары, уже добавленные в поступление — попадают в правую колонку при открытии. */
  initialSelected: Product[];
  onCancel: () => void;
  /** Возвращает финальный список выбранных товаров (в том же порядке). */
  onConfirm: (products: Product[]) => void;
}

export function ReceivingProductPicker({
  open, initialSelected, onCancel, onConfirm,
}: ReceivingProductPickerProps): React.JSX.Element {
  const { t } = useI18n();
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Product[] }>({
    loading: false, error: null, items: [],
  });

  // Локальные выборы в чекбоксах (по разные стороны)
  const [leftChecked, setLeftChecked] = React.useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = React.useState<Set<string>>(new Set());
  // Отобранные (правая колонка)
  const [selected, setSelected] = React.useState<Product[]>([]);

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    if (!open) return;
    void (async () => {
      const [c, z] = await Promise.all([categoriesApi.list(), zonesApi.list()]);
      if (c.data) setCategories(c.data);
      if (z.data) setZones(z.data);
    })();
  }, [open]);

  React.useEffect(() => {
    if (open) {
      // При открытии сбрасываем локальные чекбоксы и фильтры,
      // но правую колонку наполняем уже выбранными товарами из родителя.
      setSearchInput(''); setSearch(''); setCategoryId(''); setZoneId('');
      setLeftChecked(new Set()); setRightChecked(new Set());
      setSelected(initialSelected);
    } else {
      setState({ loading: false, error: null, items: [] });
    }
  }, [open, initialSelected]);

  const loadProducts = React.useCallback(async () => {
    if (!open) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await productsApi.list({
      search: search || undefined,
      categoryId: categoryId || undefined,
      zoneId: zoneId || undefined,
      isActive: true,
      isInventoryTracked: true,
      isPurchasable: true,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [open, search, categoryId, zoneId]);

  React.useEffect(() => { void loadProducts(); }, [loadProducts]);

  const selectedIds = React.useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const leftItems = React.useMemo(
    () => state.items.filter((p) => !selectedIds.has(p.id)),
    [state.items, selectedIds],
  );

  const toggleLeft = (id: string): void => {
    setLeftChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleRight = (id: string): void => {
    setRightChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const moveRight = (): void => {
    if (leftChecked.size === 0) return;
    const toMove = leftItems.filter((p) => leftChecked.has(p.id));
    setSelected((prev) => [...prev, ...toMove]);
    setLeftChecked(new Set());
  };
  const moveAllRight = (): void => {
    if (leftItems.length === 0) return;
    setSelected((prev) => [...prev, ...leftItems]);
    setLeftChecked(new Set());
  };
  const moveLeft = (): void => {
    if (rightChecked.size === 0) return;
    setSelected((prev) => prev.filter((p) => !rightChecked.has(p.id)));
    setRightChecked(new Set());
  };
  const moveAllLeft = (): void => {
    setSelected([]);
    setRightChecked(new Set());
  };

  const confirm = (): void => {
    onConfirm(selected);
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="lg">
      <DialogTitle>{t('receivings.pickerTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder={t('common.search')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ minWidth: 260 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('products.filterCategoryLabel')}</InputLabel>
              <Select
                label={t('products.filterCategoryLabel')}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value="">{t('receivings.pickerCategoryAll')}</MenuItem>
                <MenuItem value="none">{t('receivings.pickerCategoryNone')}</MenuItem>
                {categories.filter((c) => c.isActive).map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('products.filterZoneLabel')}</InputLabel>
              <Select
                label={t('products.filterZoneLabel')}
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value="">{t('receivings.pickerZoneAll')}</MenuItem>
                {zones.filter((z) => z.isActive).map((z) => (
                  <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {state.error ? <Alert severity="error">{state.error}</Alert> : null}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <Column
              title={t('receivings.pickerAvailable', { count: leftItems.length })}
              items={leftItems}
              checked={leftChecked}
              onToggle={toggleLeft}
              emptyLabel={state.loading ? t('common.loading') : t('receivings.pickerNothing')}
              loading={state.loading}
            />

            <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} justifyContent="center" alignItems="center">
              <Tooltip title={t('receivings.pickerMoveAll')}>
                <span>
                  <IconButton onClick={moveAllRight} disabled={leftItems.length === 0}>
                    <CaretDoubleRightIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('receivings.pickerMoveSelected')}>
                <span>
                  <IconButton onClick={moveRight} disabled={leftChecked.size === 0}>
                    <CaretRightIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('receivings.pickerRemoveSelected')}>
                <span>
                  <IconButton onClick={moveLeft} disabled={rightChecked.size === 0}>
                    <CaretLeftIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('receivings.pickerRemoveAll')}>
                <span>
                  <IconButton onClick={moveAllLeft} disabled={selected.length === 0}>
                    <CaretDoubleLeftIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

            <Column
              title={t('receivings.pickerChosen', { count: selected.length })}
              items={selected}
              checked={rightChecked}
              onToggle={toggleRight}
              emptyLabel={t('receivings.pickerEmpty')}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={confirm}>
          {t('common.ok')} ({selected.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ColumnProps {
  title: string;
  items: Product[];
  checked: Set<string>;
  onToggle: (id: string) => void;
  emptyLabel: string;
  loading?: boolean;
}

function Column({ title, items, checked, onToggle, emptyLabel, loading }: ColumnProps): React.JSX.Element {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 360,
        maxHeight: 480,
      }}
    >
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2">{title}</Typography>
      </Box>
      <Divider />
      {items.length === 0 ? (
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          {loading ? <CircularProgress size={16} /> : null}
          <Typography variant="body2">{emptyLabel}</Typography>
        </Box>
      ) : (
        <List dense sx={{ overflowY: 'auto', flex: 1, py: 0 }}>
          {items.map((p) => {
            const isChecked = checked.has(p.id);
            return (
              <ListItemButton key={p.id} onClick={() => onToggle(p.id)} dense>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox edge="start" checked={isChecked} tabIndex={-1} disableRipple />
                </ListItemIcon>
                <ListItemText
                  primary={p.name}
                  secondary={
                    <>
                      {p.category?.name ?? t('receivings.withoutCategory')} · {t(unitLabelKey(p.baseUnit))}
                    </>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}
