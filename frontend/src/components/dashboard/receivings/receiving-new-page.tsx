'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import type { Product } from '@/types/product';
import type { Supplier } from '@/types/supplier';
import { unitLabels } from '@/types/unit';
import { suppliersApi } from '@/lib/api/suppliers';
import { productsApi } from '@/lib/api/products';
import { receivingsApi } from '@/lib/api/receivings';
import { useNotify } from '@/lib/api/notify';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';
import { ReceivingProductPicker } from './receiving-product-picker';

interface ReceivingItemDraft {
  product: Product;
  quantity: string;
  cost: string;
  // Значения распределения по зонам товара (ключ — zone.id, зоны берём из product.zones).
  allocations: Record<string, string>;
}

const QTY_RE = /^\d*(\.\d{0,3})?$/;
const QTY_MAX = 1_000_000;
const MONEY_RE = /^\d*(\.\d{0,2})?$/;
const MONEY_MAX = 100_000_000;
const EPS = 1e-9;

function parseQty(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function sumAllocations(alloc: Record<string, string>): number {
  return Object.values(alloc).reduce((s, v) => s + parseQty(v), 0);
}
function formatQtyShort(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type ItemStatus = 'empty' | 'partial' | 'complete' | 'over';
function itemStatus(item: ReceivingItemDraft): ItemStatus {
  const total = parseQty(item.quantity);
  const sum = sumAllocations(item.allocations);
  if (total <= 0) return 'empty';
  if (sum > total + EPS) return 'over';
  if (Math.abs(sum - total) < EPS) return 'complete';
  return 'partial';
}

export interface ReceivingNewPageProps {
  mode?: 'create' | 'edit';
  receivingId?: string;
}

export function ReceivingNewPage({ mode = 'create', receivingId }: ReceivingNewPageProps = {}): React.JSX.Element {
  const router = useRouter();
  const { notify, view: snack } = useNotify();
  const { user } = useUser();
  const isOwner = user?.role === 'admin';
  // admin (владелец) — любая дата; manager — не раньше вчера.
  const dateMin = isOwner ? undefined : yesterdayIso();
  const isEdit = mode === 'edit';

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [suppliersError, setSuppliersError] = React.useState<string | null>(null);
  const [supplierId, setSupplierId] = React.useState<string>('');
  const [receivedAt, setReceivedAt] = React.useState<string>(todayIso());

  const [items, setItems] = React.useState<ReceivingItemDraft[]>([]);
  const [deliveryCost, setDeliveryCost] = React.useState<string>('');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // hydration для edit-режима: сначала грузим детали и все товары с их зонами
  const [hydrating, setHydrating] = React.useState(isEdit);
  const [hydrationError, setHydrationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      const { data, error } = await suppliersApi.list({ isActive: true });
      if (error) setSuppliersError(error.message);
      else setSuppliers(data ?? []);
    })();
  }, []);

  React.useEffect(() => {
    if (!isEdit || !receivingId) return;
    void (async () => {
      setHydrating(true);
      setHydrationError(null);
      const detailRes = await receivingsApi.get(receivingId);
      if (detailRes.error || !detailRes.data) {
        setHydrationError(detailRes.error?.message ?? 'Не удалось загрузить поступление');
        setHydrating(false);
        return;
      }
      const detail = detailRes.data;
      // Тянем полные Product'ы (с зонами) параллельно.
      const productResults = await Promise.all(
        detail.items.map((it) => productsApi.get(it.product.id)),
      );
      const failed = productResults.find((r) => r.error);
      if (failed?.error) {
        setHydrationError(failed.error.message);
        setHydrating(false);
        return;
      }
      const products = productResults.map((r) => r.data!);
      const productMap = new Map(products.map((p) => [p.id, p] as const));

      setSupplierId(detail.supplier.id);
      setReceivedAt(detail.receivedAt);
      setDeliveryCost(detail.deliveryCost);
      setItems(detail.items.map((it) => {
        const product = productMap.get(it.product.id)!;
        const allocations: Record<string, string> = {};
        for (const z of product.zones ?? []) allocations[z.id] = '';
        for (const a of it.allocations) allocations[a.zone.id] = a.quantity;
        return {
          product,
          quantity: it.quantity,
          cost: it.cost,
          allocations,
        };
      }));
      setHydrating(false);
    })();
  }, [isEdit, receivingId]);

  const setQuantity = (productId: string, raw: string): void => {
    const sanitized = raw.replace(',', '.');
    if (sanitized !== '' && !QTY_RE.test(sanitized)) return;
    if (parseQty(sanitized) > QTY_MAX) return;
    setItems((prev) => prev.map((it) => (it.product.id === productId ? { ...it, quantity: sanitized } : it)));
  };

  const setCost = (productId: string, raw: string): void => {
    const sanitized = raw.replace(',', '.');
    if (sanitized !== '' && !MONEY_RE.test(sanitized)) return;
    if (parseQty(sanitized) > MONEY_MAX) return;
    setItems((prev) => prev.map((it) => (it.product.id === productId ? { ...it, cost: sanitized } : it)));
  };

  const setDelivery = (raw: string): void => {
    const sanitized = raw.replace(',', '.');
    if (sanitized !== '' && !MONEY_RE.test(sanitized)) return;
    if (parseQty(sanitized) > MONEY_MAX) return;
    setDeliveryCost(sanitized);
  };

  const setAllocation = (productId: string, zoneId: string, raw: string): void => {
    const sanitized = raw.replace(',', '.');
    if (sanitized !== '' && !QTY_RE.test(sanitized)) return;
    if (parseQty(sanitized) > QTY_MAX) return;
    setItems((prev) => prev.map((it) => {
      if (it.product.id !== productId) return it;
      return { ...it, allocations: { ...it.allocations, [zoneId]: sanitized } };
    }));
  };

  const positions = items.length;
  const complete = items.filter((it) => itemStatus(it) === 'complete').length;
  const attention = items.filter((it) => {
    const s = itemStatus(it);
    return s === 'empty' || s === 'partial' || s === 'over';
  }).length;

  const itemsSubtotal = items.reduce((s, it) => s + parseQty(it.cost), 0);
  const deliveryTotal = parseQty(deliveryCost);
  const grandTotal = itemsSubtotal + deliveryTotal;

  const dateTooOld = dateMin !== undefined && receivedAt < dateMin;
  const canSave =
    items.length > 0 &&
    items.every((it) => itemStatus(it) === 'complete') &&
    supplierId !== '' &&
    receivedAt !== '' &&
    !dateTooOld;

  const submit = async (): Promise<void> => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      supplierId,
      receivedAt,
      deliveryCost: parseQty(deliveryCost),
      items: items.map((it) => ({
        productId: it.product.id,
        quantity: parseQty(it.quantity),
        cost: parseQty(it.cost),
        allocations: Object.entries(it.allocations).map(([zoneId, v]) => ({
          zoneId,
          quantity: parseQty(v),
        })),
      })),
    };
    const { data, error } = isEdit && receivingId
      ? await receivingsApi.update(receivingId, payload)
      : await receivingsApi.create(payload);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      notify(error.message, 'error');
      return;
    }
    notify(isEdit ? 'Поступление обновлено' : 'Поступление создано');
    router.push(paths.dashboard.receiving(data!.id));
  };

  return (
    <Stack spacing={2}>
      {/* header */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button
          size="small"
          onClick={() => router.push(isEdit && receivingId ? paths.dashboard.receiving(receivingId) : paths.dashboard.receivings)}
        >
          ← Назад
        </Button>
        <Typography variant="h5">{isEdit ? 'Редактирование поступления' : 'Поступление товара'}</Typography>
        <Box sx={{ flex: 1 }} />
        {isEdit ? null : <Typography variant="caption" color="text.secondary">Черновик · не сохранён</Typography>}
      </Stack>

      {hydrationError ? <Alert severity="error">{hydrationError}</Alert> : null}

      {/* supplier + date + doc */}
      <Card>
        <CardContent>
          {suppliersError ? <Alert severity="error" sx={{ mb: 2 }}>{suppliersError}</Alert> : null}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            }}
          >
            <FormControl fullWidth>
              <InputLabel>Поставщик</InputLabel>
              <Select
                label="Поставщик"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value=""><em>Не выбран</em></MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="Дата поступления"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={dateMin ? { min: dateMin } : undefined}
              error={dateTooOld}
              helperText={
                dateTooOld
                  ? 'Дата не может быть раньше вчерашней'
                  : isOwner ? 'Владелец может выбрать любую дату' : 'Не раньше вчерашней'
              }
            />
          </Box>
        </CardContent>
      </Card>

      {/* items */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">Товары</Typography>
            <Chip size="small" label={positions} color="primary" variant="outlined" />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              size="large"
              startIcon={<PlusIcon />}
              onClick={() => setPickerOpen(true)}
            >
              Добавить товар
            </Button>
          </Stack>

          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Товары ещё не добавлены. Нажмите «Добавить товар».
            </Typography>
          ) : (
            <>
              <Stack
                direction="row"
                spacing={2}
                sx={{ pb: 1, color: 'text.secondary', display: { xs: 'none', sm: 'flex' } }}
              >
                <Typography variant="caption" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Товар · распределение по складам
                </Typography>
                <Typography variant="caption" sx={{ pr: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Принято всего
                </Typography>
              </Stack>

              <Stack divider={<Divider flexItem />}>
                {items.map((it) => (
                  <ItemRow
                    key={it.product.id}
                    item={it}
                    onQuantityChange={(v) => setQuantity(it.product.id, v)}
                    onCostChange={(v) => setCost(it.product.id, v)}
                    onAllocationChange={(zoneId, v) => setAllocation(it.product.id, zoneId, v)}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={2} sx={{ pt: 2 }} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  <b>{positions}</b> {pluralPositions(positions)}
                </Typography>
                <Dot />
                <Typography variant="body2" color="success.main">
                  {complete} распределено полностью
                </Typography>
                <Dot />
                <Typography variant="body2" color="warning.main">
                  {attention} требует внимания
                </Typography>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* доставка + итог */}
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <TextField
              label="Стоимость доставки"
              value={deliveryCost}
              onChange={(e) => setDelivery(e.target.value)}
              inputProps={{
                inputMode: 'decimal',
                autoComplete: 'off',
                style: { textAlign: 'right' },
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">฿</InputAdornment>,
              }}
              sx={{ width: { xs: '100%', sm: 240 } }}
            />
            <Box sx={{ flex: 1 }} />
            <Stack spacing={0.25} sx={{ minWidth: { sm: 220 } }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">Товары</Typography>
                <Typography variant="body2">{formatMoney(itemsSubtotal)} ฿</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">Доставка</Typography>
                <Typography variant="body2">{formatMoney(deliveryTotal)} ฿</Typography>
              </Stack>
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Всего</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatMoney(grandTotal)} ฿</Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* bottom actions */}
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
        <Button
          variant="text"
          size="large"
          disabled={saving}
          onClick={() => router.push(isEdit && receivingId ? paths.dashboard.receiving(receivingId) : paths.dashboard.receivings)}
        >
          Отмена
        </Button>
        <Button variant="contained" size="large" disabled={!canSave || saving || hydrating} onClick={submit}>
          {saving ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Сохранить поступление'}
        </Button>
      </Stack>

      {snack}

      <ReceivingProductPicker
        open={pickerOpen}
        initialSelected={items.map((it) => it.product)}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(selected) => {
          setItems((prev) => {
            const byId = new Map(prev.map((it) => [it.product.id, it] as const));
            return selected.map((product) => {
              const existing = byId.get(product.id);
              if (existing) return { ...existing, product };
              const alloc: Record<string, string> = {};
              for (const z of product.zones ?? []) alloc[z.id] = '';
              return { product, quantity: '', cost: '', allocations: alloc };
            });
          });
          setPickerOpen(false);
        }}
      />
    </Stack>
  );
}

function pluralPositions(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'позиция';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'позиции';
  return 'позиций';
}

function Dot(): React.JSX.Element {
  return <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />;
}

interface ItemRowProps {
  item: ReceivingItemDraft;
  onQuantityChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onAllocationChange: (zoneId: string, value: string) => void;
}

function ItemRow({
  item, onQuantityChange, onCostChange, onAllocationChange,
}: ItemRowProps): React.JSX.Element {
  const { product: p, quantity, cost, allocations } = item;
  const total = parseQty(quantity);
  const distributed = sumAllocations(allocations);
  const unit = unitLabels[p.baseUnit];
  const status = itemStatus(item);
  const zones = p.zones ?? [];

  const progressPct = total > 0 ? Math.min(100, (distributed / total) * 100) : 0;
  const progressColor: 'primary' | 'warning' | 'success' | 'error' =
    status === 'complete' ? 'success' : status === 'over' ? 'error' : status === 'partial' ? 'warning' : 'primary';

  const captionColor =
    status === 'complete' ? 'success.main'
    : status === 'over' ? 'error.main'
    : status === 'partial' ? 'warning.main'
    : 'text.secondary';

  const qtyError = quantity !== '' && parseQty(quantity) <= 0;

  return (
    <Stack spacing={1.5} sx={{ py: 2 }}>
      {/* Название + категория + количество + удалить */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0, flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{p.name}</Typography>
          {p.category ? (
            <Chip
              size="small"
              label={p.category.name}
              sx={{ bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 500 }}
            />
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1}>
          <TextField
            label="Количество"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            error={qtyError}
            inputProps={{
              inputMode: 'decimal',
              autoComplete: 'off',
              style: { textAlign: 'right' },
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
            }}
            sx={{ flex: 1, width: { sm: 200 } }}
          />
          <TextField
            label="Стоимость"
            value={cost}
            onChange={(e) => onCostChange(e.target.value)}
            inputProps={{
              inputMode: 'decimal',
              autoComplete: 'off',
              style: { textAlign: 'right' },
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">฿</InputAdornment>,
            }}
            sx={{ flex: 1, width: { sm: 180 } }}
          />
        </Stack>
      </Stack>

      {/* Распределение по зонам товара */}
      {zones.length === 0 ? (
        <Typography variant="caption" color="warning.main">
          У товара не указано ни одной зоны — распределить некуда. Задайте зоны в карточке товара.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Зоны</Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(200px, 1fr))' },
            }}
          >
            {zones.map((z) => {
              const val = allocations[z.id] ?? '';
              return (
                <TextField
                  key={z.id}
                  label={z.name}
                  value={val}
                  onChange={(e) => onAllocationChange(z.id, e.target.value)}
                  inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                />
              );
            })}
          </Box>
        </Stack>
      )}

      {/* Прогресс */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 0.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <LinearProgress
          variant="determinate"
          value={progressPct}
          color={progressColor}
          sx={{ flex: 1, height: 6, borderRadius: 3, maxWidth: { sm: 360 } }}
        />
        <Typography variant="body2" sx={{ color: captionColor }}>
          Распределено {formatQtyShort(distributed)}
          {total > 0 ? ` / ${formatQtyShort(total)} ${unit}` : ` ${unit}`}
          {status === 'partial' ? ` · осталось ${formatQtyShort(total - distributed)}` : ''}
          {status === 'over' ? ` · превышение на ${formatQtyShort(distributed - total)}` : ''}
        </Typography>
      </Stack>
    </Stack>
  );
}
