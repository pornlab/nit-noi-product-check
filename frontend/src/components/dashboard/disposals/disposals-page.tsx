'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { InventoryZoneSummary } from '@/types/inventory';
import type { DisposalSummary, DisposalSummaryItem } from '@/types/disposal';
import { currencySymbol } from '@/types/disposal';
import { disposalsApi } from '@/lib/api/disposals';
import { inventoryApi } from '@/lib/api/inventory';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useNotify } from '@/lib/api/notify';
import { useI18n } from '@/lib/i18n/provider';
import type { I18nKey } from '@/lib/i18n/provider';
import { unitLabelKey } from '@/lib/i18n/unit';
import type { Unit } from '@/types/unit';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

function formatQty(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
function formatMoney(v: string | null): string {
  if (v === null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function itemLine(it: DisposalSummaryItem, t: (key: I18nKey) => string): string {
  const base = `${it.productName} — ${formatQty(it.quantity)} ${t(unitLabelKey(it.baseUnit as Unit))}`;
  return it.cost === null ? base : `${base} · ${formatMoney(it.cost)} ${currencySymbol(it.currency)}`;
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DisposalsPage(): React.JSX.Element {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useUser();
  const { notify, view: snack } = useNotify();
  const { confirm, view: confirmView } = useConfirm();
  const isOwner = user?.role === 'admin';

  // Фильтры
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [zoneId, setZoneId] = React.useState<string>('');
  const [role, setRole] = React.useState<'' | 'admin' | 'manager' | 'employee' | 'analytics'>('');

  const [zones, setZones] = React.useState<InventoryZoneSummary[]>([]);
  React.useEffect(() => {
    void (async () => {
      const { data } = await inventoryApi.listZones();
      setZones(data ?? []);
    })();
  }, []);
  const showZoneFilter = zones.length > 1;

  const [state, setState] = React.useState<{
    loading: boolean; error: string | null; items: DisposalSummary[];
  }>({ loading: true, error: null, items: [] });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await disposalsApi.list({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      zoneId: zoneId || undefined,
      role: (isOwner && role) ? role : undefined,
    });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: null, items: data ?? [] });
  }, [dateFrom, dateTo, zoneId, role, isOwner]);

  React.useEffect(() => { void load(); }, [load]);

  const askDelete = (id: string): void => {
    confirm({
      title: t('disposals.deleteConfirmTitle'),
      message: t('disposals.deleteConfirmBody'),
      danger: true,
      onConfirm: async () => {
        const { error } = await disposalsApi.remove(id);
        if (error) { notify(error.message, 'error'); return; }
        notify(t('disposals.deletedNotify'));
        await load();
      },
    });
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, DisposalSummary[]>();
    for (const d of state.items) {
      const key = d.createdAt.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    // Сортируем группы по дате (свежие сверху) и внутри — по времени (свежие сверху).
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, arr]) => ({
        key,
        items: arr.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1)),
      }));
  }, [state.items]);

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  const dayTitle = (isoDay: string): string => {
    const d = new Date(`${isoDay}T00:00:00`);
    if (isSameDay(d, now)) return t('disposals.groupToday');
    if (isSameDay(d, yesterday)) return t('disposals.groupYesterday');
    return fmtDay(`${isoDay}T00:00:00`);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Typography variant="h5">{t('disposals.pageTitle')}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="large" onClick={() => router.push(paths.dashboard.disposalsNew)}>
          {t('disposals.addDisposal')}
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          type="date"
          label={t('disposals.filterDateFrom')}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label={t('disposals.filterDateTo')}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={dateFrom ? { min: dateFrom } : undefined}
          sx={{ minWidth: 160 }}
        />
        {showZoneFilter ? (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('products.filterZoneLabel')}</InputLabel>
            <Select
              label={t('products.filterZoneLabel')}
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">{t('disposals.filterZoneAll')}</MenuItem>
              {zones.map((z) => (
                <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        {isOwner ? (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('disposals.filterRole')}</InputLabel>
            <Select
              label={t('disposals.filterRole')}
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">{t('disposals.filterRoleAll')}</MenuItem>
              <MenuItem value="admin">{t('roles.admin')}</MenuItem>
              <MenuItem value="manager">{t('roles.manager')}</MenuItem>
              <MenuItem value="employee">{t('roles.employee')}</MenuItem>
              <MenuItem value="analytics">{t('roles.analytics')}</MenuItem>
            </Select>
          </FormControl>
        ) : null}
      </Stack>

      {state.loading ? (
        <Card>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
          </Box>
        </Card>
      ) : state.error ? (
        <Card>
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">{t('common.retry')}</Button>}>
              {state.error}
            </Alert>
          </Box>
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {t('disposals.empty')}
            </Typography>
          </Box>
        </Card>
      ) : (
        <Stack spacing={2}>
          {grouped.map((g) => {
            let daySum = 0;
            let dayHasKnown = false;
            let dayHasUnknown = false;
            const currCount = new Map<string, number>();
            for (const d of g.items) {
              for (const it of d.items) {
                if (it.cost === null) dayHasUnknown = true;
                else {
                  dayHasKnown = true;
                  daySum += Number(it.cost) || 0;
                }
                if (it.currency) currCount.set(it.currency, (currCount.get(it.currency) ?? 0) + 1);
              }
            }
            const daySym = currencySymbol(
              [...currCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
            );
            const dayLabel = dayHasKnown
              ? (dayHasUnknown
                ? `> ${formatMoney(String(daySum))} ${daySym}`
                : `${formatMoney(String(daySum))} ${daySym}`)
              : `? ${daySym}`;

            return (
            <Stack key={g.key} spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 0.5, pr: 0.5 }}>
                <Typography variant="overline" color="text.secondary">
                  {dayTitle(g.key)}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="overline" color="error.main" sx={{ fontWeight: 700 }}>
                  {dayLabel}
                </Typography>
              </Stack>
              <Card>
                <Stack divider={<Divider flexItem />}>
                  {g.items.map((d) => (
                    <Stack
                      key={d.id}
                      direction="row"
                      alignItems="flex-start"
                      spacing={2}
                      sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', minWidth: 48, pt: '2px' }}>
                        {fmtTime(d.createdAt)}
                      </Typography>
                      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.zone.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            · {t('disposals.columnSkuCount', { n: d.skuCount })}
                          </Typography>
                          {(() => {
                            const anyUnknown = d.items.some((it) => it.cost === null);
                            const sym = currencySymbol(d.currency);
                            let label: string | null = null;
                            if (d.totalCost === null) {
                              // Все позиции без цены (или позиция одна и без цены).
                              label = `? ${sym}`;
                            } else if (anyUnknown) {
                              // Часть позиций без цены — сумма неполная, ставим «>».
                              label = `> ${formatMoney(d.totalCost)} ${sym}`;
                            } else {
                              label = `${formatMoney(d.totalCost)} ${sym}`;
                            }
                            return (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                · {label}
                              </Typography>
                            );
                          })()}
                        </Stack>
                        {d.items.length > 0 ? (
                          <Stack spacing={0.25}>
                            {d.items.map((it, idx) => (
                              <Typography key={idx} variant="caption" color="text.secondary">
                                {itemLine(it, t)}
                              </Typography>
                            ))}
                          </Stack>
                        ) : null}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, textAlign: 'right', pt: '2px' }}>
                        {d.createdBy.name}
                      </Typography>
                      {isOwner ? (
                        <RowMenu onDelete={() => askDelete(d.id)} deleteLabel={t('disposals.deleteButton')} />
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Stack>
            );
          })}
        </Stack>
      )}

      {snack}
      {confirmView}
    </Stack>
  );
}

function RowMenu({ onDelete, deleteLabel }: { onDelete: () => void; deleteLabel: string }): React.JSX.Element {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
      >
        <DotsThreeVerticalIcon />
      </IconButton>
      <Menu
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={(e) => { e.stopPropagation(); setAnchor(null); onDelete(); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}><TrashIcon /></ListItemIcon>
          {deleteLabel}
        </MenuItem>
      </Menu>
    </>
  );
}
