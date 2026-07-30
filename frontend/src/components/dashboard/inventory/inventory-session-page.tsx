'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';

import type { ZoneInventoryProduct, ZoneInventoryResponse } from '@/types/inventory';
import { inventoryApi } from '@/lib/api/inventory';
import { useNotify } from '@/lib/api/notify';
import { useI18n } from '@/lib/i18n/provider';
import { unitLabels } from '@/types/unit';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

function isSameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear()
      && d.getMonth() === ref.getMonth()
      && d.getDate() === ref.getDate();
}

function formatToday(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatLastInventoryLine(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isSameLocalDay(iso, now)) return `сегодня в ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(iso, yesterday)) return `вчера в ${timeStr}`;
  const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dateStr} в ${timeStr}`;
}

// Palette (по ТЗ)
const C_ACCENT = '#5B5BD6';
const C_ACCENT_SOFT = 'rgba(91, 91, 214, 0.08)';
const C_SUCCESS = '#16A370';
const C_TEXT = '#16181D';
const C_MUTED = '#8B909B';
const C_FIELD = '#F7F8FA';
const C_DIVIDER = '#EDEEF1';

type InputMap = Record<string, string>;

function digitsOnly(v: string): string {
  return v.replaceAll(/\D+/g, '');
}

function isFilled(raw: string | undefined): boolean {
  return typeof raw === 'string' && raw.length > 0;
}

function serialize(inputs: InputMap): string {
  return JSON.stringify(inputs);
}

interface Group {
  key: string;
  name: string;
  items: ZoneInventoryProduct[];
}

export function InventorySessionPage({ zoneId }: { zoneId: string }): React.JSX.Element {
  const router = useRouter();
  const { notify, view: snack } = useNotify();
  const { user } = useUser();
  const { t } = useI18n();

  const [state, setState] = React.useState<{ loading: boolean; error: string | null; data: ZoneInventoryResponse | null }>({
    loading: true, error: null, data: null,
  });
  const [inputs, setInputs] = React.useState<InputMap>({});
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Отслеживаем «последний сохранённый» снапшот, чтобы показать «Сохранено ✓»,
  // и сбрасывать его при любом новом изменении.
  const [savedSnapshot, setSavedSnapshot] = React.useState<string | null>(null);

  const draftKey = React.useMemo(() => `inventory:draft:${zoneId}`, [zoneId]);

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await inventoryApi.getZone(zoneId);
    if (error) { setState({ loading: false, error: error.message, data: null }); return; }
    setState({ loading: false, error: null, data: data ?? null });

    // Если employee и инвентаризация уже была сегодня — показываем last-values в read-only.
    // Черновик не восстанавливаем.
    const employeeLockedToday =
      user?.role === 'employee'
      && data?.lastCompletedAt
      && isSameLocalDay(data.lastCompletedAt, new Date());

    if (employeeLockedToday && data) {
      const filled: InputMap = {};
      for (const p of data.products) {
        if (p.lastQuantity !== null) filled[p.id] = String(Number(p.lastQuantity));
      }
      setInputs(filled);
      setSavedSnapshot(null);
      return;
    }

    // Восстанавливаем черновик из localStorage
    if (globalThis.window !== undefined) {
      const raw = globalThis.localStorage.getItem(draftKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as InputMap;
          setInputs(parsed);
          setSavedSnapshot(serialize(parsed));
          return;
        } catch { /* ignore */ }
      }
    }
    setInputs({});
    setSavedSnapshot(null);
  }, [zoneId, draftKey, user?.role]);

  React.useEffect(() => { void load(); }, [load]);

  const grouped: Group[] = React.useMemo(() => {
    const g = new Map<string, Group>();
    for (const p of state.data?.products ?? []) {
      const key = p.category?.id ?? 'no-category';
      const name = p.category?.name ?? t('receivings.withoutCategory');
      const bucket = g.get(key) ?? { key, name, items: [] };
      bucket.items.push(p);
      g.set(key, bucket);
    }
    return [...g.values()];
  }, [state.data, t]);

  const totalProducts = state.data?.products.length ?? 0;
  const totalFilled = React.useMemo(
    () => (state.data?.products ?? []).filter((p) => isFilled(inputs[p.id])).length,
    [state.data, inputs],
  );
  const allFilled = totalProducts > 0 && totalFilled === totalProducts;
  const percent = totalProducts === 0 ? 0 : Math.round((totalFilled / totalProducts) * 100);

  // Compact-режим шапки при скролле (уменьшает шрифты заголовка и процента).
  // Гистерезис: включаем при >64px, выключаем при <16px — исключает осциляцию
  // на пороге (compact уменьшает высоту документа → scrollY смещается → цикл).
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    if (globalThis.window === undefined) return;
    const onScroll = (): void => {
      const y = globalThis.window.scrollY;
      setCompact((prev) => (prev ? y > 16 : y > 64));
    };
    onScroll();
    globalThis.window.addEventListener('scroll', onScroll, { passive: true });
    return () => globalThis.window.removeEventListener('scroll', onScroll);
  }, []);

  // Read-only режим: employee + инвентаризация зоны завершена сегодня
  const readOnly = React.useMemo(() => {
    if (user?.role !== 'employee') return false;
    const iso = state.data?.lastCompletedAt;
    if (!iso) return false;
    return isSameLocalDay(iso, new Date());
  }, [user?.role, state.data?.lastCompletedAt]);

  const isCurrentSaved = savedSnapshot !== null && serialize(inputs) === savedSnapshot;

  // Кнопочные состояния
  type ButtonState = 'draft' | 'saved' | 'complete' | 'empty';
  const buttonState: ButtonState = React.useMemo(() => {
    if (totalProducts === 0) return 'empty';
    if (isCurrentSaved) return 'saved';
    if (allFilled) return 'complete';
    return 'draft';
  }, [totalProducts, allFilled, isCurrentSaved]);

  const handleInput = (productId: string, value: string): void => {
    if (readOnly) return;
    const cleaned = digitsOnly(value);
    setInputs((prev) => {
      const next = { ...prev, [productId]: cleaned };
      // сброс «сохранено» при любом изменении
      if (savedSnapshot !== null && serialize(next) !== savedSnapshot) {
        // savedSnapshot остаётся; кнопка сама пересчитается через isCurrentSaved
      }
      return next;
    });
  };

  const toggleCollapse = (key: string): void => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveDraft = (): void => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.setItem(draftKey, serialize(inputs));
    setSavedSnapshot(serialize(inputs));
    notify(t('inventory.draftSavedDraft'));
  };

  const performComplete = async (): Promise<void> => {
    if (saving || !state.data) return;
    const items: Array<{ productId: string; quantity: number }> = [];
    for (const p of state.data.products) {
      const raw = inputs[p.id] ?? '';
      if (!isFilled(raw)) {
        notify(t('inventory.errorFillAll'), 'error');
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        notify(t('inventory.errorCheckValues'), 'error');
        return;
      }
      items.push({ productId: p.id, quantity: n });
    }
    setSaving(true);
    const { error } = await inventoryApi.create({ zoneId, items });
    setSaving(false);
    if (error) { notify(error.message, 'error'); return; }
    // очистить черновик
    if (globalThis.window !== undefined) {
      globalThis.localStorage.removeItem(draftKey);
    }
    notify(t('inventory.completedForZoneNotify', { zone: state.data.zone.name }));
    await load();
  };

  const handlePrimary = (): void => {
    if (buttonState === 'draft') { saveDraft(); return; }
    if (buttonState === 'complete') { setConfirmOpen(true); return; }
    if (buttonState === 'saved' && allFilled) { setConfirmOpen(true); return; }
    // saved но неполный — повторный клик без изменений: ничего не делаем
  };

  if (state.loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
        <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
      </Box>
    );
  }
  if (state.error) {
    return (
      <Stack spacing={2} sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">{t('common.retry')}</Button>}>
          {state.error}
        </Alert>
        <Button component={RouterLink} href={paths.dashboard.inventory}>{t('common.backToList')}</Button>
      </Stack>
    );
  }
  if (!state.data) return <Typography variant="body2">—</Typography>;

  // Кнопка визуализация
  const buttonBg = buttonState === 'saved' ? C_SUCCESS
                 : buttonState === 'complete' ? C_ACCENT
                 : buttonState === 'draft' ? C_ACCENT
                 : C_DIVIDER;
  const buttonLabel = buttonState === 'saved' ? t('inventory.draftSaved')
                     : buttonState === 'complete' ? t('inventory.draftComplete')
                     : buttonState === 'draft' ? t('inventory.draftSaveDraft')
                     : t('inventory.noPositions');

  return (
    <>
      <Box sx={{
        width: '100%',
        maxWidth: { xs: 720, md: '100%' },
        mx: 'auto',
        color: C_TEXT,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}>

        {/* Sticky header — прилипает ниже MainNav (у неё top:0, --MainNav-height=56px) */}
        <Box sx={{
          position: 'sticky', top: 'var(--MainNav-height, 56px)', zIndex: 5,
          bgcolor: 'background.paper',
          pt: compact ? 1 : 'clamp(12px, 3vw, 20px)',
          pb: compact ? 1.25 : 2,
          borderBottom: `1px solid ${C_DIVIDER}`,
          transition: 'padding 200ms ease',
        }}>
          {/* «← Зоны» — скрываем в compact, там место занимает компактная кнопка слева */}
          {compact ? null : (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
              <IconButton size="small" onClick={() => router.push(paths.dashboard.inventory)} sx={{ color: C_ACCENT }}>
                <CaretLeftIcon />
              </IconButton>
              <Typography variant="body2" sx={{ color: C_ACCENT, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => router.push(paths.dashboard.inventory)}>
                Зоны
              </Typography>
            </Stack>
          )}

          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: compact ? 1 : 1.5 }}>
            {compact ? (
              <IconButton
                size="small"
                onClick={() => router.push(paths.dashboard.inventory)}
                sx={{ color: C_ACCENT, mr: 0.5 }}
                aria-label="К списку зон"
              >
                <CaretLeftIcon />
              </IconButton>
            ) : null}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {compact ? null : (
                <Typography sx={{
                  fontSize: 'clamp(11px, 2.6vw, 13px)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: C_MUTED,
                  fontWeight: 600,
                }}>
                  {t('inventory.pageTitle')}
                </Typography>
              )}
              <Typography sx={{
                fontSize: compact ? 'clamp(14px, 3.6vw, 18px)' : 'clamp(22px, 6vw, 30px)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                mt: compact ? 0 : 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'font-size 200ms ease',
              }}>
                {state.data.zone.name}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" sx={{ ml: 2 }}>
              <Typography sx={{
                fontSize: compact ? 'clamp(16px, 4vw, 20px)' : 'clamp(28px, 7vw, 36px)',
                fontWeight: 700,
                lineHeight: 1,
                color: allFilled ? C_SUCCESS : C_TEXT,
                letterSpacing: '-0.02em',
                transition: 'font-size 200ms ease',
              }}>
                {percent}%
              </Typography>
              {compact ? (
                <Typography sx={{ fontSize: 11, color: C_MUTED, mt: 0.25 }}>
                  {totalFilled} / {totalProducts}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 12, color: C_MUTED, mt: 0.5 }}>
                  Заполнено {totalFilled} из {totalProducts}
                </Typography>
              )}
            </Stack>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={percent}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: C_DIVIDER,
              '& .MuiLinearProgress-bar': {
                bgcolor: allFilled ? C_SUCCESS : C_ACCENT,
                borderRadius: 3,
                transition: 'transform 300ms ease',
              },
            }}
          />
        </Box>

        {/* Read-only баннер: employee + инвентаризация сегодня */}
        {readOnly && state.data.lastCompletedAt ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            {t('inventory.completedTodayAt', { time: formatToday(state.data.lastCompletedAt) })}
            {state.data.lastCompletedBy ? ` (${state.data.lastCompletedBy.name})` : ''}. Просмотр без возможности изменений.
          </Alert>
        ) : null}

        {/* Инфо о последней инвентаризации — для admin/manager (не в read-only) */}
        {!readOnly && (user?.role === 'admin' || user?.role === 'manager') ? (
          <Box sx={{ mt: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, color: C_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Последняя инвентаризация
            </Typography>
            <Typography sx={{ fontSize: 14, color: C_TEXT, fontWeight: 500 }}>
              {state.data.lastCompletedAt
                ? `${formatLastInventoryLine(state.data.lastCompletedAt)}${state.data.lastCompletedBy ? ` · ${state.data.lastCompletedBy.name}` : ''}`
                : 'ещё не проводилась'}
            </Typography>
          </Box>
        ) : null}

        {/* Список */}
        <Box sx={{ flex: 1, pt: 2 }}>
          {totalProducts === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>{t('inventory.noItemsForZone')}</Alert>
          ) : (
            grouped.map((g) => {
              const filled = g.items.filter((it) => isFilled(inputs[it.id])).length;
              const complete = filled === g.items.length && g.items.length > 0;
              const isCollapsed = collapsed[g.key] ?? false;
              return (
                <Box key={g.key} sx={{ borderBottom: `1px solid ${C_DIVIDER}` }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    onClick={() => toggleCollapse(g.key)}
                    sx={{
                      py: 2,
                      cursor: 'pointer',
                      userSelect: 'none',
                      minHeight: 44,
                    }}
                  >
                    <Typography sx={{
                      flex: 1,
                      fontSize: 'clamp(15px, 3.8vw, 17px)',
                      fontWeight: 600,
                      color: C_TEXT,
                    }}>
                      {g.name}
                    </Typography>

                    <Box sx={{
                      px: 1.5, py: 0.375,
                      borderRadius: 999,
                      bgcolor: complete ? C_SUCCESS : C_DIVIDER,
                      color: complete ? 'white' : C_MUTED,
                      fontSize: 12,
                      fontWeight: 600,
                      minWidth: 44,
                      textAlign: 'center',
                      transition: 'background-color 200ms ease, color 200ms ease',
                    }}>
                      {filled}/{g.items.length}
                    </Box>

                    <Box sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ml: 1,
                      width: 32, height: 32,
                      color: C_MUTED,
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease',
                    }}>
                      <CaretDownIcon />
                    </Box>
                  </Stack>

                  <Collapse in={!isCollapsed} unmountOnExit>
                    <Box sx={{ pb: 1.5 }}>
                      {g.items.map((p) => {
                        const raw = inputs[p.id] ?? '';
                        const filledOk = isFilled(raw);
                        return (
                          <Stack
                            key={p.id}
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            sx={{ py: 1, minHeight: 52 }}
                          >
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%',
                              flexShrink: 0,
                              bgcolor: filledOk ? C_ACCENT : C_DIVIDER,
                              transition: 'background-color 200ms ease',
                            }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{
                                fontSize: 'clamp(14px, 3.5vw, 15px)',
                                color: C_TEXT,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {p.name}
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: C_MUTED, mt: 0.25 }}>
                                {unitLabels[p.unit]}
                              </Typography>
                            </Box>

                            <TextField
                              value={raw}
                              onChange={(e) => handleInput(p.id, e.target.value)}
                              placeholder="0"
                              autoComplete="off"
                              disabled={readOnly}
                              inputProps={{
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                autoComplete: 'off',
                                autoCorrect: 'off',
                                spellCheck: false,
                                name: `qty-${p.id}`,
                                'data-lpignore': 'true',
                                'data-1p-ignore': 'true',
                                'data-form-type': 'other',
                                'aria-label': `qty-${p.id}`,
                                style: { textAlign: 'right', padding: '10px 12px' },
                              }}
                              sx={{
                                width: 96,
                                '& .MuiOutlinedInput-root': {
                                  minHeight: 44,
                                  bgcolor: C_FIELD,
                                  borderRadius: '12px',
                                  fontWeight: 600,
                                  '& fieldset': {
                                    borderColor: filledOk ? C_ACCENT : 'transparent',
                                    borderWidth: filledOk ? 1.5 : 1,
                                  },
                                  '&:hover fieldset': {
                                    borderColor: filledOk ? C_ACCENT : C_DIVIDER,
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: C_ACCENT,
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: C_ACCENT_SOFT,
                                  },
                                },
                              }}
                            />
                          </Stack>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              );
            })
          )}
        </Box>

        {/* Sticky bottom — на мобилке во всю ширину, на десктопе — компактная кнопка справа.
            В read-only режиме (employee, сегодня уже завершено) — скрываем полностью. */}
        <Box sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          bgcolor: 'background.paper',
          borderTop: { xs: `1px solid ${C_DIVIDER}`, md: 'none' },
          pt: { xs: 1.5, md: 2 },
          pb: {
            xs: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            md: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          },
          mt: 2,
          display: readOnly ? 'none' : 'flex',
          justifyContent: { xs: 'stretch', md: 'flex-end' },
        }}>
          <Button
            onClick={handlePrimary}
            disabled={saving || buttonState === 'empty'}
            sx={{
              minHeight: 52,
              width: { xs: '100%', md: 'auto' },
              minWidth: { md: 380 },
              px: { md: 3 },
              borderRadius: '14px',
              bgcolor: buttonBg,
              color: 'white',
              fontWeight: 600,
              fontSize: 15,
              textTransform: 'none',
              boxShadow: 'none',
              transition: 'background-color 200ms ease',
              '&:hover': { bgcolor: buttonBg, opacity: 0.92, boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: C_DIVIDER, color: C_MUTED },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
              {buttonState === 'saved' ? <CheckIcon /> : null}
              <Box sx={{ flex: 1, textAlign: buttonState === 'saved' ? 'left' : 'center' }}>
                {saving ? t('common.saving') : buttonLabel}
              </Box>
              <Box sx={{
                px: 1.25, py: 0.25,
                borderRadius: 999,
                bgcolor: 'rgba(255,255,255,0.22)',
                fontSize: 12,
                fontWeight: 700,
                minWidth: 44,
                textAlign: 'center',
              }}>
                {totalFilled}/{totalProducts}
              </Box>
            </Stack>
          </Button>
        </Box>
      </Box>

      <Dialog open={confirmOpen} onClose={() => (saving ? null : setConfirmOpen(false))} maxWidth="xs" fullWidth>
        <DialogTitle>{t('inventory.confirmCompleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('inventory.confirmCompleteBody', { zone: state.data.zone.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={async () => { setConfirmOpen(false); await performComplete(); }}
            disabled={saving}
            sx={{ bgcolor: C_ACCENT, '&:hover': { bgcolor: C_ACCENT, opacity: 0.92 } }}
          >
            {saving ? t('common.saving') : t('inventory.confirmCompleteBtn')}
          </Button>
        </DialogActions>
      </Dialog>

      {snack}
    </>
  );
}
