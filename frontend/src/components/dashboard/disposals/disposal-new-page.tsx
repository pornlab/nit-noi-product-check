'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { InventoryZoneSummary } from '@/types/inventory';
import type { Product } from '@/types/product';
import { disposalsApi } from '@/lib/api/disposals';
import { inventoryApi } from '@/lib/api/inventory';
import { productsApi } from '@/lib/api/products';
import { useNotify } from '@/lib/api/notify';
import { useI18n } from '@/lib/i18n/provider';
import { unitLabelKey } from '@/lib/i18n/unit';
import { paths } from '@/paths';

const QTY_RE = /^\d*(\.\d{0,3})?$/;
const QTY_MAX = 1_000_000;

interface DraftItem {
  key: number;
  product: Product | null;
  quantity: string;
}

let itemKeySeq = 0;
const newItem = (): DraftItem => ({ key: ++itemKeySeq, product: null, quantity: '' });

export function DisposalNewPage(): React.JSX.Element {
  const router = useRouter();
  const { t } = useI18n();
  const { notify, view: snack } = useNotify();

  const [zonesState, setZonesState] = React.useState<{ loading: boolean; error: string | null; items: InventoryZoneSummary[] }>({
    loading: true, error: null, items: [],
  });
  const [zoneId, setZoneId] = React.useState<string>('');

  const [productsState, setProductsState] = React.useState<{ loading: boolean; error: string | null; items: Product[] }>({
    loading: false, error: null, items: [],
  });
  const [items, setItems] = React.useState<DraftItem[]>([newItem()]);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const { data, error } = await inventoryApi.listZones();
      if (error) { setZonesState({ loading: false, error: error.message, items: [] }); return; }
      const list = data ?? [];
      setZonesState({ loading: false, error: null, items: list });
      if (list.length === 1) setZoneId(list[0].id);
    })();
  }, []);

  React.useEffect(() => {
    // При смене зоны — всегда сбрасываем список строк, чтобы не тянуть
    // старые выборы в новый контекст.
    setItems([newItem()]);
    if (!zoneId) {
      setProductsState({ loading: false, error: null, items: [] });
      return;
    }
    void (async () => {
      setProductsState((s) => ({ ...s, loading: true, error: null }));
      const { data, error } = await productsApi.list({
        zoneId,
        isActive: true,
        isInventoryTracked: true,
      });
      if (error) { setProductsState({ loading: false, error: error.message, items: [] }); return; }
      setProductsState({ loading: false, error: null, items: data ?? [] });
    })();
  }, [zoneId]);

  const setItemProduct = (key: number, p: Product | null): void => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, product: p } : it)));
  };
  const setItemQuantity = (key: number, raw: string): void => {
    const sanitized = raw.replace(',', '.');
    if (sanitized !== '' && !QTY_RE.test(sanitized)) return;
    const n = Number(sanitized);
    if (Number.isFinite(n) && n > QTY_MAX) return;
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: sanitized } : it)));
  };
  const addRow = (): void => setItems((prev) => [...prev, newItem()]);
  const removeRow = (key: number): void => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));

  // Товары, уже выбранные в других строках — не даём выбрать повторно.
  const chosenIds = React.useMemo(
    () => new Set(items.map((it) => it.product?.id).filter(Boolean) as string[]),
    [items],
  );

  const anyValidItem = items.some((it) => {
    if (!it.product) return false;
    const n = Number(it.quantity);
    return Number.isFinite(n) && n > 0;
  });
  const anyInvalid = items.some((it) => {
    if (!it.product && it.quantity === '') return false;
    if (!it.product) return true;
    const n = Number(it.quantity);
    return !Number.isFinite(n) || n <= 0;
  });
  const canSave = Boolean(zoneId) && anyValidItem && !anyInvalid && !submitting;

  const singleZoneName = zonesState.items.length === 1 ? zonesState.items[0].name : null;

  const submit = async (): Promise<void> => {
    if (!canSave) return;
    setSubmitting(true);
    const payload = {
      zoneId,
      items: items
        .filter((it) => it.product && Number(it.quantity) > 0)
        .map((it) => ({ productId: it.product!.id, quantity: Number(it.quantity) })),
    };
    const { error } = await disposalsApi.create(payload);
    setSubmitting(false);
    if (error) { notify(error.message, 'error'); return; }
    notify(t('disposals.createdNotify'));
    router.push(paths.dashboard.disposals);
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button size="small" onClick={() => router.push(paths.dashboard.disposals)}>{t('common.back')}</Button>
          <Typography variant="h5">{t('disposals.newTitle')}</Typography>
        </Stack>

        <Card>
          <CardContent>
            {zonesState.loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
              </Box>
            ) : zonesState.error ? (
              <Alert severity="error">{zonesState.error}</Alert>
            ) : zonesState.items.length === 0 ? (
              <Alert severity="warning">{t('disposals.zoneNoAccess')}</Alert>
            ) : (
              <Stack spacing={2}>
                {singleZoneName ? (
                  <Typography variant="body1">
                    {t('disposals.zoneSingle', { name: singleZoneName })}
                  </Typography>
                ) : (
                  <FormControl sx={{ width: { xs: '100%', md: '33.333%' } }}>
                    <InputLabel>{t('disposals.zoneLabel')}</InputLabel>
                    <Select
                      label={t('disposals.zoneLabel')}
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                    >
                      {zonesState.items.map((z) => (
                        <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {zoneId ? (
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {t('disposals.itemsSection')}
              </Typography>

              <Stack divider={<Divider flexItem />}>
                {items.map((it) => {
                  const availableOptions = productsState.items.filter(
                    (p) => !chosenIds.has(p.id) || p.id === it.product?.id,
                  );
                  const unit = it.product ? t(unitLabelKey(it.product.baseUnit)) : '—';
                  const qtyN = Number(it.quantity);
                  const qtyInvalid = it.quantity !== '' && (!Number.isFinite(qtyN) || qtyN <= 0);
                  return (
                    <Stack
                      key={it.key}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1.5, sm: 2 }}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      sx={{ py: 1.5 }}
                    >
                      <Autocomplete
                        sx={{ width: { xs: '100%', md: '50%' } }}
                        options={availableOptions}
                        value={it.product}
                        onChange={(_, v) => setItemProduct(it.key, v)}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        loading={productsState.loading}
                        noOptionsText={t('disposals.productNoOptions')}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('disposals.productLabel')}
                            placeholder={t('disposals.productPlaceholder')}
                          />
                        )}
                      />
                      <TextField
                        label={t('disposals.quantityLabel')}
                        value={it.quantity}
                        onChange={(e) => setItemQuantity(it.key, e.target.value)}
                        disabled={!it.product}
                        error={qtyInvalid}
                        inputProps={{ inputMode: 'decimal', autoComplete: 'off', style: { textAlign: 'right' } }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
                        }}
                        sx={{ width: { xs: '100%', sm: 220 } }}
                      />
                      <Tooltip title={t('common.remove')}>
                        <span>
                          <IconButton onClick={() => removeRow(it.key)} disabled={items.length === 1}>
                            <TrashIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>

              {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t('disposals.itemsEmpty')}
                </Typography>
              ) : null}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<PlusIcon />}
                  onClick={addRow}
                >
                  {t('disposals.addItem')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button variant="contained" size="large" disabled={!canSave} onClick={submit}>
            {submitting ? t('common.saving') : t('disposals.saveButton')}
          </Button>
        </Stack>
      </Stack>

      {snack}
    </>
  );
}
