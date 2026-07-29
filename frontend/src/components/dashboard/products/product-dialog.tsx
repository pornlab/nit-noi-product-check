'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
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
import { unitLabels } from '@/types/unit';

const UNIT_VALUES: [Unit, ...Unit[]] = ['PIECE', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'PACK', 'BOX', 'BOTTLE', 'CAN', 'BAG'];

const schema = zod.object({
  name: zod.string().trim().min(1, 'Название обязательно').max(200),
  description: zod.string().trim().max(2000).optional().or(zod.literal('')),
  categoryId: zod.string().optional(),
  baseUnit: zod.enum(UNIT_VALUES),
  sku: zod.string().trim().max(100).optional().or(zod.literal('')),
  barcode: zod.string().trim().max(128).optional().or(zod.literal('')),
  isInventoryTracked: zod.boolean(),
  isPurchasable: zod.boolean(),
});

type Values = zod.infer<typeof schema>;

const empty: Values = {
  name: '', description: '', categoryId: '', baseUnit: 'PIECE',
  sku: '', barcode: '', isInventoryTracked: true, isPurchasable: true,
};

const toNull = (s?: string): string | null => (s && s.trim().length > 0 ? s.trim() : null);

export interface ProductDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  product?: Product | null;
  categories: Category[];
  saving: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (payload: CreateProductInput | UpdateProductInput) => void | Promise<void>;
}

export function ProductDialog({
  open, mode, product, categories, saving, serverError, onCancel, onSubmit,
}: ProductDialogProps): React.JSX.Element {
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
    };
    void onSubmit(payload);
  };

  const currentCategoryId = product?.category?.id ?? '';
  const activeCategories = categories.filter((c) => c.isActive);
  const currentCategoryInActive = activeCategories.some((c) => c.id === currentCategoryId);
  const showInactiveCurrent = mode === 'edit' && product?.category && !currentCategoryInActive;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Новый товар' : 'Редактирование товара'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }} component="form" id="product-form" onSubmit={handleSubmit(submit)}>
          <Typography variant="overline" color="text.secondary">Основное</Typography>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Название" required fullWidth autoFocus
              error={Boolean(errors.name)} helperText={errors.name?.message} inputProps={{ maxLength: 200 }} />
          )} />
          <Controller name="categoryId" control={control} render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Категория</InputLabel>
              <Select
                {...field}
                label="Категория"
                value={field.value ?? ''}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value=""><em>Без категории</em></MenuItem>
                {showInactiveCurrent && product?.category ? (
                  <MenuItem value={product.category.id}>
                    {product.category.name} (неактивна)
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
              <InputLabel>Базовая единица</InputLabel>
              <Select
                {...field}
                label="Базовая единица"
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {UNIT_VALUES.map((u) => (
                  <MenuItem key={u} value={u}>{unitLabels[u]} — {u}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )} />
          <Controller name="description" control={control} render={({ field }) => (
            <TextField {...field} label="Описание" fullWidth multiline minRows={3}
              error={Boolean(errors.description)} helperText={errors.description?.message}
              inputProps={{ maxLength: 2000 }} />
          )} />

          <Divider />
          <Typography variant="overline" color="text.secondary">Идентификаторы</Typography>
          <Controller name="sku" control={control} render={({ field }) => (
            <TextField {...field} label="Внутренний артикул (SKU)" fullWidth
              error={Boolean(errors.sku)} helperText={errors.sku?.message}
              inputProps={{ maxLength: 100 }} />
          )} />
          <Controller name="barcode" control={control} render={({ field }) => (
            <TextField {...field} label="Штрихкод" fullWidth
              error={Boolean(errors.barcode)} helperText={errors.barcode?.message}
              inputProps={{ maxLength: 128 }} />
          )} />

          <Divider />
          <Typography variant="overline" color="text.secondary">Использование</Typography>
          <Controller name="isInventoryTracked" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />}
              label="Учитывать в инвентаризации"
            />
          )} />
          <Controller name="isPurchasable" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />}
              label="Использовать в закупках"
            />
          )} />

          {serverError ? <Alert severity="error">{serverError}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Отмена</Button>
        <Button variant="contained" type="submit" form="product-form" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
