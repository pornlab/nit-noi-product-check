'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { Organization } from '@/types/organization';
import { organizationsApi } from '@/lib/api/organizations';
import { useNotify } from '@/lib/api/notify';
import { useUser } from '@/hooks/use-user';

export function OrganizationView(): React.JSX.Element {
  const { user } = useUser();
  const canEdit = user?.role === 'admin';
  const { notify, view: snack } = useNotify();

  const [state, setState] = React.useState<{ loading: boolean; error: string | null; org: Organization | null }>({
    loading: true,
    error: null,
    org: null,
  });
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', description: '' });
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await organizationsApi.get();
    if (error) setState({ loading: false, error: error.message, org: null });
    else setState({ loading: false, error: null, org: data ?? null });
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const startEdit = (): void => {
    if (!state.org) return;
    setForm({ name: state.org.name, description: state.org.description ?? '' });
    setFormError(null);
    setEditing(true);
  };

  const cancel = (): void => setEditing(false);

  const save = async (): Promise<void> => {
    const name = form.name.trim();
    if (!name) { setFormError('Название обязательно'); return; }
    setSaving(true); setFormError(null);
    const { data, error } = await organizationsApi.update({ name, description: form.description.trim() || null });
    setSaving(false);
    if (error) { setFormError(error.message); notify(error.message, 'error'); return; }
    if (data) setState((s) => ({ ...s, org: data }));
    setEditing(false);
    notify('Организация сохранена');
  };

  return (
    <>
      <Card sx={{ maxWidth: 720 }}>
        <CardHeader title="Организация" subheader="Основные сведения" />
        <Divider />
        <CardContent>
          {state.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} /> <Typography variant="body2">Загрузка…</Typography>
            </Box>
          ) : state.error ? (
            <Stack spacing={2}>
              <Alert severity="error">{state.error}</Alert>
              <Button onClick={load} variant="outlined">Повторить</Button>
            </Stack>
          ) : state.org === null ? (
            <Typography variant="body2" color="text.secondary">Организация не найдена</Typography>
          ) : editing ? (
            <Stack spacing={2}>
              <TextField
                label="Название"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
                error={Boolean(formError && !form.name.trim())}
              />
              <TextField
                label="Описание"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={cancel} disabled={saving}>Отмена</Button>
                <Button variant="contained" onClick={save} disabled={saving}>
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Field label="Название" value={state.org.name} />
              <Field label="Описание" value={state.org.description ?? '—'} />
              <Box>
                <Typography variant="overline" color="text.secondary">Статус</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={state.org.isActive ? 'Активна' : 'Неактивна'}
                    color={state.org.isActive ? 'success' : 'default'}
                  />
                </Box>
              </Box>
              {canEdit ? (
                <Stack direction="row" justifyContent="flex-end">
                  <Button variant="contained" onClick={startEdit}>Редактировать</Button>
                </Stack>
              ) : null}
            </Stack>
          )}
        </CardContent>
      </Card>
      {snack}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{value}</Typography>
    </Box>
  );
}
