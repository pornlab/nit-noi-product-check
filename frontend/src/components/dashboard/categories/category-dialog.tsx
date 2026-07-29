'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';

const schema = zod.object({
  name: zod.string().trim().min(1, 'Название обязательно').max(120),
  description: zod.string().trim().max(1000).optional().or(zod.literal('')),
});

type Values = zod.infer<typeof schema>;

const empty: Values = { name: '', description: '' };

const toNull = (s?: string): string | null => (s && s.trim().length > 0 ? s.trim() : null);

export interface CategoryDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  category?: Category | null;
  saving: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (payload: CreateCategoryInput | UpdateCategoryInput) => void | Promise<void>;
}

export function CategoryDialog({
  open, mode, category, saving, serverError, onCancel, onSubmit,
}: CategoryDialogProps): React.JSX.Element {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && category) {
      reset({ name: category.name, description: category.description ?? '' });
    } else {
      reset(empty);
    }
  }, [open, mode, category, reset]);

  const submit = (v: Values): void => {
    const payload: UpdateCategoryInput = {
      name: v.name.trim(),
      description: toNull(v.description),
    };
    void onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Новая категория' : 'Редактирование категории'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }} component="form" id="category-form" onSubmit={handleSubmit(submit)}>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Название" required fullWidth autoFocus
              error={Boolean(errors.name)} helperText={errors.name?.message} inputProps={{ maxLength: 120 }} />
          )} />
          <Controller name="description" control={control} render={({ field }) => (
            <TextField {...field} label="Описание" fullWidth multiline minRows={3}
              error={Boolean(errors.description)} helperText={errors.description?.message}
              inputProps={{ maxLength: 1000 }} />
          )} />
          {serverError ? <Alert severity="error">{serverError}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Отмена</Button>
        <Button variant="contained" type="submit" form="category-form" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
