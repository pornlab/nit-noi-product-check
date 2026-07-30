'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import type { Category } from '@/types/category';
import type { CreateProductInput, Product, UpdateProductInput } from '@/types/product';
import type { Unit } from '@/types/unit';
import type { Zone } from '@/types/zone';
import { useI18n } from '@/lib/i18n/provider';
import { unitLabelKey } from '@/lib/i18n/unit';

const UNIT_VALUES: [Unit, ...Unit[]] = ['PIECE', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'PACK', 'BOX', 'BOTTLE', 'CAN', 'BAG'];

const QTY_RE = /^\d*(\.\d{0,3})?$/;

const schema = zod.object({
  name: zod.string().trim().min(1, 'Название обязательно').max(200),
  description: zod.string().trim().max(2000).optional().or(zod.literal('')),
  categoryId: zod.string().optional(),
  baseUnit: zod.enum(UNIT_VALUES),
  sku: zod.string().trim().max(100).optional().or(zod.literal('')),
  barcode: zod.string().trim().max(128).optional().or(zod.literal('')),
  isInventoryTracked: zod.boolean(),
  isPurchasable: zod.boolean(),
  zoneIds: zod.array(zod.string()),
  minQuantity: zod.string().refine((v) => v === '' || QTY_RE.test(v.replace(',', '.')), 'Число, до 3 знаков'),
  optimalQuantity: zod.string().refine((v) => v === '' || QTY_RE.test(v.replace(',', '.')), 'Число, до 3 знаков'),
});

type Values = zod.infer<typeof schema>;

const empty: Values = {
  name: '', description: '', categoryId: '', baseUnit: 'PIECE',
  sku: '', barcode: '', isInventoryTracked: true, isPurchasable: true, zoneIds: [],
  minQuantity: '', optimalQuantity: '',
};

const toNull = (s?: string): string | null => (s && s.trim().length > 0 ? s.trim() : null);
const toNumOrNull = (s?: string): number | null => {
  if (!s || s.trim().length === 0) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export interface ProductDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  product?: Product | null;
  categories: Category[];
  zones: Zone[];
  saving: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (payload: CreateProductInput | UpdateProductInput) => void | Promise<void>;
}

export function ProductDialog({
  open, mode, product, categories, zones, saving, serverError, onCancel, onSubmit,
}: ProductDialogProps): React.JSX.Element {
  const { t } = useI18n();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        categoryId: product.category?.id ?? '',
        baseUnit: product.baseUnit,
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        isInventoryTracked: product.isInventoryTracked,
        isPurchasable: product.isPurchasable,
        zoneIds: (product.zones ?? []).map((z) => z.id),
        minQuantity: product.minQuantity ?? '',
        optimalQuantity: product.optimalQuantity ?? '',
      });
    } else {
      reset(empty);
    }
  }, [open, mode, product, reset]);

  const submit = (v: Values): void => {
    const payload: UpdateProductInput = {
      name: v.name.trim(),
      description: toNull(v.description),
      categoryId: v.categoryId || null,
      baseUnit: v.baseUnit,
      sku: toNull(v.sku),
      barcode: toNull(v.barcode),
      isInventoryTracked: v.isInventoryTracked,
      isPurchasable: v.isPurchasable,
      zoneIds: v.zoneIds,
      minQuantity: toNumOrNull(v.minQuantity),
      optimalQuantity: toNumOrNull(v.optimalQuantity),
    };
    void onSubmit(payload);
  };

  const activeZones = zones.filter((z) => z.isActive);
  const inactiveCurrentZones = mode === 'edit'
    ? (product?.zones ?? []).filter((pz) => !activeZones.some((z) => z.id === pz.id))
    : [];
  const zoneOptions: Array<{ id: string; name: string; isActive: boolean }> = [
    ...activeZones.map((z) => ({ id: z.id, name: z.name, isActive: true })),
    ...inactiveCurrentZones.map((z) => ({ id: z.id, name: z.name, isActive: false })),
  ];

  const currentCategoryId = product?.category?.id ?? '';
  const activeCategories = categories.filter((c) => c.isActive);
  const currentCategoryInActive = activeCategories.some((c) => c.id === currentCategoryId);
  const showInactiveCurrent = mode === 'edit' && product?.category && !currentCategoryInActive;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? t('products.newProduct') : t('products.editProduct')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }} component="form" id="product-form" onSubmit={handleSubmit(submit)}>
          <Typography variant="overline" color="text.secondary">{t('products.sectionMain')}</Typography>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label={t('products.fieldName')} required fullWidth autoFocus
              error={Boolean(errors.name)} helperText={errors.name?.message} inputProps={{ maxLength: 200 }} />
          )} />
          <Controller name="categoryId" control={control} render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>{t('products.fieldCategory')}</InputLabel>
              <Select
                {...field}
                label={t('products.fieldCategory')}
                value={field.value ?? ''}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value=""><em>{t('products.fieldCategoryNone')}</em></MenuItem>
                {showInactiveCurrent && product?.category ? (
                  <MenuItem value={product.category.id}>
                    {product.category.name}{t('products.inactiveCategoryTag')}
                  </MenuItem>
                ) : null}
                {activeCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )} />
          <Controller name="baseUnit" control={control} render={({ field }) => (
            <FormControl fullWidth required>
              <InputLabel>{t('products.fieldBaseUnit')}</InputLabel>
              <Select
                {...field}
                label={t('products.fieldBaseUnit')}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {UNIT_VALUES.map((u) => (
                  <MenuItem key={u} value={u}>{t(unitLabelKey(u))} — {u}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )} />
          <Controller name="description" control={control} render={({ field }) => (
            <TextField {...field} label={t('products.fieldDescription')} fullWidth multiline minRows={3}
              error={Boolean(errors.description)} helperText={errors.description?.message}
              inputProps={{ maxLength: 2000 }} />
          )} />

          <Divider />
          <Typography variant="overline" color="text.secondary">{t('products.sectionIdentifiers')}</Typography>
          <Controller name="sku" control={control} render={({ field }) => (
            <TextField {...field} label={t('products.fieldSku')} fullWidth
              error={Boolean(errors.sku)} helperText={errors.sku?.message}
              inputProps={{ maxLength: 100 }} />
          )} />
          <Controller name="barcode" control={control} render={({ field }) => (
            <TextField {...field} label={t('products.fieldBarcode')} fullWidth
              error={Boolean(errors.barcode)} helperText={errors.barcode?.message}
              inputProps={{ maxLength: 128 }} />
          )} />

          <Divider />
          <Typography variant="overline" color="text.secondary">{t('products.sectionZones')}</Typography>
          <Controller name="zoneIds" control={control} render={({ field }) => {
            const selected = zoneOptions.filter((o) => field.value.includes(o.id));
            return (
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={zoneOptions}
                value={selected}
                onChange={(_, val) => field.onChange(val.map((v) => v.id))}
                getOptionLabel={(o) => o.isActive ? o.name : `${o.name}${t('products.inactiveCategoryTag')}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        size="small"
                        variant={option.isActive ? 'filled' : 'outlined'}
                        label={option.isActive ? option.name : `${option.name}${t('products.inactiveCategoryTag')}`}
                        {...tagProps}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label={t('products.fieldZones')} placeholder={t('products.fieldZonesPlaceholder')} />
                )}
              />
            );
          }} />

          <Divider />
          <Typography variant="overline" color="text.secondary">{t('products.sectionUsage')}</Typography>
          <Controller name="isInventoryTracked" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />}
              label={t('products.switchInventoryTracked')}
            />
          )} />
          <Controller name="isPurchasable" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />}
              label={t('products.switchPurchasable')}
            />
          )} />

          <Divider />
          <Typography variant="overline" color="text.secondary">{t('products.sectionTargetStock')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('products.targetStockHint')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller name="minQuantity" control={control} render={({ field }) => (
              <TextField
                {...field}
                label={t('products.fieldMinQuantity')}
                fullWidth
                error={Boolean(errors.minQuantity)}
                helperText={errors.minQuantity?.message}
                inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
              />
            )} />
            <Controller name="optimalQuantity" control={control} render={({ field }) => (
              <TextField
                {...field}
                label={t('products.fieldOptimalQuantity')}
                fullWidth
                error={Boolean(errors.optimalQuantity)}
                helperText={errors.optimalQuantity?.message}
                inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
              />
            )} />
          </Stack>

          {serverError ? <Alert severity="error">{serverError}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>{t('common.cancel')}</Button>
        <Button variant="contained" type="submit" form="product-form" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
