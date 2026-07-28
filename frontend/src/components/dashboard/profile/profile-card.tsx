'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';

import type { UserRole } from '@/types/user';
import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
};

const roleColors: Record<UserRole, 'error' | 'warning' | 'info'> = {
  admin: 'error',
  manager: 'warning',
  employee: 'info',
};

export function ProfileCard(): React.JSX.Element | null {
  const router = useRouter();
  const { user, checkSession } = useUser();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    await authClient.signOut();
    await checkSession?.();
    router.replace(paths.auth.signIn);
  }, [checkSession, router]);

  if (!user) return null;

  const role = user.role as UserRole;

  return (
    <Card sx={{ maxWidth: 560 }}>
      <CardHeader
        title="Вы вошли в систему"
        subheader="Информация о текущем пользователе"
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <Field label="Имя" value={user.name} />
          <Field label="Email" value={user.email} />
          <Box>
            <Typography variant="overline" color="text.secondary">
              Роль
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={roleLabels[role] ?? role} color={roleColors[role] ?? 'default'} />
            </Box>
          </Box>
        </Stack>
      </CardContent>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          color="inherit"
          variant="outlined"
          startIcon={<SignOutIcon />}
          onClick={handleSignOut}
        >
          Выйти
        </Button>
      </Box>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Box>
  );
}
