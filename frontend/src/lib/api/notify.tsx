'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

type Severity = 'success' | 'error' | 'info' | 'warning';

export interface NotifyState {
  open: boolean;
  message: string;
  severity: Severity;
}

export function useNotify() {
  const [state, setState] = React.useState<NotifyState>({ open: false, message: '', severity: 'success' });
  const notify = React.useCallback((message: string, severity: Severity = 'success') => {
    setState({ open: true, message, severity });
  }, []);
  const close = React.useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const view = (
    <Snackbar open={state.open} autoHideDuration={4000} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert onClose={close} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
        {state.message}
      </Alert>
    </Snackbar>
  );
  return { notify, view };
}
