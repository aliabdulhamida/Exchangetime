'use client';

import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as BarChartComponent,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import HoldingDetailsModal from '@/components/stock-market/holding-details-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { useIsMobile } from '@/components/ui/use-mobile';

interface StockDataPoint {
  date: string; // yyyy-mm-dd
  close: number;
}

type TransactionSide = 'BUY' | 'SELL';
type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CHF';
type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'ALL';
type AddInputMode = 'manual' | 'automatic';
type HoldingsPanelTab = 'holdings' | 'transactions' | 'insights' | 'allocation';
type HoldingsSort = 'weight' | 'pnl' | 'value' | 'symbol';
type HoldingsFilter = 'all' | 'gainers' | 'losers' | 'highWeight';
type DateRange = { start: string; end: string };

interface PortfolioTransaction {
  id: string;
  symbol: string;
  side: TransactionSide;
  shares: number;
  date: string;
  price: number;
  fees: number;
  taxes: number;
  currency: SupportedCurrency;
}

interface DividendEvent {
  date: string;
  amount: number; // per share (stock quote currency)
}

interface DividendCashEvent {
  symbol: string;
  date: string;
  grossAmount: number; // base currency
  netAmount: number; // base currency
}

interface StockMeta {
  asOfUtc: string | null;
  source: string;
  exchangeTimezone: string | null;
  currency: string | null;
}

interface StockSnapshot {
  points: StockDataPoint[];
  meta: StockMeta;
}

interface HoldingQuoteDetails {
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  dayChange: number | null;
  dayChangePct: number | null;
  source: string | null;
  asOfUtc: string | null;
  shortName: string | null;
  longName: string | null;
  quoteType: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  businessSummary: string | null;
  marketCap: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  epsTrailingTwelveMonths: number | null;
  beta: number | null;
  volume: number | null;
  averageVolume: number | null;
  dividendRate: number | null;
  dividendYieldPct: number | null;
}

interface HoldingSnapshot {
  symbol: string;
  quantity: number;
  openCostBasis: number;
  avgOpenCost: number;
  currentPrice: number | null; // base currency
  currentValue: number; // base currency
  unrealizedPnl: number;
  unrealizedPct: number | null;
  realizedPnl: number;
  dividendReturn: number;
  totalContribution: number;
  weightPct: number;
}

type HoldingSignal = 'highWeight' | 'gainer' | 'loser' | 'flat';
type AllocationBreakdownDatum = {
  name: string;
  value: number;
  weightPct: number;
  holdings: number;
};
type CorrelationCell = {
  symbol: string;
  corr: number | null;
};
type CorrelationMatrixRow = {
  symbol: string;
  cells: CorrelationCell[];
};
type DrawdownAttributionDatum = {
  symbol: string;
  delta: number;
  contributionPct: number;
};

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'GBP', 'CHF'];
const ALLOCATION_FALLBACK_COLORS = [
  '#3b82f6',
  '#06b6d4',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#ec4899',
] as const;
const ALLOCATION_COLOR_MAP: Record<string, Record<string, string>> = {
  Sector: {
    technology: '#3b82f6',
    healthcare: '#22c55e',
    'real estate': '#f97316',
    industrials: '#06b6d4',
    financials: '#a855f7',
    utilities: '#14b8a6',
    energy: '#ef4444',
    materials: '#eab308',
    'consumer discretionary': '#ec4899',
    'consumer staples': '#84cc16',
    communication: '#8b5cf6',
    'communication services': '#8b5cf6',
    other: '#64748b',
    unclassified: '#94a3b8',
  },
  Region: {
    'north america': '#22c55e',
    europe: '#3b82f6',
    'asia-pacific': '#f97316',
    'latin america': '#eab308',
    'middle east & africa': '#ef4444',
    other: '#a855f7',
    unclassified: '#94a3b8',
  },
  'Asset Class': {
    equity: '#3b82f6',
    'etf/etn': '#06b6d4',
    fund: '#a855f7',
    reit: '#f97316',
    bond: '#22c55e',
    index: '#eab308',
    crypto: '#ec4899',
    other: '#64748b',
    unclassified: '#94a3b8',
  },
};
const EUROPE_COUNTRIES = new Set([
  'austria',
  'belgium',
  'denmark',
  'finland',
  'france',
  'germany',
  'ireland',
  'italy',
  'netherlands',
  'norway',
  'portugal',
  'spain',
  'sweden',
  'switzerland',
  'united kingdom',
  'uk',
]);
const APAC_COUNTRIES = new Set([
  'australia',
  'china',
  'hong kong',
  'india',
  'indonesia',
  'japan',
  'malaysia',
  'new zealand',
  'singapore',
  'south korea',
  'taiwan',
  'thailand',
  'vietnam',
]);
const LATAM_COUNTRIES = new Set([
  'argentina',
  'brazil',
  'chile',
  'colombia',
  'mexico',
  'peru',
]);
const MEA_COUNTRIES = new Set([
  'israel',
  'qatar',
  'saudi arabia',
  'south africa',
  'united arab emirates',
  'uae',
]);

function normalizeCurrency(value: unknown): SupportedCurrency {
  const upper = String(value || '').toUpperCase();
  if (upper === 'EUR' || upper === 'GBP' || upper === 'CHF') return upper;
  return 'USD';
}

function toSignedShares(tx: PortfolioTransaction): number {
  return tx.side === 'BUY' ? tx.shares : -tx.shares;
}

function formatMoney(
  value: number,
  currency: SupportedCurrency,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

function formatSignedMoney(value: number | null, currency: SupportedCurrency): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatMoney(value, currency, 2, 2)}`;
}

function metricTone(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'text-muted-foreground';
  return value >= 0 ? 'text-emerald-400' : 'text-rose-400';
}

function chartDomainMin(dataMin: number): number {
  if (!Number.isFinite(dataMin)) return 0;
  const buffer = Math.max(Math.abs(dataMin) * 0.02, 1);
  return dataMin - buffer;
}

function chartDomainMax(dataMax: number): number {
  if (!Number.isFinite(dataMax)) return 1;
  const buffer = Math.max(Math.abs(dataMax) * 0.02, 1);
  return dataMax + buffer;
}

function normalizeDateRange(start: string, end: string): DateRange {
  return start <= end ? { start, end } : { start: end, end: start };
}

function formatShortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolveHoldingSignal(holding: HoldingSnapshot): HoldingSignal {
  if (holding.weightPct >= 15) return 'highWeight';
  if ((holding.unrealizedPct ?? 0) < 0) return 'loser';
  if ((holding.unrealizedPct ?? 0) > 0) return 'gainer';
  return 'flat';
}

function holdingSignalPillClass(signal: HoldingSignal): string {
  if (signal === 'highWeight') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (signal === 'loser') return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
  if (signal === 'gainer') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  return 'border-border bg-background text-muted-foreground';
}

function holdingSignalLabel(signal: HoldingSignal): string {
  if (signal === 'highWeight') return 'High Weight';
  if (signal === 'loser') return 'Loser';
  if (signal === 'gainer') return 'Gainer';
  return 'Flat';
}

function normalizeBucketLabel(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'Unclassified';
}

function resolveRegionFromCountry(country: string | null): string {
  const normalized = country?.trim().toLowerCase();
  if (!normalized) return 'Unclassified';
  if (normalized === 'united states' || normalized === 'usa' || normalized === 'us' || normalized === 'canada') {
    return 'North America';
  }
  if (EUROPE_COUNTRIES.has(normalized)) return 'Europe';
  if (APAC_COUNTRIES.has(normalized)) return 'Asia-Pacific';
  if (LATAM_COUNTRIES.has(normalized)) return 'Latin America';
  if (MEA_COUNTRIES.has(normalized)) return 'Middle East & Africa';
  return 'Other';
}

function resolveAssetClass(quoteType: string | null): string {
  const normalized = quoteType?.trim().toLowerCase();
  if (!normalized) return 'Unclassified';
  if (normalized.includes('etf') || normalized.includes('etn')) return 'ETF/ETN';
  if (normalized.includes('mutual') || normalized.includes('fund')) return 'Fund';
  if (normalized.includes('equity') || normalized.includes('stock')) return 'Equity';
  if (normalized.includes('reit')) return 'REIT';
  if (normalized.includes('bond') || normalized.includes('fixed')) return 'Bond';
  if (normalized.includes('index')) return 'Index';
  if (normalized.includes('crypto') || normalized.includes('coin')) return 'Crypto';
  return 'Other';
}

function buildAllocationBreakdown(
  holdings: HoldingSnapshot[],
  resolveLabel: (holding: HoldingSnapshot) => string | null,
  maxSegments = 6,
): AllocationBreakdownDatum[] {
  if (!holdings.length) return [];
  const totalValue = holdings.reduce((sum, holding) => sum + Math.max(0, holding.currentValue), 0);
  if (totalValue <= 0) return [];

  const grouped = new Map<string, { value: number; holdings: number }>();
  holdings.forEach((holding) => {
    const value = Math.max(0, holding.currentValue);
    if (value <= 0) return;
    const label = normalizeBucketLabel(resolveLabel(holding));
    const entry = grouped.get(label);
    if (entry) {
      entry.value += value;
      entry.holdings += 1;
      return;
    }
    grouped.set(label, { value, holdings: 1 });
  });

  const rows = Array.from(grouped.entries())
    .map(([name, entry]) => ({
      name,
      value: entry.value,
      weightPct: (entry.value / totalValue) * 100,
      holdings: entry.holdings,
    }))
    .sort((a, b) => b.value - a.value);

  if (rows.length <= maxSegments) return rows;

  const leading = rows.slice(0, maxSegments - 1);
  const trailing = rows.slice(maxSegments - 1);
  const other = trailing.reduce(
    (acc, row) => {
      acc.value += row.value;
      acc.holdings += row.holdings;
      return acc;
    },
    { value: 0, holdings: 0 },
  );

  return [
    ...leading,
    {
      name: 'Other',
      value: other.value,
      weightPct: (other.value / totalValue) * 100,
      holdings: other.holdings,
    },
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 4) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx <= 0 || vy <= 0) return null;
  return cov / Math.sqrt(vx * vy);
}

function getAllocationColor(groupTitle: string, label: string, index: number): string {
  const key = label.trim().toLowerCase();
  const mapped = ALLOCATION_COLOR_MAP[groupTitle]?.[key];
  if (mapped) return mapped;

  const seed = `${groupTitle}:${label}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ALLOCATION_FALLBACK_COLORS[(seed + index) % ALLOCATION_FALLBACK_COLORS.length];
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseChartPoints(result: any): StockDataPoint[] {
  const timestamps = result?.timestamp || [];
  const closePrices = result?.indicators?.quote?.[0]?.close || [];
  return timestamps
    .map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      close: closePrices[index],
    }))
    .filter((item: StockDataPoint) => Number.isFinite(item.close));
}

// Prefer quote endpoint first to avoid repeated failing attempts on providers that may be unavailable.
const MARKET_DATA_ENDPOINTS = ['/api/quote', '/api/portfolio-market'] as const;
const MARKET_ENDPOINT_COOLDOWN_MS = 5 * 60 * 1000;
const marketEndpointBackoffUntil: Partial<Record<(typeof MARKET_DATA_ENDPOINTS)[number], number>> =
  {};
const inFlightMarketRequests = new Map<string, Promise<any>>();

function shouldBackoffEndpoint(endpoint: (typeof MARKET_DATA_ENDPOINTS)[number], errorText: string): boolean {
  if (endpoint !== '/api/portfolio-market') return false;
  return (
    errorText.includes('HTTP 500') ||
    errorText.includes('HTTP 502') ||
    errorText.toLowerCase().includes('fmp_api_key') ||
    errorText.toLowerCase().includes('historical endpoint failed') ||
    errorText.toLowerCase().includes('quote endpoint failed')
  );
}

function getDailyPeriod2Unix(): number {
  const now = new Date();
  const endOfUtcDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    59,
  );
  return Math.floor(endOfUtcDay / 1000);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Unknown error';
}

function parseApiErrorMessage(payload: any, fallbackText: string): string {
  const fromJson =
    payload?.error ||
    payload?.details ||
    payload?.message ||
    payload?.finance?.error?.description ||
    payload?.chart?.error?.description;
  if (typeof fromJson === 'string' && fromJson.trim()) return fromJson.trim();
  const trimmedText = fallbackText.trim();
  if (!trimmedText) return 'Unknown API error';
  return trimmedText.slice(0, 200);
}

function resolveMarketSourceLabel(source: unknown): string {
  if (source === 'fmp') return 'Financial Modeling Prep (via /api/portfolio-market)';
  if (source === 'yahoo') return 'Yahoo Finance (via /api/quote)';
  if (source === 'chart') return 'Yahoo Finance (via /api/quote)';
  return 'Market data proxy';
}

async function fetchJsonWithApiError(url: string): Promise<any> {
  const response = await fetch(url, { cache: 'no-store' });
  const rawText = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch {}

  if (!response.ok) {
    const errorText = parseApiErrorMessage(data, rawText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return data;
}

async function fetchChartDataWithFallback(params: URLSearchParams): Promise<any> {
  const query = params.toString();
  const existing = inFlightMarketRequests.get(query);
  if (existing) return existing;

  const requestPromise = (async () => {
    const errors: string[] = [];
    const now = Date.now();
    const preferredEndpoints = MARKET_DATA_ENDPOINTS.filter(
      (endpoint) => (marketEndpointBackoffUntil[endpoint] || 0) <= now,
    );
    const fallbackEndpoints = MARKET_DATA_ENDPOINTS.filter(
      (endpoint) => (marketEndpointBackoffUntil[endpoint] || 0) > now,
    );
    const orderedEndpoints =
      preferredEndpoints.length > 0
        ? [...preferredEndpoints, ...fallbackEndpoints]
        : [...MARKET_DATA_ENDPOINTS];

    for (const endpoint of orderedEndpoints) {
      try {
        const payload = await fetchJsonWithApiError(`${endpoint}?${query}`);
        marketEndpointBackoffUntil[endpoint] = 0;
        return payload;
      } catch (error) {
        const message = toErrorMessage(error);
        errors.push(`${endpoint}: ${message}`);
        if (shouldBackoffEndpoint(endpoint, message)) {
          marketEndpointBackoffUntil[endpoint] = Date.now() + MARKET_ENDPOINT_COOLDOWN_MS;
        }
      }
    }

    throw new Error(errors.join(' | '));
  })();

  inFlightMarketRequests.set(query, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightMarketRequests.delete(query);
  }
}

function getPriceOnOrBefore(series: StockDataPoint[], date: string): number | null {
  if (!series.length) return null;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i].date <= date) return series[i].close;
  }
  return null;
}

function getPriceOnOrAfter(series: StockDataPoint[], date: string): number | null {
  for (const point of series) {
    if (point.date >= date) return point.close;
  }
  return null;
}

function getSeriesFxRate(series: StockDataPoint[] | null | undefined, date?: string): number | null {
  if (!series?.length) return null;
  if (!date) return series[series.length - 1]?.close ?? null;
  return getPriceOnOrAfter(series, date) ?? getPriceOnOrBefore(series, date);
}

function getTimeframeCutoff(timeframe: Timeframe): number | null {
  const daysMap: Record<Exclude<Timeframe, 'ALL'>, number> = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  };
  if (timeframe === 'ALL') return null;
  return Date.now() - daysMap[timeframe] * 24 * 60 * 60 * 1000;
}

function computeSeriesReturnPct(values: number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0) return null;
  return ((last - first) / first) * 100;
}

function computeMaxDrawdownPct(values: number[]): number | null {
  if (values.length < 2) return null;
  let peak = values[0];
  let maxDrawdown = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const drawdown = (value - peak) / peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }
  }
  return maxDrawdown * 100;
}

function xnpv(rate: number, cashflows: Array<{ date: Date; amount: number }>): number {
  const first = cashflows[0]?.date;
  if (!first) return 0;
  return cashflows.reduce((sum, cf) => {
    const days = (cf.date.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
    return sum + cf.amount / Math.pow(1 + rate, days / 365);
  }, 0);
}

function xirr(cashflows: Array<{ date: Date; amount: number }>): number | null {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((cf) => cf.amount > 0);
  const hasNegative = cashflows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  let low = -0.9999;
  let high = 10;
  let fLow = xnpv(low, cashflows);
  let fHigh = xnpv(high, cashflows);

  let expand = 0;
  while (fLow * fHigh > 0 && expand < 16) {
    high *= 2;
    fHigh = xnpv(high, cashflows);
    expand += 1;
  }
  if (fLow * fHigh > 0) return null;

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const fMid = xnpv(mid, cashflows);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

async function fetchDividendData(
  symbol: string,
  startDate: string,
): Promise<DividendEvent[] | { error: string }> {
  try {
    const start = new Date(startDate);
    start.setDate(start.getDate() - 30);
    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = getDailyPeriod2Unix();
    const params = new URLSearchParams({
      symbol,
      chart: '1',
      period1: String(startUnix),
      period2: String(endUnix),
      interval: '1d',
      events: 'div',
    });
    const data = await fetchChartDataWithFallback(params);
    if (!data.chart || !data.chart.result || !data.chart.result[0]) return [];
    const result = data.chart.result[0];
    const dividends = result.events?.dividends
      ? Object.values(result.events.dividends).sort((a: any, b: any) => a.date - b.date)
      : [];
    return dividends.map((div: any) => ({
      date: new Date(div.date * 1000).toISOString().split('T')[0],
      amount: Number(div.amount) || 0,
    }));
  } catch (error: any) {
    return { error: error.message };
  }
}

async function fetchStockSnapshot(symbol: string): Promise<StockSnapshot | { error: string }> {
  try {
    const end = getDailyPeriod2Unix();
    const params = new URLSearchParams({
      symbol,
      chart: '1',
      period1: '0',
      period2: String(end),
      interval: '1d',
    });
    const data = await fetchChartDataWithFallback(params);
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('Invalid data format received');
    }
    const result = data.chart.result[0];
    const points = parseChartPoints(result);
    const regularMarketTime = result.meta?.regularMarketTime;
    const asOfUtc =
      typeof regularMarketTime === 'number'
        ? new Date(regularMarketTime * 1000).toISOString()
        : new Date().toISOString();
    const meta: StockMeta = {
      asOfUtc,
      source: resolveMarketSourceLabel(data.source),
      exchangeTimezone: result.meta?.exchangeTimezoneName ?? null,
      currency: result.meta?.currency ?? data.currency ?? null,
    };
    return { points, meta };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function fetchFxSeries(
  from: SupportedCurrency,
  to: SupportedCurrency,
): Promise<StockDataPoint[] | { error: string }> {
  if (from === to) return [];

  const fetchPair = async (pair: string): Promise<StockDataPoint[] | null> => {
    const end = getDailyPeriod2Unix();
    const params = new URLSearchParams({
      symbol: pair,
      chart: '1',
      period1: '0',
      period2: String(end),
      interval: '1d',
    });
    try {
      const data = await fetchChartDataWithFallback(params);
      const result = data?.chart?.result?.[0];
      if (!result) return null;
      const points = parseChartPoints(result);
      return points.length ? points : null;
    } catch {
      return null;
    }
  };

  try {
    const directPair = `${from}${to}=X`;
    const direct = await fetchPair(directPair);
    if (direct) return direct;

    const reversePair = `${to}${from}=X`;
    const reverse = await fetchPair(reversePair);
    if (reverse) {
      return reverse
        .filter((point) => point.close !== 0)
        .map((point) => ({ date: point.date, close: 1 / point.close }));
    }

    return { error: `FX rate not available for ${from}/${to}` };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function fetchStockData(
  symbol: string,
): Promise<StockDataPoint[] | { error: string }> {
  const snapshot = await fetchStockSnapshot(symbol);
  if ('error' in snapshot) return snapshot;
  return snapshot.points;
}

export default function PortfolioTracker() {
  const isMobile = useIsMobile();
  const [stockData, setStockData] = useState<Record<string, StockDataPoint[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('stockData');
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });
  const [stockMeta, setStockMeta] = useState<Record<string, StockMeta>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('stockMeta');
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });
  const [dividendData, setDividendData] = useState<Record<string, DividendEvent[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('dividendData');
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });
  const [fxData, setFxData] = useState<Record<string, StockDataPoint[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('portfolioFxData');
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('portfolioTransactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (t: any) =>
                typeof t?.symbol === 'string' &&
                typeof t?.shares === 'number' &&
                typeof t?.date === 'string' &&
                (t?.side === 'BUY' || t?.side === 'SELL'),
            )
            .map((t: any) => ({
              id:
                typeof t.id === 'string' && t.id.length > 0
                  ? t.id
                  : `tx-${t.symbol}-${t.date}-${Math.random().toString(36).slice(2, 8)}`,
              symbol: String(t.symbol).toUpperCase(),
              side: t.side as TransactionSide,
              shares: Number(t.shares),
              date: t.date,
              price: Number(t.price) || 0,
              fees: Number(t.fees) || 0,
              taxes: Number(t.taxes) || 0,
              currency: normalizeCurrency(t.currency),
            }));
        }
      }

      // Legacy fallback
      const legacy = localStorage.getItem('purchases');
      const parsedLegacy = legacy ? JSON.parse(legacy) : [];
      if (!Array.isArray(parsedLegacy)) return [];
      return parsedLegacy
        .filter(
          (p: any) =>
            typeof p?.symbol === 'string' &&
            typeof p?.shares === 'number' &&
            typeof p?.date === 'string',
        )
        .map((p: any, idx: number) => ({
          id: `legacy-buy-${idx}-${p.symbol}-${p.date}`,
          symbol: String(p.symbol).toUpperCase(),
          side: 'BUY' as const,
          shares: Number(p.shares),
          date: p.date,
          price: Number(p.price) || 0,
          fees: Number(p.fees) || 0,
          taxes: Number(p.taxes) || 0,
          currency: normalizeCurrency(p.currency),
        }));
    } catch {
      return [];
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [addInputMode, setAddInputMode] = useState<AddInputMode>('manual');
  const [holdingsPanelTab, setHoldingsPanelTab] = useState<HoldingsPanelTab>('holdings');
  const [holdingSearch, setHoldingSearch] = useState('');
  const [holdingsSort, setHoldingsSort] = useState<HoldingsSort>('weight');
  const [holdingsFilter, setHoldingsFilter] = useState<HoldingsFilter>('all');
  const [search, setSearch] = useState('');
  const [transactionSide, setTransactionSide] = useState<TransactionSide>('BUY');
  const [transactionValue, setTransactionValue] = useState('');
  const [fillPrice, setFillPrice] = useState('');
  const [fees, setFees] = useState('');
  const [taxes, setTaxes] = useState('');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tradeCurrency, setTradeCurrency] = useState<SupportedCurrency>('USD');

  const [activeChart, setActiveChart] = useState<'value' | 'dividends'>('value');
  const [valueChartStyle, setValueChartStyle] = useState<'area' | 'line'>('area');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('ALL');
  const [dividendYear, setDividendYear] = useState<number>(() => new Date().getFullYear());
  const [performanceDragRange, setPerformanceDragRange] = useState<DateRange | null>(null);

  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>(() => {
    if (typeof window === 'undefined') return 'USD';
    return normalizeCurrency(localStorage.getItem('portfolioBaseCurrency'));
  });
  const [dividendWithholdingPct, setDividendWithholdingPct] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = Number(localStorage.getItem('portfolioDividendWithholdingPct'));
    return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('portfolioSelectedSymbol') || '';
  });
  const [holdingModalSymbol, setHoldingModalSymbol] = useState<string | null>(null);
  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [holdingQuoteCache, setHoldingQuoteCache] = useState<Record<string, HoldingQuoteDetails>>({});
  const [holdingQuoteLoadingBySymbol, setHoldingQuoteLoadingBySymbol] = useState<
    Record<string, boolean>
  >({});
  const [holdingQuoteErrorBySymbol, setHoldingQuoteErrorBySymbol] = useState<
    Record<string, string | null>
  >({});

  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [dividendLoading, setDividendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const trackedSymbols = useMemo(
    () => Array.from(new Set(transactions.map((tx) => tx.symbol))).sort(),
    [transactions],
  );

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date),
      ),
    [transactions],
  );

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeout = setTimeout(() => {
      localStorage.setItem('portfolioTransactions', JSON.stringify(transactions));
      localStorage.setItem('stockData', JSON.stringify(stockData));
      localStorage.setItem('stockMeta', JSON.stringify(stockMeta));
      localStorage.setItem('dividendData', JSON.stringify(dividendData));
      localStorage.setItem('portfolioFxData', JSON.stringify(fxData));
      localStorage.setItem('portfolioBaseCurrency', baseCurrency);
      localStorage.setItem('portfolioDividendWithholdingPct', String(dividendWithholdingPct));
      localStorage.setItem('portfolioSelectedSymbol', selectedSymbol);
    }, 300);
    return () => clearTimeout(timeout);
  }, [
    transactions,
    stockData,
    stockMeta,
    dividendData,
    fxData,
    baseCurrency,
    dividendWithholdingPct,
    selectedSymbol,
  ]);

  const stockCurrencyForSymbol = useCallback(
    (symbol: string): SupportedCurrency => {
      const fromMeta = stockMeta[symbol]?.currency;
      if (fromMeta) return normalizeCurrency(fromMeta);
      const tx = transactions.find((item) => item.symbol === symbol);
      return tx ? tx.currency : baseCurrency;
    },
    [stockMeta, transactions, baseCurrency],
  );

  const fetchAndCacheStock = useCallback(
    async (symbol: string, force = false) => {
      if (!force && stockData[symbol]?.length) return;
      const snapshot = await fetchStockSnapshot(symbol);
      if ('error' in snapshot) {
        setError(`Could not fetch data for ${symbol}: ${snapshot.error}`);
        return;
      }
      setStockData((prev) => ({ ...prev, [symbol]: snapshot.points }));
      setStockMeta((prev) => ({ ...prev, [symbol]: snapshot.meta }));
      setLastRefreshAt(new Date().toISOString());
    },
    [stockData],
  );

  const fetchAndCacheDividends = useCallback(
    async (symbol: string, force = false) => {
      if (!force && dividendData[symbol]) return;
      const earliestBuy = transactions
        .filter((tx) => tx.symbol === symbol && tx.side === 'BUY')
        .map((tx) => tx.date)
        .sort()[0];
      if (!earliestBuy) return;
      setDividendLoading(true);
      const payload = await fetchDividendData(symbol, earliestBuy);
      setDividendLoading(false);
      if (Array.isArray(payload)) {
        setDividendData((prev) => ({ ...prev, [symbol]: payload }));
      }
    },
    [transactions, dividendData],
  );

  const fxKey = useCallback((from: SupportedCurrency, to: SupportedCurrency) => `${from}_${to}`, []);

  const fetchAndCacheFx = useCallback(
    async (from: SupportedCurrency, to: SupportedCurrency, force = false): Promise<StockDataPoint[] | null> => {
      if (from === to) return [];
      const key = fxKey(from, to);
      if (!force && fxData[key]?.length) return fxData[key];
      const payload = await fetchFxSeries(from, to);
      if ('error' in payload) return null;
      setFxData((prev) => ({ ...prev, [key]: payload }));
      return payload;
    },
    [fxData, fxKey],
  );

  useEffect(() => {
    trackedSymbols.forEach((symbol) => {
      if (!stockData[symbol]) {
        fetchAndCacheStock(symbol);
      }
      const hasBuyTx = transactions.some((tx) => tx.symbol === symbol && tx.side === 'BUY');
      if (hasBuyTx && !dividendData[symbol]) {
        fetchAndCacheDividends(symbol);
      }
    });
    if (!stockData.SPY) {
      fetchAndCacheStock('SPY');
    }
  }, [trackedSymbols, stockData, transactions, dividendData, fetchAndCacheStock, fetchAndCacheDividends]);

  const requiredFxPairs = useMemo(() => {
    const set = new Set<SupportedCurrency>([baseCurrency]);
    transactions.forEach((tx) => set.add(tx.currency));
    trackedSymbols.forEach((symbol) => set.add(stockCurrencyForSymbol(symbol)));
    return Array.from(set)
      .filter((currency) => currency !== baseCurrency)
      .map((currency) => ({ from: currency, to: baseCurrency }));
  }, [baseCurrency, transactions, trackedSymbols, stockCurrencyForSymbol]);

  useEffect(() => {
    requiredFxPairs.forEach(({ from, to }) => {
      fetchAndCacheFx(from, to);
    });
  }, [requiredFxPairs, fetchAndCacheFx]);

  useEffect(() => {
    if (!trackedSymbols.length) return;
    const interval = setInterval(() => {
      trackedSymbols.forEach((symbol) => fetchAndCacheStock(symbol, true));
      fetchAndCacheStock('SPY', true);
    }, 900000);
    return () => clearInterval(interval);
  }, [trackedSymbols, fetchAndCacheStock]);

  useEffect(() => {
    if (!trackedSymbols.length) {
      if (selectedSymbol) setSelectedSymbol('');
      return;
    }
    const exists = trackedSymbols.includes(selectedSymbol);
    if (!exists) {
      const fallback = trackedSymbols[0];
      setSelectedSymbol(fallback);
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolioSelectedSymbol', fallback);
        window.dispatchEvent(new CustomEvent('portfolio-symbol-selected', { detail: { symbol: fallback } }));
      }
    }
  }, [trackedSymbols, selectedSymbol]);

  const getFxRate = useCallback(
    (from: SupportedCurrency, to: SupportedCurrency, date?: string): number | null => {
      if (from === to) return 1;
      const series = fxData[fxKey(from, to)] || [];
      if (!series.length) return null;
      if (!date) return series[series.length - 1]?.close ?? null;
      const rate = getPriceOnOrAfter(series, date) ?? getPriceOnOrBefore(series, date);
      return rate ?? null;
    },
    [fxData, fxKey],
  );

  const convertToBase = useCallback(
    (amount: number, fromCurrency: SupportedCurrency, date?: string): number => {
      const rate = getFxRate(fromCurrency, baseCurrency, date);
      if (rate === null) return amount;
      return amount * rate;
    },
    [baseCurrency, getFxRate],
  );

  const getCurrentPrice = useCallback(
    (symbol: string): number | null => {
      const data = stockData[symbol];
      if (!data?.length) return null;
      return data[data.length - 1].close;
    },
    [stockData],
  );

  const getHistoricalPrice = useCallback(
    (symbol: string, date: string): number | null => {
      const data = stockData[symbol];
      if (!data?.length) return null;
      return getPriceOnOrAfter(data, date) ?? getPriceOnOrBefore(data, date);
    },
    [stockData],
  );

  const resolveTxPrice = useCallback(
    (tx: PortfolioTransaction): number => {
      if (tx.price > 0) return tx.price;
      return getHistoricalPrice(tx.symbol, tx.date) ?? 0;
    },
    [getHistoricalPrice],
  );

  const openQuantityBySymbol = useMemo(() => {
    const map = new Map<string, number>();
    sortedTransactions.forEach((tx) => {
      map.set(tx.symbol, (map.get(tx.symbol) || 0) + toSignedShares(tx));
    });
    return map;
  }, [sortedTransactions]);

  const selectHoldingSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioSelectedSymbol', symbol);
      window.dispatchEvent(new CustomEvent('portfolio-symbol-selected', { detail: { symbol } }));
    }
  }, []);

  const fetchHoldingQuoteDetails = useCallback(
    async (symbol: string) => {
      if (!symbol) return;

      setHoldingQuoteLoadingBySymbol((prev) => ({ ...prev, [symbol]: true }));
      setHoldingQuoteErrorBySymbol((prev) => ({ ...prev, [symbol]: null }));
      try {
        const period2 = Math.floor(Date.now() / 1000);
        const period1 = Math.max(0, period2 - 5 * 365 * 24 * 60 * 60);
        const chartParams = new URLSearchParams({
          symbol,
          chart: '1',
          period1: String(period1),
          period2: String(period2),
          interval: '1d',
          includePrePost: 'false',
        });

        const [chartResult, quoteResult, metricsResult, dcfResult] = await Promise.allSettled([
          fetchJsonWithApiError(`/api/quote?${chartParams.toString()}`),
          fetchJsonWithApiError(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
          fetchJsonWithApiError(`/api/metrics?symbol=${encodeURIComponent(symbol)}`),
          fetchJsonWithApiError(`/api/dcf?symbol=${encodeURIComponent(symbol)}`),
        ]);

        const chartPayload = chartResult.status === 'fulfilled' ? chartResult.value : null;
        const quotePayload = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
        const metricsPayload = metricsResult.status === 'fulfilled' ? metricsResult.value : null;
        const dcfPayload = dcfResult.status === 'fulfilled' ? dcfResult.value : null;

        if (!chartPayload && !quotePayload) {
          const chartError =
            chartResult.status === 'rejected' ? toErrorMessage(chartResult.reason) : 'No chart payload';
          const quoteError =
            quoteResult.status === 'rejected' ? toErrorMessage(quoteResult.reason) : 'No quote payload';
          throw new Error(`${chartError} | ${quoteError}`);
        }

        const result = chartPayload?.chart?.result?.[0] || null;
        const chartMeta = result?.meta || {};
        const quoteMeta = quotePayload?.meta || {};
        const quoteCompany = quotePayload?.company || {};
        const quoteMetrics = quotePayload?.metrics || {};

        const closesRaw: unknown[] = Array.isArray(result?.indicators?.quote?.[0]?.close)
          ? result.indicators.quote[0].close
          : [];
        const closes = closesRaw
          .map((value) => toNullableNumber(value))
          .filter((value): value is number => value !== null);
        const volumesRaw: unknown[] = Array.isArray(result?.indicators?.quote?.[0]?.volume)
          ? result.indicators.quote[0].volume
          : [];
        const volumes = volumesRaw
          .map((value) => toNullableNumber(value))
          .filter((value): value is number => value !== null && value >= 0);

        const latestClose = closes.length ? closes[closes.length - 1] : null;
        const previousCloseFromSeries = closes.length > 1 ? closes[closes.length - 2] : null;
        const price =
          toNullableNumber(chartMeta?.regularMarketPrice) ??
          toNullableNumber(quotePayload?.price) ??
          toNullableNumber(dcfPayload?.price) ??
          toNullableNumber(chartMeta?.currentTradingPeriod?.post?.close) ??
          latestClose;
        const previousClose =
          toNullableNumber(chartMeta?.previousClose) ??
          toNullableNumber(quotePayload?.previousClose) ??
          toNullableNumber(chartMeta?.chartPreviousClose) ??
          previousCloseFromSeries;
        const dayChange = price !== null && previousClose !== null ? price - previousClose : null;
        const dayChangePct =
          dayChange !== null && previousClose !== null && previousClose !== 0
            ? (dayChange / previousClose) * 100
            : null;
        const regularMarketTime =
          toNullableNumber(chartMeta?.regularMarketTime) ??
          toNullableNumber(quoteMeta?.regularMarketTime);
        const asOfUtc = Number.isFinite(regularMarketTime)
          ? new Date((regularMarketTime as number) * 1000).toISOString()
          : null;
        const averageVolumeFromSeries = volumes.length
          ? volumes.slice(-20).reduce((acc, current) => acc + current, 0) /
            Math.min(20, volumes.length)
          : null;
        const dividendYieldRaw = toNullableNumber(chartMeta?.dividendYield);
        const dividendYieldPct =
          dividendYieldRaw !== null
            ? Math.abs(dividendYieldRaw) <= 1
              ? dividendYieldRaw * 100
              : dividendYieldRaw
            : null;

        const mergedDividendYieldPct =
          toNullableNumber(quoteMetrics?.dividendYieldPct) ??
          toNullableNumber(metricsPayload?.dividendYield) ??
          dividendYieldPct;
        const resolvedSource = resolveMarketSourceLabel(
          toNullableString(chartPayload?.source) ||
            toNullableString(quotePayload?.source) ||
            'chart',
        );
        const resolvedLongName =
          toNullableString(quoteCompany?.longName) ||
          toNullableString(quoteMeta?.longName) ||
          toNullableString(chartMeta?.longName) ||
          toNullableString(metricsPayload?.companyName);
        const resolvedShortName =
          toNullableString(quoteCompany?.shortName) ||
          toNullableString(quoteMeta?.shortName) ||
          toNullableString(chartMeta?.shortName) ||
          toNullableString(metricsPayload?.companyName);
        const resolvedQuoteType =
          toNullableString(quoteCompany?.quoteType) ||
          toNullableString(quoteMeta?.instrumentType) ||
          toNullableString(chartMeta?.instrumentType);
        const resolvedExchange =
          toNullableString(quoteCompany?.exchange) ||
          toNullableString(chartMeta?.fullExchangeName) ||
          toNullableString(chartMeta?.exchangeName) ||
          toNullableString(quoteMeta?.fullExchangeName) ||
          toNullableString(quoteMeta?.exchangeName);

        setHoldingQuoteCache((prev) => ({
          ...prev,
          [symbol]: {
            price,
            previousClose,
            currency:
              toNullableString(quotePayload?.currency) ||
              toNullableString(chartMeta?.currency) ||
              toNullableString(dcfPayload?.currency),
            dayChange,
            dayChangePct,
            source: resolvedSource,
            asOfUtc,
            shortName: resolvedShortName,
            longName: resolvedLongName,
            quoteType: resolvedQuoteType,
            exchange: resolvedExchange,
            sector: toNullableString(quoteCompany?.sector),
            industry: toNullableString(quoteCompany?.industry),
            country: toNullableString(quoteCompany?.country),
            website: toNullableString(quoteCompany?.website),
            businessSummary: toNullableString(quoteCompany?.businessSummary),
            marketCap:
              toNullableNumber(quoteMetrics?.marketCap) ??
              toNullableNumber(chartMeta?.marketCap),
            dayHigh:
              toNullableNumber(quoteMetrics?.dayHigh) ??
              toNullableNumber(chartMeta?.regularMarketDayHigh),
            dayLow:
              toNullableNumber(quoteMetrics?.dayLow) ??
              toNullableNumber(chartMeta?.regularMarketDayLow),
            fiftyTwoWeekHigh:
              toNullableNumber(quoteMetrics?.fiftyTwoWeekHigh) ??
              toNullableNumber(chartMeta?.fiftyTwoWeekHigh),
            fiftyTwoWeekLow:
              toNullableNumber(quoteMetrics?.fiftyTwoWeekLow) ??
              toNullableNumber(chartMeta?.fiftyTwoWeekLow),
            trailingPE:
              toNullableNumber(quoteMetrics?.trailingPE) ??
              toNullableNumber(metricsPayload?.peRatio) ??
              toNullableNumber(chartMeta?.trailingPE),
            forwardPE:
              toNullableNumber(quoteMetrics?.forwardPE) ??
              toNullableNumber(chartMeta?.forwardPE),
            epsTrailingTwelveMonths:
              toNullableNumber(quoteMetrics?.epsTrailingTwelveMonths) ??
              toNullableNumber(chartMeta?.epsTrailingTwelveMonths),
            beta:
              toNullableNumber(quoteMetrics?.beta) ??
              toNullableNumber(chartMeta?.beta),
            volume:
              toNullableNumber(quoteMetrics?.volume) ??
              toNullableNumber(chartMeta?.regularMarketVolume),
            averageVolume:
              toNullableNumber(quoteMetrics?.averageVolume) ??
              toNullableNumber(chartMeta?.averageDailyVolume3Month) ??
              toNullableNumber(chartMeta?.averageDailyVolume10Day) ??
              averageVolumeFromSeries,
            dividendRate:
              toNullableNumber(quoteMetrics?.dividendRate) ??
              toNullableNumber(chartMeta?.dividendRate),
            dividendYieldPct: mergedDividendYieldPct,
          },
        }));
      } catch (error) {
        setHoldingQuoteErrorBySymbol((prev) => ({ ...prev, [symbol]: toErrorMessage(error) }));
      } finally {
        setHoldingQuoteLoadingBySymbol((prev) => ({ ...prev, [symbol]: false }));
      }
    },
    [],
  );

  const openHoldingDetails = useCallback(
    (symbol: string) => {
      selectHoldingSymbol(symbol);
      setHoldingModalSymbol(symbol);
      setHoldingModalOpen(true);
    },
    [selectHoldingSymbol],
  );

  const handleAddTransaction = async () => {
    const symbol = search.trim().toUpperCase();
    const nValue = Number.parseFloat(transactionValue);
    const nManualPrice = Number.parseFloat(fillPrice);
    const nFees = Math.max(0, Number.parseFloat(fees || '0') || 0);
    const nTaxes = Math.max(0, Number.parseFloat(taxes || '0') || 0);
    const isManualInput = addInputMode === 'manual';

    if (!symbol || Number.isNaN(nValue) || nValue <= 0 || !buyDate) {
      setError('Please fill in symbol, date and value.');
      return;
    }
    if (isManualInput && (Number.isNaN(nManualPrice) || nManualPrice <= 0)) {
      setError('Please enter a valid execution price for manual mode.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9._-]{0,14}$/.test(symbol)) {
      setError('Please enter a valid ticker symbol.');
      return;
    }
    setLoading(true);
    setError(null);
    const snapshot = await fetchStockSnapshot(symbol);
    if ('error' in snapshot) {
      setError(`Could not fetch market data for ${symbol}: ${snapshot.error}`);
      setLoading(false);
      return;
    }
    setStockData((prev) => ({ ...prev, [symbol]: snapshot.points }));
    setStockMeta((prev) => ({ ...prev, [symbol]: snapshot.meta }));
    setLastRefreshAt(new Date().toISOString());

    const marketPrice =
      getPriceOnOrAfter(snapshot.points, buyDate) ??
      getPriceOnOrBefore(snapshot.points, buyDate) ??
      snapshot.points[snapshot.points.length - 1]?.close ??
      null;

    if (!isManualInput && (!marketPrice || marketPrice <= 0)) {
      setError('Automatic mode could not determine a market price for that date.');
      setLoading(false);
      return;
    }

    const inferredCurrency = normalizeCurrency(snapshot.meta.currency || tradeCurrency);
    const txCurrency = tradeCurrency;
    let txPrice = isManualInput ? nManualPrice : (marketPrice as number);

    if (!isManualInput && inferredCurrency !== txCurrency) {
      const inferredToBaseSeries =
        inferredCurrency === baseCurrency
          ? []
          : ((await fetchAndCacheFx(inferredCurrency, baseCurrency)) ??
            fxData[fxKey(inferredCurrency, baseCurrency)]);
      const txToBaseSeries =
        txCurrency === baseCurrency
          ? []
          : ((await fetchAndCacheFx(txCurrency, baseCurrency)) ?? fxData[fxKey(txCurrency, baseCurrency)]);
      const inferredToBase = inferredCurrency === baseCurrency ? 1 : getSeriesFxRate(inferredToBaseSeries, buyDate);
      const txToBase = txCurrency === baseCurrency ? 1 : getSeriesFxRate(txToBaseSeries, buyDate);

      if (!inferredToBase || inferredToBase <= 0 || !txToBase || txToBase <= 0) {
        setError(`Automatic mode could not convert ${inferredCurrency} to ${txCurrency} for ${buyDate}.`);
        setLoading(false);
        return;
      }

      txPrice = (txPrice * inferredToBase) / txToBase;
    }

    if (!Number.isFinite(txPrice) || txPrice <= 0) {
      setError('Could not determine a valid transaction price.');
      setLoading(false);
      return;
    }

    const computedShares = nValue / txPrice;
    const nShares = Number(computedShares.toFixed(8));
    if (!Number.isFinite(nShares) || nShares <= 0) {
      setError('Could not derive a valid share quantity from value and price.');
      setLoading(false);
      return;
    }
    if (transactionSide === 'SELL') {
      const openQty = openQuantityBySymbol.get(symbol) || 0;
      if (nShares > openQty + 1e-8) {
        setError(`Not enough shares to sell. Available: ${openQty.toFixed(4)}.`);
        setLoading(false);
        return;
      }
    }

    if (transactionSide === 'BUY') {
      await fetchAndCacheDividends(symbol, true);
    }
    if (txCurrency !== baseCurrency) {
      await fetchAndCacheFx(txCurrency, baseCurrency);
    }

    const tx: PortfolioTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol,
      side: transactionSide,
      shares: nShares,
      date: buyDate,
      price: txPrice,
      fees: nFees,
      taxes: nTaxes,
      currency: txCurrency,
    };

    setTransactions((prev) => [...prev, tx]);
    if (!selectedSymbol) selectHoldingSymbol(symbol);
    setSearch('');
    setTransactionValue('');
    setFillPrice('');
    setFees('');
    setTaxes('');
    setBuyDate(new Date().toISOString().slice(0, 10));
    setTransactionSide('BUY');
    setAddInputMode('manual');
    setShowAddForm(false);
    setLoading(false);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));
  };

  const handleDeleteHolding = (symbol: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Remove all transactions for ${symbol}?`);
      if (!confirmed) return;
    }
    setTransactions((prev) => prev.filter((tx) => tx.symbol !== symbol));
  };

  const handleReload = async () => {
    if (!trackedSymbols.length) return;
    setReloading(true);
    setError(null);
    await Promise.all(trackedSymbols.map((symbol) => fetchAndCacheStock(symbol, true)));
    await Promise.all(
      trackedSymbols
        .filter((symbol) => transactions.some((tx) => tx.symbol === symbol && tx.side === 'BUY'))
        .map((symbol) => fetchAndCacheDividends(symbol, true)),
    );
    await fetchAndCacheStock('SPY', true);
    setLastRefreshAt(new Date().toISOString());
    setReloading(false);
  };

  const dividendCashEvents = useMemo(() => {
    const events: DividendCashEvent[] = [];
    Object.entries(dividendData).forEach(([symbol, symbolEvents]) => {
      if (!symbolEvents?.length) return;
      const stockCurrency = stockCurrencyForSymbol(symbol);
      symbolEvents.forEach((event) => {
        const sharesHeld = sortedTransactions
          .filter((tx) => tx.symbol === symbol && tx.date <= event.date)
          .reduce((sum, tx) => sum + toSignedShares(tx), 0);
        if (sharesHeld <= 0) return;
        const grossNative = sharesHeld * event.amount;
        const grossBase = convertToBase(grossNative, stockCurrency, event.date);
        const netBase = grossBase * (1 - dividendWithholdingPct / 100);
        events.push({
          symbol,
          date: event.date,
          grossAmount: grossBase,
          netAmount: netBase,
        });
      });
    });
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [
    dividendData,
    sortedTransactions,
    stockCurrencyForSymbol,
    convertToBase,
    dividendWithholdingPct,
  ]);

  const dividendNetBySymbol = useMemo(() => {
    const map = new Map<string, number>();
    dividendCashEvents.forEach((event) => {
      map.set(event.symbol, (map.get(event.symbol) || 0) + event.netAmount);
    });
    return map;
  }, [dividendCashEvents]);

  const dividendHistory = useMemo(() => {
    if (!dividendCashEvents.length) return [] as Array<{ date: string; amount: number }>;
    const byDate: Record<string, number> = {};
    dividendCashEvents.forEach((event) => {
      byDate[event.date] = (byDate[event.date] || 0) + event.netAmount;
    });
    return Object.entries(byDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dividendCashEvents]);

  const monthlyDividendHistory = useMemo(() => {
    if (!dividendHistory.length) return [] as { date: string; month: string; amount: number }[];
    const grouped: Record<string, number> = {};
    dividendHistory.forEach((entry) => {
      const d = new Date(`${entry.date}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + entry.amount;
    });
    return Object.entries(grouped)
      .map(([month, amount]) => ({ date: `${month}-01`, month, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dividendHistory]);

  const allDividendYears = useMemo(() => {
    const years = new Set<number>();
    monthlyDividendHistory.forEach((entry) => years.add(new Date(entry.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthlyDividendHistory]);

  useEffect(() => {
    if (!allDividendYears.length) return;
    if (!allDividendYears.includes(dividendYear)) {
      setDividendYear(allDividendYears[0]);
    }
  }, [allDividendYears, dividendYear]);

  const holdingSnapshots = useMemo(() => {
    const bySymbol = new Map<string, PortfolioTransaction[]>();
    sortedTransactions.forEach((tx) => {
      const bucket = bySymbol.get(tx.symbol) || [];
      bucket.push(tx);
      bySymbol.set(tx.symbol, bucket);
    });

    const rows: Omit<HoldingSnapshot, 'weightPct'>[] = [];
    bySymbol.forEach((symbolTx, symbol) => {
      const lots: Array<{ qty: number; costPerShare: number }> = [];
      let realizedPnl = 0;

      for (const tx of symbolTx) {
        const px = resolveTxPrice(tx);
        const txGross = tx.shares * px;
        if (tx.side === 'BUY') {
          const totalCostBase = convertToBase(txGross + tx.fees + tx.taxes, tx.currency, tx.date);
          const costPerShareBase = tx.shares > 0 ? totalCostBase / tx.shares : 0;
          lots.push({ qty: tx.shares, costPerShare: costPerShareBase });
        } else {
          const proceedsBase = convertToBase(txGross - tx.fees - tx.taxes, tx.currency, tx.date);
          const netPerShareBase = tx.shares > 0 ? proceedsBase / tx.shares : 0;
          let remaining = tx.shares;
          while (remaining > 0 && lots.length > 0) {
            const lot = lots[0];
            const matched = Math.min(lot.qty, remaining);
            realizedPnl += matched * (netPerShareBase - lot.costPerShare);
            lot.qty -= matched;
            remaining -= matched;
            if (lot.qty <= 1e-9) lots.shift();
          }
        }
      }

      const quantity = lots.reduce((sum, lot) => sum + lot.qty, 0);
      const openCostBasis = lots.reduce((sum, lot) => sum + lot.qty * lot.costPerShare, 0);
      const avgOpenCost = quantity > 0 ? openCostBasis / quantity : 0;
      const nativeCurrentPrice = getCurrentPrice(symbol);
      const convertedCurrentPrice =
        nativeCurrentPrice === null
          ? null
          : convertToBase(nativeCurrentPrice, stockCurrencyForSymbol(symbol));
      const currentValue = convertedCurrentPrice !== null ? convertedCurrentPrice * quantity : 0;
      const unrealizedPnl = currentValue - openCostBasis;
      const unrealizedPct = openCostBasis > 0 ? (unrealizedPnl / openCostBasis) * 100 : null;
      const dividendReturn = dividendNetBySymbol.get(symbol) || 0;
      const totalContribution = realizedPnl + unrealizedPnl + dividendReturn;

      if (quantity > 0 || Math.abs(realizedPnl) > 0.0001 || Math.abs(dividendReturn) > 0.0001) {
        rows.push({
          symbol,
          quantity,
          openCostBasis,
          avgOpenCost,
          currentPrice: convertedCurrentPrice,
          currentValue,
          unrealizedPnl,
          unrealizedPct,
          realizedPnl,
          dividendReturn,
          totalContribution,
        });
      }
    });

    const totalCurrentValue = rows.reduce((sum, row) => sum + row.currentValue, 0);
    return rows
      .map((row) => ({
        ...row,
        weightPct: totalCurrentValue > 0 ? (row.currentValue / totalCurrentValue) * 100 : 0,
      }))
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [
    sortedTransactions,
    resolveTxPrice,
    convertToBase,
    getCurrentPrice,
    stockCurrencyForSymbol,
    dividendNetBySymbol,
  ]);

  const sectorBreakdownData = useMemo(
    () =>
      buildAllocationBreakdown(
        holdingSnapshots,
        (holding) => holdingQuoteCache[holding.symbol]?.sector || 'Unclassified',
        7,
      ),
    [holdingSnapshots, holdingQuoteCache],
  );

  const regionBreakdownData = useMemo(
    () =>
      buildAllocationBreakdown(
        holdingSnapshots,
        (holding) => resolveRegionFromCountry(holdingQuoteCache[holding.symbol]?.country),
        7,
      ),
    [holdingSnapshots, holdingQuoteCache],
  );

  const assetClassBreakdownData = useMemo(
    () =>
      buildAllocationBreakdown(
        holdingSnapshots,
        (holding) => resolveAssetClass(holdingQuoteCache[holding.symbol]?.quoteType),
        7,
      ),
    [holdingSnapshots, holdingQuoteCache],
  );

  const pendingInsightsMetadataSymbols = useMemo(
    () =>
      holdingSnapshots.filter(
        (holding) =>
          !holdingQuoteCache[holding.symbol] &&
          !holdingQuoteLoadingBySymbol[holding.symbol] &&
          !holdingQuoteErrorBySymbol[holding.symbol],
      ),
    [holdingSnapshots, holdingQuoteCache, holdingQuoteLoadingBySymbol, holdingQuoteErrorBySymbol],
  );

  const concentrationMetrics = useMemo(() => {
    const top1 = holdingSnapshots[0]?.weightPct ?? 0;
    const top3 = holdingSnapshots.slice(0, 3).reduce((sum, holding) => sum + holding.weightPct, 0);
    const top5 = holdingSnapshots.slice(0, 5).reduce((sum, holding) => sum + holding.weightPct, 0);
    const hhi = holdingSnapshots.reduce(
      (sum, holding) => sum + Math.pow(holding.weightPct / 100, 2),
      0,
    ) * 10000;
    const level =
      hhi >= 2500 || top1 >= 25 ? 'High' : hhi >= 1500 || top1 >= 18 ? 'Moderate' : 'Low';
    const levelTone =
      level === 'High'
        ? 'text-rose-400'
        : level === 'Moderate'
          ? 'text-amber-300'
          : 'text-emerald-400';
    return { top1, top3, top5, hhi, level, levelTone };
  }, [holdingSnapshots]);

  const visibleHoldingSnapshots = useMemo(() => {
    const query = holdingSearch.trim().toUpperCase();
    let filtered = holdingSnapshots.filter((holding) =>
      query ? holding.symbol.includes(query) : true,
    );

    if (holdingsFilter === 'gainers') {
      filtered = filtered.filter((holding) => (holding.unrealizedPct ?? 0) > 0);
    } else if (holdingsFilter === 'losers') {
      filtered = filtered.filter((holding) => (holding.unrealizedPct ?? 0) < 0);
    } else if (holdingsFilter === 'highWeight') {
      filtered = filtered.filter((holding) => holding.weightPct >= 15);
    }

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (holdingsSort === 'symbol') return a.symbol.localeCompare(b.symbol);
      if (holdingsSort === 'pnl') return b.unrealizedPnl - a.unrealizedPnl;
      if (holdingsSort === 'weight') return b.weightPct - a.weightPct;
      return b.currentValue - a.currentValue;
    });
    return sorted;
  }, [holdingSnapshots, holdingSearch, holdingsFilter, holdingsSort]);

  const currentPortfolioValue = useMemo(
    () => holdingSnapshots.reduce((sum, row) => sum + row.currentValue, 0),
    [holdingSnapshots],
  );

  const totalUnrealizedPnl = useMemo(
    () => holdingSnapshots.reduce((sum, row) => sum + row.unrealizedPnl, 0),
    [holdingSnapshots],
  );

  const totalRealizedPnl = useMemo(
    () => holdingSnapshots.reduce((sum, row) => sum + row.realizedPnl, 0),
    [holdingSnapshots],
  );

  const totalDividendIncomeNet = useMemo(
    () => dividendCashEvents.reduce((sum, event) => sum + event.netAmount, 0),
    [dividendCashEvents],
  );

  const ttmDividends = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    let gross = 0;
    let net = 0;
    dividendCashEvents.forEach((event) => {
      const date = new Date(`${event.date}T00:00:00`);
      if (date >= cutoff) {
        gross += event.grossAmount;
        net += event.netAmount;
      }
    });
    return { gross, net };
  }, [dividendCashEvents]);

  const investedCapital = useMemo(
    () =>
      sortedTransactions
        .filter((tx) => tx.side === 'BUY')
        .reduce((sum, tx) => {
          const px = resolveTxPrice(tx);
          return sum + convertToBase(tx.shares * px + tx.fees + tx.taxes, tx.currency, tx.date);
        }, 0),
    [sortedTransactions, resolveTxPrice, convertToBase],
  );

  const withdrawnCapital = useMemo(
    () =>
      sortedTransactions
        .filter((tx) => tx.side === 'SELL')
        .reduce((sum, tx) => {
          const px = resolveTxPrice(tx);
          return sum + convertToBase(tx.shares * px - tx.fees - tx.taxes, tx.currency, tx.date);
        }, 0),
    [sortedTransactions, resolveTxPrice, convertToBase],
  );

  const priceReturn = totalRealizedPnl + totalUnrealizedPnl;
  const totalReturn = priceReturn + totalDividendIncomeNet;
  const totalReturnPct = investedCapital > 0 ? (totalReturn / investedCapital) * 100 : null;
  const annualYield = currentPortfolioValue > 0 ? (ttmDividends.net / currentPortfolioValue) * 100 : null;

  const portfolioHistory = useMemo(() => {
    const allDates = new Set<string>();
    trackedSymbols.forEach((symbol) => {
      (stockData[symbol] || []).forEach((point) => allDates.add(point.date));
    });
    const sortedDates = Array.from(allDates).sort();
    if (!sortedDates.length || !sortedTransactions.length) return [] as Array<{ date: string; value: number }>;

    const earliestDate = sortedTransactions[0].date;
    const dates = sortedDates.filter((date) => date >= earliestDate);
    if (!dates.length) return [];

    return dates.map((date) => {
      let total = 0;
      trackedSymbols.forEach((symbol) => {
        const quantity = sortedTransactions
          .filter((tx) => tx.symbol === symbol && tx.date <= date)
          .reduce((sum, tx) => sum + toSignedShares(tx), 0);
        if (quantity <= 0) return;
        const price = getPriceOnOrBefore(stockData[symbol] || [], date);
        if (price === null) return;
        const basePrice = convertToBase(price, stockCurrencyForSymbol(symbol), date);
        total += quantity * basePrice;
      });
      return { date, value: total };
    });
  }, [trackedSymbols, stockData, sortedTransactions, convertToBase, stockCurrencyForSymbol]);

  const timeframePortfolioHistory = useMemo(() => {
    if (!portfolioHistory.length) return [];
    const cutoff = getTimeframeCutoff(activeTimeframe);
    if (!cutoff) return portfolioHistory;
    return portfolioHistory.filter((point) => new Date(point.date).getTime() >= cutoff);
  }, [portfolioHistory, activeTimeframe]);

  const filteredPortfolioHistory = timeframePortfolioHistory;

  const filteredDividendHistory = useMemo(() => {
    if (activeChart !== 'dividends') return monthlyDividendHistory;
    return monthlyDividendHistory.filter((entry) => new Date(entry.date).getFullYear() === dividendYear);
  }, [monthlyDividendHistory, activeChart, dividendYear]);

  const totalReturnPctForRange = useMemo(
    () => computeSeriesReturnPct(filteredPortfolioHistory.map((point) => point.value)),
    [filteredPortfolioHistory],
  );

  const benchmarkHistory = useMemo(() => {
    const spy = stockData.SPY || [];
    return spy.map((point) => ({
      date: point.date,
      value: convertToBase(point.close, 'USD', point.date),
    }));
  }, [stockData, convertToBase]);

  const timeframeBenchmarkHistory = useMemo(() => {
    if (!benchmarkHistory.length) return [];
    const cutoff = getTimeframeCutoff(activeTimeframe);
    if (!cutoff) return benchmarkHistory;
    return benchmarkHistory.filter((point) => new Date(point.date).getTime() >= cutoff);
  }, [benchmarkHistory, activeTimeframe]);

  const filteredBenchmarkHistory = timeframeBenchmarkHistory;

  const benchmarkReturnPctForRange = useMemo(
    () => computeSeriesReturnPct(filteredBenchmarkHistory.map((point) => point.value)),
    [filteredBenchmarkHistory],
  );

  const insightsComparisonChartData = useMemo(() => {
    if (filteredPortfolioHistory.length < 2 || filteredBenchmarkHistory.length < 2) return [];
    const portfolioByDate = new Map(filteredPortfolioHistory.map((point) => [point.date, point.value]));
    const benchmarkByDate = new Map(filteredBenchmarkHistory.map((point) => [point.date, point.value]));
    const commonDates = filteredPortfolioHistory
      .map((point) => point.date)
      .filter((date) => benchmarkByDate.has(date));
    if (commonDates.length < 2) return [];

    const firstPortfolioValue = portfolioByDate.get(commonDates[0]);
    const firstBenchmarkValue = benchmarkByDate.get(commonDates[0]);
    if (
      !Number.isFinite(firstPortfolioValue) ||
      !Number.isFinite(firstBenchmarkValue) ||
      (firstPortfolioValue ?? 0) <= 0 ||
      (firstBenchmarkValue ?? 0) <= 0
    ) {
      return [];
    }

    const safeFirstPortfolio = firstPortfolioValue as number;
    const safeFirstBenchmark = firstBenchmarkValue as number;

    return commonDates.map((date) => {
      const portfolioPoint = portfolioByDate.get(date);
      const benchmarkPoint = benchmarkByDate.get(date);
      return {
        date,
        portfolio: ((portfolioPoint ?? safeFirstPortfolio) / safeFirstPortfolio) * 100,
        benchmark: ((benchmarkPoint ?? safeFirstBenchmark) / safeFirstBenchmark) * 100,
      };
    });
  }, [filteredPortfolioHistory, filteredBenchmarkHistory]);

  const excessVsBenchmark = useMemo(() => {
    if (totalReturnPctForRange === null || benchmarkReturnPctForRange === null) return null;
    return totalReturnPctForRange - benchmarkReturnPctForRange;
  }, [totalReturnPctForRange, benchmarkReturnPctForRange]);

  const diversificationInsight = useMemo(() => {
    const topHoldings = holdingSnapshots.filter((holding) => holding.weightPct > 0).slice(0, 8);
    if (topHoldings.length < 2) {
      return {
        score: null as number | null,
        averageCorrelation: null as number | null,
        pairCount: 0,
        minOverlapDays: 0,
        matrix: [] as CorrelationMatrixRow[],
      };
    }

    const cutoff = getTimeframeCutoff(activeTimeframe);
    const returnsBySymbol = new Map<string, Map<string, number>>();

    topHoldings.forEach((holding) => {
      const series = (stockData[holding.symbol] || []).filter((point) =>
        cutoff ? new Date(`${point.date}T00:00:00`).getTime() >= cutoff : true,
      );
      if (series.length < 10) return;

      const returnMap = new Map<string, number>();
      let previousBasePrice: number | null = null;
      series.forEach((point) => {
        const basePrice = convertToBase(
          point.close,
          stockCurrencyForSymbol(holding.symbol),
          point.date,
        );
        if (previousBasePrice !== null && previousBasePrice > 0) {
          returnMap.set(point.date, (basePrice - previousBasePrice) / previousBasePrice);
        }
        previousBasePrice = basePrice;
      });
      if (returnMap.size >= 8) returnsBySymbol.set(holding.symbol, returnMap);
    });

    const symbols = topHoldings
      .map((holding) => holding.symbol)
      .filter((symbol) => returnsBySymbol.has(symbol));
    if (symbols.length < 2) {
      return {
        score: null as number | null,
        averageCorrelation: null as number | null,
        pairCount: 0,
        minOverlapDays: 0,
        matrix: [] as CorrelationMatrixRow[],
      };
    }

    const weightsBySymbol = new Map(
      topHoldings.map((holding) => [holding.symbol, holding.weightPct / 100]),
    );
    let weightedCorrTotal = 0;
    let corrWeightTotal = 0;
    let pairCount = 0;
    let minOverlapDays = Number.POSITIVE_INFINITY;

    const matrix: CorrelationMatrixRow[] = symbols.map((rowSymbol, rowIndex) => {
      const rowMap = returnsBySymbol.get(rowSymbol)!;
      const cells = symbols.map((colSymbol, colIndex) => {
        if (rowIndex === colIndex) return { symbol: colSymbol, corr: 1 };

        const colMap = returnsBySymbol.get(colSymbol)!;
        const sharedDates = Array.from(rowMap.keys()).filter((date) => colMap.has(date));
        if (sharedDates.length < 8) return { symbol: colSymbol, corr: null };

        const xs = sharedDates.map((date) => rowMap.get(date) ?? 0);
        const ys = sharedDates.map((date) => colMap.get(date) ?? 0);
        const corr = computeCorrelation(xs, ys);

        if (corr !== null && rowIndex < colIndex) {
          pairCount += 1;
          minOverlapDays = Math.min(minOverlapDays, sharedDates.length);
          const pairWeight = (weightsBySymbol.get(rowSymbol) || 0) * (weightsBySymbol.get(colSymbol) || 0);
          if (pairWeight > 0) {
            weightedCorrTotal += corr * pairWeight;
            corrWeightTotal += pairWeight;
          }
        }
        return { symbol: colSymbol, corr };
      });
      return { symbol: rowSymbol, cells };
    });

    const averageCorrelation = corrWeightTotal > 0 ? weightedCorrTotal / corrWeightTotal : null;
    const score = averageCorrelation === null ? null : clamp((1 - averageCorrelation) * 50, 0, 100);

    return {
      score,
      averageCorrelation,
      pairCount,
      minOverlapDays: Number.isFinite(minOverlapDays) ? minOverlapDays : 0,
      matrix,
    };
  }, [
    holdingSnapshots,
    activeTimeframe,
    stockData,
    convertToBase,
    stockCurrencyForSymbol,
  ]);

  const drawdownInsight = useMemo(() => {
    if (filteredPortfolioHistory.length < 2) {
      return {
        peakDate: null as string | null,
        troughDate: null as string | null,
        drawdownPct: null as number | null,
        attribution: [] as DrawdownAttributionDatum[],
      };
    }

    let rollingPeak = filteredPortfolioHistory[0];
    let peakAtWorst = filteredPortfolioHistory[0];
    let troughAtWorst = filteredPortfolioHistory[0];
    let worstDrawdown = 0;

    filteredPortfolioHistory.forEach((point) => {
      if (point.value > rollingPeak.value) rollingPeak = point;
      if (rollingPeak.value <= 0) return;
      const drawdown = ((point.value - rollingPeak.value) / rollingPeak.value) * 100;
      if (drawdown < worstDrawdown) {
        worstDrawdown = drawdown;
        peakAtWorst = rollingPeak;
        troughAtWorst = point;
      }
    });

    if (worstDrawdown >= 0) {
      return {
        peakDate: null as string | null,
        troughDate: null as string | null,
        drawdownPct: null as number | null,
        attribution: [] as DrawdownAttributionDatum[],
      };
    }

    const peakDate = peakAtWorst.date;
    const troughDate = troughAtWorst.date;
    const peakValue = peakAtWorst.value;

    const attribution = trackedSymbols
      .map((symbol) => {
        const quantityAtPeak = sortedTransactions
          .filter((tx) => tx.symbol === symbol && tx.date <= peakDate)
          .reduce((sum, tx) => sum + toSignedShares(tx), 0);
        const quantityAtTrough = sortedTransactions
          .filter((tx) => tx.symbol === symbol && tx.date <= troughDate)
          .reduce((sum, tx) => sum + toSignedShares(tx), 0);
        if (quantityAtPeak <= 0 && quantityAtTrough <= 0) return null;

        const peakPrice = getPriceOnOrBefore(stockData[symbol] || [], peakDate);
        const troughPrice = getPriceOnOrBefore(stockData[symbol] || [], troughDate);

        const peakPositionValue =
          quantityAtPeak > 0 && peakPrice !== null
            ? quantityAtPeak * convertToBase(peakPrice, stockCurrencyForSymbol(symbol), peakDate)
            : 0;
        const troughPositionValue =
          quantityAtTrough > 0 && troughPrice !== null
            ? quantityAtTrough * convertToBase(troughPrice, stockCurrencyForSymbol(symbol), troughDate)
            : 0;

        const delta = troughPositionValue - peakPositionValue;
        return {
          symbol,
          delta,
          contributionPct: peakValue > 0 ? (delta / peakValue) * 100 : 0,
        };
      })
      .filter((entry): entry is DrawdownAttributionDatum => Boolean(entry))
      .filter((entry) => entry.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 6);

    return {
      peakDate,
      troughDate,
      drawdownPct: worstDrawdown,
      attribution,
    };
  }, [
    filteredPortfolioHistory,
    trackedSymbols,
    sortedTransactions,
    stockData,
    convertToBase,
    stockCurrencyForSymbol,
  ]);

  const maxDrawdownPct = useMemo(
    () => computeMaxDrawdownPct(portfolioHistory.map((point) => point.value)),
    [portfolioHistory],
  );

  const largestHoldingWeight = holdingSnapshots[0]?.weightPct ?? 0;

  const timeWeightedReturnPct = useMemo(() => {
    if (portfolioHistory.length < 2) return null;
    const flowByDate = new Map<string, number>();
    sortedTransactions.forEach((tx) => {
      const px = resolveTxPrice(tx);
      const nativeAmount =
        tx.side === 'BUY'
          ? tx.shares * px + tx.fees + tx.taxes
          : tx.shares * px - tx.fees - tx.taxes;
      const amountBase = convertToBase(nativeAmount, tx.currency, tx.date);
      const contribution = tx.side === 'BUY' ? amountBase : -amountBase;
      flowByDate.set(tx.date, (flowByDate.get(tx.date) || 0) + contribution);
    });

    let factor = 1;
    let validPeriods = 0;
    for (let i = 1; i < portfolioHistory.length; i += 1) {
      const prev = portfolioHistory[i - 1].value;
      const current = portfolioHistory[i].value;
      if (prev <= 0) continue;
      const cashFlow = flowByDate.get(portfolioHistory[i].date) || 0;
      const periodReturn = (current - prev - cashFlow) / prev;
      if (!Number.isFinite(periodReturn)) continue;
      factor *= 1 + periodReturn;
      validPeriods += 1;
    }
    if (!validPeriods) return null;
    return (factor - 1) * 100;
  }, [portfolioHistory, sortedTransactions, resolveTxPrice, convertToBase]);

  const moneyWeightedReturnPct = useMemo(() => {
    if (!sortedTransactions.length) return null;
    const byDate = new Map<string, number>();
    sortedTransactions.forEach((tx) => {
      const px = resolveTxPrice(tx);
      const gross = tx.shares * px;
      const net =
        tx.side === 'BUY'
          ? -(gross + tx.fees + tx.taxes)
          : gross - tx.fees - tx.taxes;
      const baseFlow = convertToBase(net, tx.currency, tx.date);
      byDate.set(tx.date, (byDate.get(tx.date) || 0) + baseFlow);
    });
    dividendCashEvents.forEach((event) => {
      byDate.set(event.date, (byDate.get(event.date) || 0) + event.netAmount);
    });
    const terminalDate = new Date().toISOString().slice(0, 10);
    byDate.set(terminalDate, (byDate.get(terminalDate) || 0) + currentPortfolioValue);

    const flows = Array.from(byDate.entries())
      .map(([date, amount]) => ({
        date: new Date(`${date}T00:00:00`),
        amount,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const irr = xirr(flows);
    return irr === null ? null : irr * 100;
  }, [
    sortedTransactions,
    resolveTxPrice,
    convertToBase,
    dividendCashEvents,
    currentPortfolioValue,
  ]);

  const dividendPaymentsCount = dividendCashEvents.length;

  const dividendIncomePerMonth = useMemo(() => {
    if (dividendHistory.length < 2) return totalDividendIncomeNet;
    const firstDate = new Date(`${dividendHistory[0].date}T00:00:00`);
    const lastDate = new Date(`${dividendHistory[dividendHistory.length - 1].date}T00:00:00`);
    const months = Math.max(
      1,
      Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    return totalDividendIncomeNet / months;
  }, [dividendHistory, totalDividendIncomeNet]);

  const recentTransactions = useMemo(
    () => [...sortedTransactions].slice(-6).reverse(),
    [sortedTransactions],
  );

  const activeHoldingModalSnapshot = useMemo(
    () =>
      holdingModalSymbol ? holdingSnapshots.find((row) => row.symbol === holdingModalSymbol) || null : null,
    [holdingModalSymbol, holdingSnapshots],
  );

  const activeHoldingModalTransactions = useMemo(
    () =>
      holdingModalSymbol
        ? sortedTransactions
            .filter((tx) => tx.symbol === holdingModalSymbol)
            .slice()
            .reverse()
        : [],
    [holdingModalSymbol, sortedTransactions],
  );

  const activeHoldingModalSeries = useMemo(
    () => (holdingModalSymbol ? stockData[holdingModalSymbol] || [] : []),
    [holdingModalSymbol, stockData],
  );

  const activeHoldingModalMeta = useMemo(
    () => (holdingModalSymbol ? stockMeta[holdingModalSymbol] || null : null),
    [holdingModalSymbol, stockMeta],
  );

  const activeHoldingModalQuote = useMemo(
    () => (holdingModalSymbol ? holdingQuoteCache[holdingModalSymbol] || null : null),
    [holdingModalSymbol, holdingQuoteCache],
  );

  const activeHoldingModalLoading = useMemo(
    () => (holdingModalSymbol ? Boolean(holdingQuoteLoadingBySymbol[holdingModalSymbol]) : false),
    [holdingModalSymbol, holdingQuoteLoadingBySymbol],
  );

  const activeHoldingModalError = useMemo(
    () => (holdingModalSymbol ? holdingQuoteErrorBySymbol[holdingModalSymbol] || null : null),
    [holdingModalSymbol, holdingQuoteErrorBySymbol],
  );

  const autoModePreview = useMemo(() => {
    if (addInputMode !== 'automatic') return null;
    const symbol = search.trim().toUpperCase();
    if (!symbol || !buyDate) return null;
    const series = stockData[symbol];
    if (!series?.length) return null;
    const resolved =
      getPriceOnOrAfter(series, buyDate) ??
      getPriceOnOrBefore(series, buyDate) ??
      series[series.length - 1]?.close ??
      null;
    if (!resolved || !Number.isFinite(resolved)) return null;
    const marketCurrency = normalizeCurrency(stockMeta[symbol]?.currency || tradeCurrency);
    const txCurrency = tradeCurrency;
    let txPrice: number | null = resolved;
    if (marketCurrency !== txCurrency) {
      const marketToBase = marketCurrency === baseCurrency ? 1 : getFxRate(marketCurrency, baseCurrency, buyDate);
      const txToBase = txCurrency === baseCurrency ? 1 : getFxRate(txCurrency, baseCurrency, buyDate);
      if (!marketToBase || marketToBase <= 0 || !txToBase || txToBase <= 0) {
        txPrice = null;
      } else {
        txPrice = (resolved * marketToBase) / txToBase;
      }
    }
    const enteredValue = Number.parseFloat(transactionValue);
    const estimatedShares =
      txPrice && Number.isFinite(enteredValue) && enteredValue > 0 ? enteredValue / txPrice : null;
    return {
      marketPrice: resolved,
      marketCurrency,
      txPrice,
      txCurrency,
      estimatedShares,
    };
  }, [addInputMode, baseCurrency, buyDate, getFxRate, search, stockData, stockMeta, tradeCurrency, transactionValue]);

  const returnsSummaryLabel = formatPercent(timeWeightedReturnPct, 1);
  const riskSummaryLabel = formatPercent(maxDrawdownPct, 1);
  const benchmarkSummaryLabel = formatPercent(excessVsBenchmark, 1);
  const dragOverlayRange = performanceDragRange
    ? normalizeDateRange(performanceDragRange.start, performanceDragRange.end)
    : null;
  const activeSelectionRange = dragOverlayRange;

  const selectedRangeStartPoint = useMemo(() => {
    if (!activeSelectionRange) return null;
    for (const point of timeframePortfolioHistory) {
      if (point.date >= activeSelectionRange.start && point.date <= activeSelectionRange.end) {
        return point;
      }
    }
    return null;
  }, [timeframePortfolioHistory, activeSelectionRange]);

  const selectedRangeEndPoint = useMemo(() => {
    if (!activeSelectionRange) return null;
    for (let i = timeframePortfolioHistory.length - 1; i >= 0; i -= 1) {
      const point = timeframePortfolioHistory[i];
      if (point.date >= activeSelectionRange.start && point.date <= activeSelectionRange.end) {
        return point;
      }
    }
    return null;
  }, [timeframePortfolioHistory, activeSelectionRange]);
  const selectedRangePnl =
    selectedRangeStartPoint && selectedRangeEndPoint
      ? selectedRangeEndPoint.value - selectedRangeStartPoint.value
      : null;
  const selectedRangePct =
    selectedRangeStartPoint && selectedRangeEndPoint && selectedRangeStartPoint.value > 0
      ? ((selectedRangeEndPoint.value - selectedRangeStartPoint.value) /
          selectedRangeStartPoint.value) *
        100
      : null;
  const showMobileDragSummary =
    isMobile &&
    activeChart === 'value' &&
    Boolean(activeSelectionRange && selectedRangeStartPoint && selectedRangeEndPoint);

  const handleChartDragStart = useCallback(
    (state: any) => {
      if (activeChart !== 'value' || !timeframePortfolioHistory.length) return;
      const label = typeof state?.activeLabel === 'string' ? state.activeLabel : null;
      if (!label) return;
      setPerformanceDragRange({ start: label, end: label });
    },
    [activeChart, timeframePortfolioHistory.length],
  );

  const handleChartDragMove = useCallback(
    (state: any) => {
      if (activeChart !== 'value') return;
      const label = typeof state?.activeLabel === 'string' ? state.activeLabel : null;
      if (!label) return;
      setPerformanceDragRange((prev) => {
        if (!prev) return prev;
        if (prev.end === label) return prev;
        return { ...prev, end: label };
      });
    },
    [activeChart],
  );

  const handleChartDragEnd = useCallback(() => {
    setPerformanceDragRange(null);
  }, []);

  useEffect(() => {
    if (holdingsPanelTab !== 'allocation') return;
    if (!pendingInsightsMetadataSymbols.length) return;
    pendingInsightsMetadataSymbols.forEach((holding) => {
      void fetchHoldingQuoteDetails(holding.symbol);
    });
  }, [holdingsPanelTab, pendingInsightsMetadataSymbols, fetchHoldingQuoteDetails]);

  useEffect(() => {
    if (!holdingModalOpen || !holdingModalSymbol) return;
    fetchHoldingQuoteDetails(holdingModalSymbol);
  }, [holdingModalOpen, holdingModalSymbol, fetchHoldingQuoteDetails]);

  useEffect(() => {
    if (!holdingModalSymbol) return;
    const stillExists = holdingSnapshots.some((row) => row.symbol === holdingModalSymbol);
    if (!stillExists) {
      setHoldingModalOpen(false);
      setHoldingModalSymbol(null);
    }
  }, [holdingModalSymbol, holdingSnapshots]);

  return (
    <div className="min-h-[52vh] w-full text-sm">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-foreground">Portfolio Tracker</h2>
      </div>
      <main className="w-full space-y-6 py-1 sm:py-2">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Card className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background xl:col-span-7">
            <CardHeader className="border-b border-border pb-4 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                    Drag on chart to inspect a custom range
                  </p>
                </div>
                <div className="inline-flex gap-1 rounded-lg border border-border bg-background p-1 text-xs sm:text-sm">
                  <button
                    onClick={() => {
                      setActiveChart('value');
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      activeChart === 'value'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                    }`}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => {
                      setActiveChart('dividends');
                      setPerformanceDragRange(null);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      activeChart === 'dividends'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                    }`}
                  >
                    Dividends
                  </button>
                </div>
              </div>

              {activeChart === 'dividends' ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Year</span>
                  <select
                    value={dividendYear}
                    onChange={(event) => setDividendYear(Number(event.target.value))}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    {(allDividendYears.length ? allDividendYears : [new Date().getFullYear()]).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1 text-xs">
                    {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => {
                          setActiveTimeframe(period);
                          setPerformanceDragRange(null);
                        }}
                        className={`rounded-md border px-2 py-1 transition-colors ${
                          activeTimeframe === period
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                  <div className="inline-flex rounded-md border border-border bg-background p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setValueChartStyle('area')}
                      className={`rounded px-2 py-1 transition-colors ${
                        valueChartStyle === 'area'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                      }`}
                    >
                      Area
                    </button>
                    <button
                      type="button"
                      onClick={() => setValueChartStyle('line')}
                      className={`rounded px-2 py-1 transition-colors ${
                        valueChartStyle === 'line'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                      }`}
                    >
                      Line
                    </button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col pt-4">
              {showMobileDragSummary ? (
                <div className="mb-2.5 rounded-md border border-border bg-background px-2.5 py-2 text-[10px] text-foreground">
                  <div className="grid grid-cols-3 items-center gap-1.5 text-center">
                    <div>
                      <div className="text-muted-foreground">
                        {formatShortDate(selectedRangeStartPoint!.date)}
                      </div>
                      <div className="font-semibold">
                        {formatMoney(selectedRangeStartPoint!.value, baseCurrency, 2, 2)}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-background py-1">
                      <div className={`font-semibold leading-tight ${metricTone(selectedRangePct)}`}>
                        {formatPercent(selectedRangePct)}
                      </div>
                      <div className={`font-semibold leading-tight ${metricTone(selectedRangePnl)}`}>
                        {formatSignedMoney(selectedRangePnl, baseCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        {formatShortDate(selectedRangeEndPoint!.date)}
                      </div>
                      <div className="font-semibold">
                        {formatMoney(selectedRangeEndPoint!.value, baseCurrency, 2, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="relative min-h-[18rem] w-full flex-1 overflow-hidden rounded-xl bg-background p-0 sm:min-h-[22rem]">
                <ChartContainer
                  config={
                    activeChart === 'dividends'
                      ? { amount: { label: 'Dividends', color: 'hsl(var(--chart-2))' } }
                      : { value: { label: 'Value', color: '#3b82f6' } }
                  }
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {activeChart === 'dividends' ? (
                      <BarChartComponent data={filteredDividendHistory} margin={{ top: 4, right: 6, left: 4, bottom: 4 }}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date: string | number) =>
                            new Date(date).toLocaleDateString(undefined, { month: 'short' })
                          }
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const item: any = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                                <div>{new Date(item.date).toLocaleDateString()}</div>
                                <div className="font-semibold">{formatMoney(item.amount, baseCurrency)}</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="amount" fill="#f97316" radius={[3, 3, 0, 0]} />
                      </BarChartComponent>
                    ) : (
                      <ComposedChart
                        data={timeframePortfolioHistory}
                        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                        onMouseDown={handleChartDragStart}
                        onMouseMove={handleChartDragMove}
                        onMouseUp={handleChartDragEnd}
                        onMouseLeave={() => setPerformanceDragRange(null)}
                      >
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[chartDomainMin, chartDomainMax]} />
                        {activeSelectionRange && (
                          <ReferenceArea
                            x1={activeSelectionRange.start}
                            x2={activeSelectionRange.end}
                            strokeOpacity={0}
                            fill="#71717a"
                            fillOpacity={dragOverlayRange ? 0.14 : 0.08}
                          />
                        )}
                        {activeSelectionRange && (
                          <>
                            <ReferenceLine
                              x={activeSelectionRange.start}
                              stroke="#a1a1aa"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                              strokeOpacity={0.8}
                            />
                            <ReferenceLine
                              x={activeSelectionRange.end}
                              stroke="#a1a1aa"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                              strokeOpacity={0.8}
                            />
                          </>
                        )}
                        {selectedRangeStartPoint && (
                          <ReferenceDot
                            x={selectedRangeStartPoint.date}
                            y={selectedRangeStartPoint.value}
                            r={4}
                            fill="#111827"
                            stroke="#f8fafc"
                            strokeWidth={2}
                          />
                        )}
                        {selectedRangeEndPoint && (
                          <ReferenceDot
                            x={selectedRangeEndPoint.date}
                            y={selectedRangeEndPoint.value}
                            r={4}
                            fill="#111827"
                            stroke="#f8fafc"
                            strokeWidth={2}
                          />
                        )}
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const item: any = payload[0].payload;
                            if (isMobile && activeSelectionRange && selectedRangeStartPoint && selectedRangeEndPoint) {
                              return null;
                            }
                            if (activeSelectionRange && selectedRangeStartPoint && selectedRangeEndPoint) {
                              return (
                                <div className="w-[min(90vw,370px)] rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] text-foreground sm:text-[11px]">
                                  <div className="grid grid-cols-3 items-center gap-1.5 text-center">
                                    <div>
                                      <div className="text-muted-foreground">
                                        {formatShortDate(selectedRangeStartPoint.date)}
                                      </div>
                                      <div className="font-semibold">
                                        {formatMoney(selectedRangeStartPoint.value, baseCurrency, 2, 2)}
                                      </div>
                                    </div>
                                    <div className="rounded border border-border bg-background py-1">
                                      <div className={`font-semibold leading-tight ${metricTone(selectedRangePct)}`}>
                                        {formatPercent(selectedRangePct)}
                                      </div>
                                      <div className={`font-semibold leading-tight ${metricTone(selectedRangePnl)}`}>
                                        {formatSignedMoney(selectedRangePnl, baseCurrency)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-zinc-400">
                                        {formatShortDate(selectedRangeEndPoint.date)}
                                      </div>
                                      <div className="font-semibold">
                                        {formatMoney(selectedRangeEndPoint.value, baseCurrency, 2, 2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                                <div>{new Date(item.date).toLocaleDateString()}</div>
                                <div className="font-semibold">{formatMoney(item.value, baseCurrency)}</div>
                              </div>
                            );
                          }}
                        />
                        {valueChartStyle === 'area' ? (
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#d4d4d8"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="rgba(212, 212, 216, 0.14)"
                            isAnimationActive={false}
                          />
                        ) : (
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#e5e7eb"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-xl border border-border bg-background xl:col-span-5">
            <CardHeader className="border-b border-border bg-transparent pb-4 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {holdingsPanelTab === 'holdings'
                      ? 'Holdings'
                      : holdingsPanelTab === 'transactions'
                        ? 'Recent Transactions'
                        : holdingsPanelTab === 'allocation'
                          ? 'Insights'
                          : 'KPIs & Analytics'}
                  </CardTitle>
                  {holdingsPanelTab !== 'holdings' ? (
                    <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                      {holdingsPanelTab === 'transactions'
                        ? `${recentTransactions.length} recent transactions`
                        : holdingsPanelTab === 'allocation'
                          ? 'Sector, region, and asset class allocation'
                          : 'KPIs and analytics snapshot'}
                    </p>
                  ) : null}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background p-1">
                  <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 rounded-full border-border bg-background p-0 text-foreground shadow-none transition-colors hover:bg-muted/20"
                    aria-label="Add transaction"
                    title="Add transaction"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={handleReload}
                    disabled={loading || trackedSymbols.length === 0}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-full border-border bg-background p-0 text-foreground shadow-none transition-colors hover:bg-muted/20 disabled:opacity-40"
                    aria-label="Reload holdings"
                    title="Reload holdings"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${reloading ? 'animate-spin' : ''}`} />
                    <span className="sr-only">Reload</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-col gap-4 px-4 pb-4 pt-4 text-xs sm:text-sm">
              {error && (
                <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              {holdingsPanelTab === 'holdings' && (
                <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-2.5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <input
                      type="text"
                      value={holdingSearch}
                      onChange={(event) => setHoldingSearch(event.target.value.toUpperCase())}
                      placeholder="Filter symbol..."
                      className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-foreground/25"
                    />
                    <select
                      value={holdingsSort}
                      onChange={(event) => setHoldingsSort(event.target.value as HoldingsSort)}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/25"
                    >
                      <option value="weight">Sort: Weight</option>
                      <option value="pnl">Sort: P/L</option>
                      <option value="value">Sort: Value</option>
                      <option value="symbol">Sort: Symbol</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: 'all', label: 'All' },
                      { key: 'gainers', label: 'Gainers' },
                      { key: 'losers', label: 'Losers' },
                      { key: 'highWeight', label: 'High Weight' },
                    ] as const).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setHoldingsFilter(item.key)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          holdingsFilter === item.key
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-background p-1 sm:w-fit sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setHoldingsPanelTab('holdings')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    holdingsPanelTab === 'holdings'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                  }`}
                >
                  Holdings
                </button>
                <button
                  type="button"
                  onClick={() => setHoldingsPanelTab('transactions')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    holdingsPanelTab === 'transactions'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                  }`}
                >
                  Recent Transactions
                </button>
                <button
                  type="button"
                  onClick={() => setHoldingsPanelTab('insights')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    holdingsPanelTab === 'insights'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                  }`}
                >
                  KPIs & Analytics
                </button>
                <button
                  type="button"
                  onClick={() => setHoldingsPanelTab('allocation')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    holdingsPanelTab === 'allocation'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                  }`}
                >
                  Insights
                </button>
              </div>

              {holdingsPanelTab === 'holdings' ? (
                visibleHoldingSnapshots.length > 0 ? (
                  <div className="max-h-[min(62vh,35rem)] overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                      {visibleHoldingSnapshots.map((holding) => {
                        const signal = resolveHoldingSignal(holding);
                        return (
                          <div
                            key={holding.symbol}
                            onClick={() => openHoldingDetails(holding.symbol)}
                            className={`h-full cursor-pointer rounded-xl border px-3.5 py-3 transition-all ${
                              selectedSymbol === holding.symbol
                                ? 'border-foreground/35 bg-muted/20'
                                : 'border-border bg-background'
                            }`}
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <div className="text-base font-medium tracking-tight text-foreground">
                                {holding.symbol}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteHolding(holding.symbol);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/20 hover:text-rose-400"
                                  aria-label={`Delete ${holding.symbol}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] text-muted-foreground">
                                  Position Value
                                </p>
                                <span className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                                  {formatMoney(holding.currentValue, baseCurrency, 0, 0)}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] text-muted-foreground">
                                  Unrealized P/L
                                </p>
                                <p className={`text-sm font-semibold ${metricTone(holding.unrealizedPnl)}`}>
                                  {formatSignedMoney(holding.unrealizedPnl, baseCurrency)}
                                </p>
                                <span
                                  className={`rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium ${
                                    holding.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {formatPercent(holding.unrealizedPct, 1)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-background px-2.5 py-2 text-[11px]">
                              <div>
                                <p className="text-muted-foreground">Weight</p>
                                <p className="font-semibold text-foreground">
                                  {formatPercent(holding.weightPct, 2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Contribution</p>
                                <p className={`font-semibold ${metricTone(holding.totalContribution)}`}>
                                  {formatSignedMoney(holding.totalContribution, baseCurrency)}
                                </p>
                              </div>
                              <div className="flex items-center justify-end">
                                <span
                                  className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${holdingSignalPillClass(
                                    signal,
                                  )}`}
                                >
                                  {holdingSignalLabel(signal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : holdingSnapshots.length > 0 ? (
                  <div className="flex h-28 items-center justify-center sm:h-40">
                    <div className="text-center text-muted-foreground">
                      <div className="mb-1">No matching holdings</div>
                      <div className="text-xs">Adjust filter or search query</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center sm:h-40">
                    <div className="text-center text-muted-foreground">
                      <div className="mb-1">No holdings</div>
                      <div className="text-xs">Add your first transaction</div>
                    </div>
                  </div>
                )
              ) : holdingsPanelTab === 'transactions' ? (
                recentTransactions.length > 0 ? (
                  <div className="max-h-[min(62vh,35rem)] space-y-2.5 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-border bg-background px-3 py-2.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span
                              className={`mr-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                tx.side === 'BUY'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {tx.side}
                            </span>
                            {tx.symbol} • {tx.shares} @ {formatMoney(tx.price, tx.currency, 2, 2)}
                          </div>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/20 hover:text-rose-400"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-0.5 text-muted-foreground">
                          {new Date(`${tx.date}T00:00:00`).toLocaleDateString()} • fees{' '}
                          {formatMoney(tx.fees, tx.currency, 2, 2)} • taxes{' '}
                          {formatMoney(tx.taxes, tx.currency, 2, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center sm:h-40">
                    <div className="text-center text-muted-foreground">
                      <div className="mb-1">No recent transactions</div>
                      <div className="text-xs">Add transactions to see activity here</div>
                    </div>
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="space-y-4">
                    {holdingsPanelTab === 'allocation' ? (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">Allocation Analysis</h4>
                          <span className="text-[11px] text-muted-foreground">By current portfolio value</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:grid-cols-3 xl:overflow-visible xl:pb-0">
                          {[
                            { title: 'Sector', data: sectorBreakdownData },
                            { title: 'Region', data: regionBreakdownData },
                            { title: 'Asset Class', data: assetClassBreakdownData },
                          ].map((chart, chartIndex) => (
                            <div
                              key={chart.title}
                              className="min-w-[16rem] shrink-0 rounded-lg border border-border bg-background px-2.5 py-2 xl:min-w-0"
                            >
                              <h5 className="text-xs font-semibold text-foreground">{chart.title}</h5>
                              <div className="mt-1 h-36">
                                {chart.data.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Tooltip
                                        content={({ active, payload }) => {
                                          if (!active || !payload?.length) return null;
                                          const point = payload[0]?.payload as AllocationBreakdownDatum | undefined;
                                          if (!point) return null;
                                          return (
                                            <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground">
                                              <div className="font-medium">{point.name}</div>
                                              <div className="mt-0.5 flex items-center justify-between gap-4">
                                                <span className="text-muted-foreground">Weight</span>
                                                <span>{point.weightPct.toFixed(1)}%</span>
                                              </div>
                                              <div className="flex items-center justify-between gap-4">
                                                <span className="text-muted-foreground">Value</span>
                                                <span>{formatMoney(point.value, baseCurrency, 0, 0)}</span>
                                              </div>
                                            </div>
                                          );
                                        }}
                                      />
                                      <Pie
                                        data={chart.data}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={35}
                                        outerRadius={56}
                                        paddingAngle={2}
                                        stroke="none"
                                        isAnimationActive={false}
                                      >
                                        {chart.data.map((slice, sliceIndex) => (
                                          <Cell
                                            key={`${chart.title}-${slice.name}`}
                                            fill={getAllocationColor(chart.title, slice.name, chartIndex + sliceIndex)}
                                          />
                                        ))}
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                    No allocation data yet
                                  </div>
                                )}
                              </div>
                              {chart.data.length > 0 && (
                                <div className="mt-1.5 space-y-1 text-[11px]">
                                  {chart.data.slice(0, 4).map((slice, sliceIndex) => (
                                    <div
                                      key={`${chart.title}-legend-${slice.name}`}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <div className="flex min-w-0 items-center gap-1.5">
                                        <span
                                          className="h-2 w-2 shrink-0 rounded-full"
                                          style={{
                                            backgroundColor: getAllocationColor(
                                              chart.title,
                                              slice.name,
                                              chartIndex + sliceIndex,
                                            ),
                                          }}
                                        />
                                        <span className="truncate text-muted-foreground">{slice.name}</span>
                                      </div>
                                      <span className="font-semibold text-foreground">
                                        {slice.weightPct.toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {pendingInsightsMetadataSymbols.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            Classifying {pendingInsightsMetadataSymbols.length} holding
                            {pendingInsightsMetadataSymbols.length === 1 ? '' : 's'} for richer sector, region,
                            and asset class analytics.
                          </p>
                        )}

                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                          <section className="rounded-lg border border-border bg-background px-3 py-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <h5 className="text-xs font-semibold text-foreground">Concentration Risk</h5>
                              <span className={`text-xs font-semibold ${concentrationMetrics.levelTone}`}>
                                {concentrationMetrics.level}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
                                <p className="text-muted-foreground">Top 1</p>
                                <p className="font-semibold text-foreground">
                                  {formatPercent(concentrationMetrics.top1, 1)}
                                </p>
                              </div>
                              <div className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
                                <p className="text-muted-foreground">Top 3</p>
                                <p className="font-semibold text-foreground">
                                  {formatPercent(concentrationMetrics.top3, 1)}
                                </p>
                              </div>
                              <div className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
                                <p className="text-muted-foreground">Top 5</p>
                                <p className="font-semibold text-foreground">
                                  {formatPercent(concentrationMetrics.top5, 1)}
                                </p>
                              </div>
                              <div className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
                                <p className="text-muted-foreground">HHI</p>
                                <p className="font-semibold text-foreground">
                                  {Number.isFinite(concentrationMetrics.hhi)
                                    ? concentrationMetrics.hhi.toFixed(0)
                                    : '-'}
                                </p>
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {concentrationMetrics.top1 >= 25
                                ? 'Single-name risk elevated: largest position exceeds 25% of portfolio.'
                                : concentrationMetrics.top1 >= 18
                                  ? 'Concentration moderate: monitor single-name exposure and rebalance drift.'
                                  : 'Concentration is balanced across holdings based on current weights.'}
                            </p>
                          </section>

                          <section className="rounded-lg border border-border bg-background px-3 py-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <h5 className="text-xs font-semibold text-foreground">Diversification Score</h5>
                              <span className="text-xs font-semibold text-foreground">
                                {diversificationInsight.score === null
                                  ? '-'
                                  : `${diversificationInsight.score.toFixed(0)}/100`}
                              </span>
                            </div>
                            <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
                              <div className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
                                <p className="text-muted-foreground">Avg Correlation</p>
                                <p className="font-semibold text-foreground">
                                  {diversificationInsight.averageCorrelation === null
                                    ? '-'
                                    : diversificationInsight.averageCorrelation.toFixed(2)}
                                </p>
                              </div>
                              <div className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
                                <p className="text-muted-foreground">Pair Samples</p>
                                <p className="font-semibold text-foreground">
                                  {diversificationInsight.pairCount > 0
                                    ? `${diversificationInsight.pairCount} pairs`
                                    : '-'}
                                </p>
                              </div>
                            </div>
                            {diversificationInsight.matrix.length >= 2 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full border-separate border-spacing-1 text-[10px]">
                                  <thead>
                                    <tr>
                                      <th className="px-1 py-0.5 text-left text-muted-foreground">Corr</th>
                                      {diversificationInsight.matrix.map((row) => (
                                        <th
                                          key={`div-head-${row.symbol}`}
                                          className="px-1 py-0.5 text-center text-muted-foreground"
                                        >
                                          {row.symbol}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {diversificationInsight.matrix.map((row) => (
                                      <tr key={`div-row-${row.symbol}`}>
                                        <td className="px-1 py-0.5 font-semibold text-foreground">
                                          {row.symbol}
                                        </td>
                                        {row.cells.map((cell) => {
                                          const alpha =
                                            cell.corr === null ? 0 : clamp(Math.abs(cell.corr), 0, 1) * 0.35;
                                          const background =
                                            cell.corr === null
                                              ? 'transparent'
                                              : cell.corr >= 0
                                                ? `rgba(244,63,94,${alpha})`
                                                : `rgba(16,185,129,${alpha})`;
                                          return (
                                            <td
                                              key={`div-cell-${row.symbol}-${cell.symbol}`}
                                              className="rounded px-1 py-0.5 text-center text-foreground"
                                              style={{ background }}
                                            >
                                              {cell.corr === null ? '-' : cell.corr.toFixed(2)}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                Not enough overlapping return history for correlation matrix.
                              </p>
                            )}
                          </section>
                        </div>

                        <section className="rounded-lg border border-border bg-background px-3 py-2.5">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h5 className="text-xs font-semibold text-foreground">Drawdown Attribution</h5>
                            <span className="text-[11px] text-muted-foreground">{activeTimeframe} window</span>
                          </div>
                          {drawdownInsight.drawdownPct !== null &&
                          drawdownInsight.peakDate &&
                          drawdownInsight.troughDate ? (
                            <>
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="rounded-md border border-border bg-muted/10 px-2 py-1 text-muted-foreground">
                                  Peak: {formatShortDate(drawdownInsight.peakDate)}
                                </span>
                                <span className="rounded-md border border-border bg-muted/10 px-2 py-1 text-muted-foreground">
                                  Trough: {formatShortDate(drawdownInsight.troughDate)}
                                </span>
                                <span className="rounded-md border border-border bg-muted/10 px-2 py-1 font-semibold text-rose-400">
                                  {formatPercent(drawdownInsight.drawdownPct, 2)}
                                </span>
                              </div>
                              {drawdownInsight.attribution.length > 0 ? (
                                <div className="space-y-1 text-[11px]">
                                  {drawdownInsight.attribution.map((entry) => (
                                    <div
                                      key={`drawdown-${entry.symbol}`}
                                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/10 px-2 py-1.5"
                                    >
                                      <span className="font-medium text-foreground">{entry.symbol}</span>
                                      <div className="text-right">
                                        <div className={`font-semibold ${metricTone(entry.delta)}`}>
                                          {formatSignedMoney(entry.delta, baseCurrency)}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {formatPercent(entry.contributionPct, 2)} of peak value
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">
                                  No symbol-level attribution available for this drawdown window.
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              No drawdown window detected for the selected timeframe.
                            </p>
                          )}
                        </section>
                      </section>
                    ) : (
                      <section className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">Range Trend</h4>
                          <span className="text-[11px] text-muted-foreground">
                            Base 100 ({activeTimeframe})
                          </span>
                        </div>
                        <div className="h-40 overflow-hidden rounded-lg border border-border bg-background sm:h-44">
                          {insightsComparisonChartData.length >= 2 ? (
                            <ChartContainer
                              config={{
                                portfolio: { label: 'Portfolio', color: '#e5e7eb' },
                                benchmark: { label: 'SPY', color: '#71717a' },
                              }}
                              className="h-full w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={insightsComparisonChartData}
                                  margin={{ top: 8, right: 8, left: 8, bottom: 6 }}
                                >
                                  <XAxis
                                    dataKey="date"
                                    minTickGap={28}
                                    tickMargin={6}
                                    tickFormatter={(date: string) =>
                                      new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    }
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis hide domain={[chartDomainMin, chartDomainMax]} />
                                  <ReferenceLine y={100} stroke="#52525b" strokeDasharray="3 3" />
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.length) return null;
                                      const item: any = payload[0]?.payload;
                                      return (
                                        <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground">
                                          <div className="mb-0.5">{formatShortDate(item.date)}</div>
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-muted-foreground">Portfolio</span>
                                            <span className={`font-semibold ${metricTone(item.portfolio - 100)}`}>
                                              {formatPercent(item.portfolio - 100, 1)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-muted-foreground">SPY</span>
                                            <span className={`font-semibold ${metricTone(item.benchmark - 100)}`}>
                                              {formatPercent(item.benchmark - 100, 1)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="benchmark"
                                    stroke="#71717a"
                                    strokeWidth={1.4}
                                    fill="rgba(113,113,122,0.08)"
                                    fillOpacity={1}
                                    isAnimationActive={false}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="portfolio"
                                    stroke="#e5e7eb"
                                    strokeWidth={1.7}
                                    fill="rgba(229,231,235,0.08)"
                                    fillOpacity={1}
                                    isAnimationActive={false}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              Not enough data for comparison chart
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {holdingsPanelTab === 'insights' && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <section className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">KPIs</h4>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Portfolio Value</span>
                            <span className="font-semibold text-foreground">
                              {formatMoney(currentPortfolioValue, baseCurrency, 0, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Net Invested</span>
                            <span className="font-semibold text-foreground">
                              {formatMoney(investedCapital - withdrawnCapital, baseCurrency, 0, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Return</span>
                            <span className={`font-semibold ${metricTone(totalReturn)}`}>
                              {formatMoney(totalReturn, baseCurrency, 0, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Return %</span>
                            <span className={`font-semibold ${metricTone(totalReturnPct)}`}>
                              {formatPercent(totalReturnPct)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Dividend Income</span>
                            <span className="font-semibold text-foreground">
                              {dividendLoading
                                ? '...'
                                : formatMoney(totalDividendIncomeNet, baseCurrency, 2, 2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Yield</span>
                            <span className={`font-semibold ${metricTone(annualYield)}`}>
                              {formatPercent(annualYield)}
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-2 border-t border-border pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                        <h4 className="text-sm font-medium text-foreground">Analytics</h4>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Realized P/L</span>
                            <span className={`font-semibold ${metricTone(totalRealizedPnl)}`}>
                              {formatMoney(totalRealizedPnl, baseCurrency, 0, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Unrealized P/L</span>
                            <span className={`font-semibold ${metricTone(totalUnrealizedPnl)}`}>
                              {formatMoney(totalUnrealizedPnl, baseCurrency, 0, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">TWR</span>
                            <span className={`font-semibold ${metricTone(timeWeightedReturnPct)}`}>
                              {formatPercent(timeWeightedReturnPct)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">XIRR</span>
                            <span className={`font-semibold ${metricTone(moneyWeightedReturnPct)}`}>
                              {formatPercent(moneyWeightedReturnPct)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Max Drawdown</span>
                            <span className="font-semibold text-rose-400">
                              {formatPercent(maxDrawdownPct)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Largest Holding</span>
                            <span className="font-semibold text-foreground">
                              {formatPercent(largestHoldingWeight)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Portfolio ({activeTimeframe})</span>
                            <span className={`font-semibold ${metricTone(totalReturnPctForRange)}`}>
                              {formatPercent(totalReturnPctForRange)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">SPY ({activeTimeframe})</span>
                            <span className={`font-semibold ${metricTone(benchmarkReturnPctForRange)}`}>
                              {formatPercent(benchmarkReturnPctForRange)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Excess</span>
                            <span className={`font-semibold ${metricTone(excessVsBenchmark)}`}>
                              {formatPercent(excessVsBenchmark)}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <HoldingDetailsModal
        open={holdingModalOpen}
        onOpenChange={(open) => {
          setHoldingModalOpen(open);
          if (!open) setHoldingModalSymbol(null);
        }}
        symbol={holdingModalSymbol}
        baseCurrency={baseCurrency}
        holding={activeHoldingModalSnapshot}
        transactions={activeHoldingModalTransactions}
        stockSeries={activeHoldingModalSeries}
        stockMeta={activeHoldingModalMeta}
        marketQuote={activeHoldingModalQuote}
        loading={activeHoldingModalLoading}
        error={activeHoldingModalError}
      />

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-2 sm:items-center sm:justify-center sm:p-4">
          <Card className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-background">
            <CardHeader className="border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-base font-semibold sm:text-lg">Add Transaction</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[calc(100dvh-6.5rem)] space-y-3 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-sm sm:max-h-[72vh] sm:space-y-4 sm:px-6 sm:py-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransactionSide('BUY')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    transactionSide === 'BUY'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTransactionSide('SELL')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    transactionSide === 'SELL'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAddInputMode('manual')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    addInputMode === 'manual'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  Manual Input
                </button>
                <button
                  onClick={() => setAddInputMode('automatic')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    addInputMode === 'automatic'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  Automatic Input
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Symbol</label>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={search}
                    onChange={(event) => setSearch(event.target.value.toUpperCase())}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Date</label>
                  <input
                    type="date"
                    value={buyDate}
                    onChange={(event) => setBuyDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[15px] leading-tight focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm [&::-webkit-date-and-time-value]:leading-tight [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:leading-tight"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Value</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="2500"
                    value={transactionValue}
                    onChange={(event) => setTransactionValue(event.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm"
                  />
                </div>
                {addInputMode === 'manual' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Execution Price</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="251.04"
                      value={fillPrice}
                      onChange={(event) => setFillPrice(event.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Fees</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={fees}
                    onChange={(event) => setFees(event.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Taxes</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={taxes}
                    onChange={(event) => setTaxes(event.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Transaction Currency</label>
                <select
                  value={tradeCurrency}
                  onChange={(event) => setTradeCurrency(normalizeCurrency(event.target.value))}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:text-sm"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              {addInputMode === 'automatic' && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  {autoModePreview ? (
                    <div className="mt-1 space-y-1 text-foreground">
                      <div>
                        Market: {formatMoney(autoModePreview.marketPrice, autoModePreview.marketCurrency, 2, 2)}
                      </div>
                      {autoModePreview.txPrice ? (
                        <div>
                          Transaction: {formatMoney(autoModePreview.txPrice, autoModePreview.txCurrency, 2, 2)}
                        </div>
                      ) : (
                        <div className="text-amber-300">FX rate unavailable for selected transaction currency.</div>
                      )}
                      {autoModePreview.estimatedShares && Number.isFinite(autoModePreview.estimatedShares) ? (
                        <div>Estimated shares: {autoModePreview.estimatedShares.toFixed(6)}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div>Add symbol and date to preview automatic pricing.</div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="-mx-4 sticky bottom-0 mt-2 border-t border-border bg-background px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] sm:static sm:mx-0 sm:mt-3 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0">
                <div className="flex flex-col gap-2 text-xs sm:flex-row sm:gap-3 sm:text-sm">
                  <Button onClick={() => setShowAddForm(false)} variant="outline" className="h-11 flex-1 sm:h-10">
                    Cancel
                  </Button>
                  <Button onClick={handleAddTransaction} disabled={loading} className="h-11 flex-1 sm:h-10">
                    {loading ? 'Saving...' : transactionSide === 'BUY' ? 'Add Buy' : 'Add Sell'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
