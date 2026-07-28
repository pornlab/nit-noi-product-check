'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { Zone } from '@/types/zone';
import type { UserZoneRef } from '@/types/user';
import { zonesApi } from '@/lib/api/zones';
import { useUser } from '@/hooks/use-user';

export function MyZones(): React.JSX.Element {
  const { user } = useUser();
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; items: Zone[] }>({
    loading: true, error: null, items: [],
  });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await zonesApi.list();
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const responsibleMap = new Map((user?.zones ?? []).map((z: UserZoneRef) => [z.id, z.isResponsible]));

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Мои зоны</Typography>
      {state.loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} /><Typography variant="body2">Загрузка…</Typography>
        </Box>
      ) : state.error ? (
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">Повторить</Button>}>
          {state.error}
        </Alert>
      ) : state.items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Вы не назначены ни в одну зону</Typography>
      ) : (
        <Grid container spacing={2}>
          {state.items.map((z) => {
            const responsible = responsibleMap.get(z.id) ?? false;
            return (
              <Grid key={z.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" sx={{ flex: 1 }}>{z.name}</Typography>
                        {responsible ? <Chip size="small" label="Ответственный" color="success" /> : null}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{z.description ?? '—'}</Typography>
                      <Chip size="small" sx={{ alignSelf: 'flex-start' }}
                        label={z.isActive ? 'Активна' : 'Неактивна'}
                        color={z.isActive ? 'success' : 'default'} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}
