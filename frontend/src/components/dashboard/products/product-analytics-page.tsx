'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { ProductAnalyticsSummary } from '@/types/product-analytics';
import { productsApi } from '@/lib/api/products';
import { currencySymbol } from '@/types/disposal';
import { useI18n } from '@/lib/i18n/provider';
import { unitLabelKey } from '@/lib/i18n/unit';
import type { Unit } from '@/types/unit';
import { paths } from '@/paths';

// ApexCharts не любит SSR — грузим на клиенте.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Preset = '7d' | '30d' | '90d' | 'month' | 'custom';

function todayIso(): string { return new Date().toISOString().slice(0, 10); }
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function formatDayShort(iso: string): string {
  const d = iso.slice(0, 10).split('-');
  return `${d[2]}.${d[1]}`;
}
function formatDate(iso: string): string {
  const d = iso.slice(0, 10).split('-');
  return `${d[2]}.${d[1]}.${d[0]}`;
}
function fmtNum(v: string | number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}
function fmtMoney(v: string | number | null): string {
  if (v === null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function ProductAnalyticsPage({ productId }: { productId: string }): React.JSX.Element {
  const router = useRouter();
  const { t } = useI18n();

  const [preset, setPreset] = React.useState<Preset>('7d');
  const [dateFrom, setDateFrom] = React.useState<string>(daysAgoIso(6));
  const [dateTo, setDateTo] = React.useState<string>(todayIso());

  const applyPreset = (p: Preset): void => {
    setPreset(p);
    switch (p) {
      case '7d': { setDateFrom(daysAgoIso(6)); setDateTo(todayIso()); break; }
      case '30d': { setDateFrom(daysAgoIso(29)); setDateTo(todayIso()); break; }
      case '90d': { setDateFrom(daysAgoIso(89)); setDateTo(todayIso()); break; }
      case 'month': { setDateFrom(monthStartIso()); setDateTo(todayIso()); break; }
      default: { break; }
    }
  };

  const [state, setState] = React.useState<{ loading: boolean; error: string | null; data: ProductAnalyticsSummary | null }>({
    loading: true, error: null, data: null,
  });

  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await productsApi.analytics(productId, dateFrom, dateTo);
    if (error) setState({ loading: false, error: error.message, data: null });
    else setState({ loading: false, error: null, data: data ?? null });
  }, [productId, dateFrom, dateTo]);

  React.useEffect(() => { void load(); }, [load]);

  if (state.loading && !state.data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
        <CircularProgress size={20} /><Typography variant="body2">{t('common.loading')}</Typography>
      </Box>
    );
  }
  if (state.error && !state.data) {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={load} color="inherit" size="small">{t('common.retry')}</Button>}>
          {state.error}
        </Alert>
        <Button onClick={() => router.push(paths.dashboard.products)}>{t('common.backToList')}</Button>
      </Stack>
    );
  }
  if (!state.data) return <Typography variant="body2">—</Typography>;

  const d = state.data;
  const unit = t(unitLabelKey(d.product.baseUnit as Unit));
  const sym = currencySymbol(d.currentStockValue.currency ?? 'THB');
  const dailyByDate = buildDailyBuckets(d.operations, dateFrom, dateTo);

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
        <Link component="button" variant="body2" color="primary" onClick={() => router.push(paths.dashboard.products)} sx={{ textDecoration: 'none' }}>
          {t('products.analyticsTitle')}
        </Link>
        <Typography variant="body2" color="text.secondary">/</Typography>
        <Typography variant="body2" color="text.secondary">{d.product.name}</Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Typography variant="h4">{d.product.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {d.product.sku ? (
              <Typography variant="body2" color="text.secondary">SKU · {d.product.sku}</Typography>
            ) : null}
            {d.product.category ? (
              <Typography variant="body2" color="text.secondary">· {d.product.category.name}</Typography>
            ) : null}
            <Chip
              size="small"
              variant="outlined"
              color={d.product.isActive ? 'success' : 'default'}
              label={d.product.isActive ? t('common.active') : t('common.inactive')}
            />
          </Stack>
        </Stack>

        <Stack spacing={1}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={preset}
            onChange={(_, v: Preset | null) => v && applyPreset(v)}
          >
            <ToggleButton value="7d">{t('products.presetLast7')}</ToggleButton>
            <ToggleButton value="30d">{t('products.presetLast30')}</ToggleButton>
            <ToggleButton value="90d">{t('products.presetLast90')}</ToggleButton>
            <ToggleButton value="month">{t('products.presetMonth')}</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small" type="date" label={t('disposals.filterDateFrom')}
              InputLabelProps={{ shrink: true }}
              value={dateFrom} onChange={(e) => { setPreset('custom'); setDateFrom(e.target.value); }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small" type="date" label={t('disposals.filterDateTo')}
              InputLabelProps={{ shrink: true }}
              value={dateTo} onChange={(e) => { setPreset('custom'); setDateTo(e.target.value); }}
              inputProps={{ min: dateFrom }}
              sx={{ minWidth: 160 }}
            />
          </Stack>
        </Stack>
      </Stack>

      {/* KPI row 1 */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
        <KpiCard
          color="primary"
          label={t('products.kpiCurrentStock')}
          value={<>{fmtNum(d.currentStock.quantity)} <Sub>{unit}</Sub></>}
          sub={t('products.kpiAsOf', { date: formatDate(d.currentStock.asOf) })}
        />
        <KpiCard
          color="primary"
          label={t('products.kpiStockValue')}
          value={<>{sym} {fmtMoney(d.currentStockValue.amount)}</>}
          sub={d.currentStockValue.unitPrice
            ? t('products.kpiUnitPrice', { price: fmtMoney(d.currentStockValue.unitPrice), sym, unit })
            : '—'}
        />
        <KpiCard
          color="success"
          label={t('products.kpiReceivedPeriod')}
          value={<>{fmtNum(d.received.quantity)} <Sub>{unit}</Sub></>}
          sub={t('products.kpiCount', { n: d.received.count })}
        />
        <KpiCard
          color="success"
          label={t('products.kpiReceivedSum')}
          value={<>{sym} {fmtMoney(d.received.cost)}</>}
          sub={t('products.kpiByCost')}
        />
      </Box>

      {/* KPI row 2 */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
        <KpiCard
          color="error"
          label={t('products.kpiDisposedPeriod')}
          value={<>{fmtNum(d.disposed.quantity)} <Sub>{unit}</Sub></>}
          sub={t('products.kpiCount', { n: d.disposed.count })}
        />
        <KpiCard
          color="error"
          label={t('products.kpiDisposedSum')}
          value={<>{sym} {fmtMoney(d.disposed.cost)}</>}
          sub={t('products.kpiByRealization')}
        />
        <KpiCard
          color="primary"
          label={t('products.kpiDiscrepancy')}
          value={d.discrepancy
            ? <>{Number(d.discrepancy.quantity) > 0 ? '+' : ''}{fmtNum(d.discrepancy.quantity)} <Sub>{unit}</Sub></>
            : '—'}
          sub={d.discrepancy ? formatDate(d.discrepancy.date) : t('products.noDiscrepancyData')}
        />
      </Box>

      {/* Chart */}
      <Card>
        <CardContent>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="h6">{t('products.chartTitle')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {`${formatDate(dateFrom)} — ${formatDate(dateTo)}`}
            </Typography>
          </Stack>
          <Chart
            type="area"
            height={320}
            options={{
              chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
              stroke: { curve: 'smooth', width: [2, 2, 2] },
              fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
              dataLabels: { enabled: false },
              legend: { show: true, position: 'top', horizontalAlign: 'right' },
              // Фиксированные цвета для читаемости — независимо от primary-темы (в локалке она красная).
              colors: ['#635bff', '#15b79e', '#f04438'],
              xaxis: {
                type: 'category',
                categories: dailyByDate.map((r) => formatDayShort(r.date)),
                labels: { style: { fontSize: '12px' } },
              },
              yaxis: [
                { seriesName: t('products.chartLegendStock'), labels: { style: { fontSize: '12px' } } },
                { seriesName: t('products.chartLegendReceived'), opposite: true, labels: { style: { fontSize: '12px' } } },
                { seriesName: t('products.chartLegendDisposed'), opposite: true, show: false },
              ],
              tooltip: { theme: 'light', shared: true, intersect: false },
            }}
            series={[
              { name: t('products.chartLegendStock'), data: dailyByDate.map((r) => r.stock) },
              { name: t('products.chartLegendReceived'), data: dailyByDate.map((r) => r.received) },
              { name: t('products.chartLegendDisposed'), data: dailyByDate.map((r) => r.disposed) },
            ]}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t('products.chartAxisNote')}
          </Typography>
        </CardContent>
      </Card>

      {/* Operations table */}
      <Card>
        <Stack direction="row" alignItems="center" sx={{ p: '12px 20px' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>{t('products.opsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('products.opsCount', { n: d.operations.length })}
          </Typography>
        </Stack>
        <Divider />
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('products.opsColumnDate')}</TableCell>
                <TableCell>{t('products.opsColumnType')}</TableCell>
                <TableCell align="right">{t('products.opsColumnQty')}</TableCell>
                <TableCell align="right">{t('products.opsColumnSum')}</TableCell>
                <TableCell>{t('products.opsColumnZone')}</TableCell>
                <TableCell>{t('products.opsColumnUser')}</TableCell>
                <TableCell>{t('products.opsColumnDoc')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {d.operations.map((op, idx) => {
                const qtyNum = Number(op.quantity);
                const isNeg = qtyNum < 0;
                const isPos = qtyNum > 0 && op.type === 'receiving';
                return (
                  <TableRow key={idx}>
                    <TableCell>{formatDate(op.date)}</TableCell>
                    <TableCell>
                      <OpTypeChip type={op.type} label={
                        op.type === 'inventory' ? t('products.opsTypeInventory')
                        : op.type === 'receiving' ? t('products.opsTypeReceiving')
                        : t('products.opsTypeDisposal')
                      } />
                    </TableCell>
                    <TableCell align="right" sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: isNeg ? 'error.main' : isPos ? 'success.main' : 'inherit',
                    }}>
                      {op.quantity.startsWith('+') || op.quantity.startsWith('-') ? op.quantity : op.quantity}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {op.cost === null ? '—' : `${currencySymbol(op.currency ?? 'THB')} ${fmtMoney(op.cost)}`}
                    </TableCell>
                    <TableCell>{op.zone?.name ?? '—'}</TableCell>
                    <TableCell>{op.user?.name ?? '—'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{op.docRef}</TableCell>
                  </TableRow>
                );
              })}
              {d.operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
                    {t('common.nothingFound')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}

function KpiCard({ color, label, value, sub }: {
  color: 'primary' | 'success' | 'error';
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent sx={{ p: '12px 20px', '&:last-child': { pb: '12px' } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${color}.main` }} />
          <Typography variant="overline" color="text.secondary">{label}</Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
        {sub ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Sub({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.7em', fontWeight: 500 }}>{children}</Box>;
}

function OpTypeChip({ type, label }: { type: 'inventory' | 'receiving' | 'disposal'; label: string }): React.JSX.Element {
  const color: 'primary' | 'success' | 'error' =
    type === 'inventory' ? 'primary' : type === 'receiving' ? 'success' : 'error';
  return <Chip size="small" label={label} color={color} variant="outlined" />;
}

/** Собираем ежедневные снимки для графика: остаток (кумулятивно) + приход/утилизация за день. */
function buildDailyBuckets(
  operations: ProductAnalyticsSummary['operations'],
  from: string,
  to: string,
): Array<{ date: string; stock: number; received: number; disposed: number }> {
  // Календарные дни в диапазоне
  const days: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  const buckets = new Map<string, { received: number; disposed: number; inventory: number | null }>();
  for (const d of days) buckets.set(d, { received: 0, disposed: 0, inventory: null });
  for (const op of operations) {
    const dayKey = op.date.slice(0, 10);
    const b = buckets.get(dayKey);
    if (!b) continue;
    const q = Number(op.quantity);
    switch (op.type) {
      case 'receiving': { b.received += Math.abs(q); break; }
      case 'disposal': { b.disposed += Math.abs(q); break; }
      case 'inventory': { b.inventory = (b.inventory ?? 0) + Math.abs(q); break; }
      default: { break; }
    }
  }
  // Строим стоковый график: если в этот день была инв — берём её как «якорь», иначе прогоняем delta.
  const out: Array<{ date: string; stock: number; received: number; disposed: number }> = [];
  let running = 0;
  for (const d of days) {
    const b = buckets.get(d)!;
    running = b.inventory === null ? running + b.received - b.disposed : b.inventory;
    out.push({ date: d, stock: running, received: b.received, disposed: b.disposed });
  }
  return out;
}
