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
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import type { CreateSupplierPayload, Supplier, UpdateSupplierPayload } from '@/types/supplier';

const schema = zod.object({
  name: zod.string().trim().min(1, 'Название обязательно').max(200),
  contactPerson: zod.string().trim().max(200).optional().or(zod.literal('')),
  phone: zod.string().trim().max(50).optional().or(zod.literal('')),
  email: zod.string().trim().max(254).email('Некорректный email').optional().or(zod.literal('')),
  address: zod.string().trim().max(1000).optional().or(zod.literal('')),
  taxId: zod.string().trim().max(100).optional().or(zod.literal('')),
  notes: zod.string().trim().max(5000).optional().or(zod.literal('')),
  isActive: zod.boolean().optional(),
});

type Values = zod.infer<typeof schema>;

const empty: Values = {
  name: '', contactPerson: '', phone: '', email: '', address: '', taxId: '', notes: '', isActive: true,
};

const toNull = (s?: string): string | null => (s && s.trim().length > 0 ? s.trim() : null);

export interface SupplierDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  supplier?: Supplier | null;
  saving: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (payload: CreateSupplierPayload | UpdateSupplierPayload) => void | Promise<void>;
}

export function SupplierDialog({
  open, mode, supplier, saving, serverError, onCancel, onSubmit,
}: SupplierDialogProps): React.JSX.Element {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && supplier) {
      reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
        taxId: supplier.taxId ?? '',
        notes: supplier.notes ?? '',
        isActive: supplier.isActive,
      });
    } else {
      reset(empty);
    }
  }, [open, mode, supplier, reset]);

  const submit = (v: Values): void => {
    const payload: UpdateSupplierPayload = {
      name: v.name.trim(),
      contactPerson: toNull(v.contactPerson),
      phone: toNull(v.phone),
      email: v.email && v.email.trim().length > 0 ? v.email.trim().toLowerCase() : null,
      address: toNull(v.address),
      taxId: toNull(v.taxId),
      notes: toNull(v.notes),
    };
    if (mode === 'edit') payload.isActive = v.isActive;
    void onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Новый поставщик' : 'Редактирование поставщика'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }} component="form" id="supplier-form" onSubmit={handleSubmit(submit)}>
          <Typography variant="overline" color="text.secondary">Основное</Typography>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Название" required fullWidth autoFocus
              error={Boolean(errors.name)} helperText={errors.name?.message} inputProps={{ maxLength: 200 }} />
          )} />
          <Controller name="contactPerson" control={control} render={({ field }) => (
            <TextField {...field} label="Контактное лицо" fullWidth
              error={Boolean(errors.contactPerson)} helperText={errors.contactPerson?.message}
              inputProps={{ maxLength: 200 }} />
          )} />
          <Controller name="phone" control={control} render={({ field }) => (
            <TextField {...field} label="Телефон" fullWidth
              error={Boolean(errors.phone)} helperText={errors.phone?.message}
              inputProps={{ maxLength: 50 }} />
          )} />
          <Controller name="email" control={control} render={({ field }) => (
            <TextField {...field} label="Email" fullWidth type="email"
              error={Boolean(errors.email)} helperText={errors.email?.message}
              inputProps={{ maxLength: 254 }} />
          )} />

          <Divider />
          <Typography variant="overline" color="text.secondary">Дополнительно</Typography>
          <Controller name="address" control={control} render={({ field }) => (
            <TextField {...field} label="Адрес" fullWidth multiline minRows={2}
              error={Boolean(errors.address)} helperText={errors.address?.message}
              inputProps={{ maxLength: 1000 }} />
          )} />
          <Controller name="taxId" control={control} render={({ field }) => (
            <TextField {...field} label="Налоговый номер" fullWidth
              error={Boolean(errors.taxId)} helperText={errors.taxId?.message}
              inputProps={{ maxLength: 100 }} />
          )} />
          <Controller name="notes" control={control} render={({ field }) => (
            <TextField {...field} label="Заметки" fullWidth multiline minRows={3}
              error={Boolean(errors.notes)} helperText={errors.notes?.message}
              inputProps={{ maxLength: 5000 }} />
          )} />

          {mode === 'edit' ? (
            <>
              <Divider />
              <Controller name="isActive" control={control} render={({ field }) => (
                <Stack direction="row" alignItems="center">
                  <Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />
                  <Typography variant="body2">{field.value ? 'Активен' : 'Неактивен'}</Typography>
                </Stack>
              )} />
            </>
          ) : null}

          {serverError ? <Alert severity="error">{serverError}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Отмена</Button>
        <Button variant="contained" type="submit" form="supplier-form" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
