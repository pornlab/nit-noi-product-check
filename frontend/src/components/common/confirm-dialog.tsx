'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  danger?: boolean;
}

export function useConfirm() {
  const [state, setState] = React.useState<ConfirmState>({ open: false, title: '', message: '' });

  const confirm = React.useCallback(
    (opts: { title: string; message: string; danger?: boolean; onConfirm: () => void | Promise<void> }) => {
      setState({ open: true, ...opts });
    },
    [],
  );

  const close = React.useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const view = (
    <Dialog open={state.open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>{state.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{state.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Отмена</Button>
        <Button
          variant="contained"
          color={state.danger ? 'error' : 'primary'}
          onClick={async () => {
            close();
            await state.onConfirm?.();
          }}
        >
          Подтвердить
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, view };
}
