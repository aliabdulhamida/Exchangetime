'use client';

import { ChevronDown, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as BarChartComponent,
  ReferenceDot,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';

interface StockDataPoint {
  date: string; // yyyy-mm-dd
  close: number;
}

type TransactionSide = 'BUY' | 'SELL';
type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CHF';
type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'ALL';
type AddInputMode = 'manual' | 'automatic';
type MobileTab = 'overview' | 'holdings';
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

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'GBP', 'CHF'];

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
    const endUnix = Math.floor(Date.now() / 1000);
    const url = `/api/portfolio-market?symbol=${encodeURIComponent(symbol)}&chart=1&period1=${startUnix}&period2=${endUnix}&interval=1d&events=div`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
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
    const end = Math.floor(Date.now() / 1000);
    const start = 0;
    const url = `/api/portfolio-market?symbol=${encodeURIComponent(symbol)}&chart=1&period1=${start}&period2=${end}&interval=1d`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
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
      source: 'Financial Modeling Prep (via /api/portfolio-market)',
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
    const end = Math.floor(Date.now() / 1000);
    const url = `/api/portfolio-market?symbol=${encodeURIComponent(pair)}&chart=1&period1=0&period2=${end}&interval=1d`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const points = parseChartPoints(result);
    return points.length ? points : null;
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
  const [mobileTab, setMobileTab] = useState<MobileTab>('overview');
  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] = useState({
    returns: false,
    risk: false,
    benchmark: false,
  });
  const [search, setSearch] = useState('');
  const [transactionSide, setTransactionSide] = useState<TransactionSide>('BUY');
  const [shares, setShares] = useState('');
  const [fillPrice, setFillPrice] = useState('');
  const [fees, setFees] = useState('');
  const [taxes, setTaxes] = useState('');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tradeCurrency, setTradeCurrency] = useState<SupportedCurrency>('USD');

  const [activeChart, setActiveChart] = useState<'value' | 'dividends'>('value');
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

  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [dividendLoading, setDividendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    setMobileAnalyticsOpen({
      returns: isDesktop,
      risk: isDesktop,
      benchmark: isDesktop,
    });
  }, []);

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
    async (from: SupportedCurrency, to: SupportedCurrency, force = false) => {
      if (from === to) return;
      const key = fxKey(from, to);
      if (!force && fxData[key]?.length) return;
      const payload = await fetchFxSeries(from, to);
      if ('error' in payload) return;
      setFxData((prev) => ({ ...prev, [key]: payload }));
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

  const handleAddTransaction = async () => {
    const symbol = search.trim().toUpperCase();
    const nShares = Number.parseFloat(shares);
    const nPrice = Number.parseFloat(fillPrice);
    const nFees = Math.max(0, Number.parseFloat(fees || '0') || 0);
    const nTaxes = Math.max(0, Number.parseFloat(taxes || '0') || 0);
    const isManualInput = addInputMode === 'manual';

    if (!symbol || Number.isNaN(nShares) || nShares <= 0 || !buyDate) {
      setError('Please fill in symbol, date and shares.');
      return;
    }
    if (isManualInput && (Number.isNaN(nPrice) || nPrice <= 0)) {
      setError('Please enter a valid execution price for manual mode.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9._-]{0,14}$/.test(symbol)) {
      setError('Please enter a valid ticker symbol.');
      return;
    }
    if (transactionSide === 'SELL') {
      const openQty = openQuantityBySymbol.get(symbol) || 0;
      if (nShares > openQty) {
        setError(`Not enough shares to sell. Available: ${openQty.toFixed(4)}.`);
        return;
      }
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
    const txPrice = isManualInput ? nPrice : (marketPrice as number);
    const txCurrency = isManualInput ? tradeCurrency : inferredCurrency;

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
    setShares('');
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

  const currentPortfolioValue = useMemo(
    () => holdingSnapshots.reduce((sum, row) => sum + row.currentValue, 0),
    [holdingSnapshots],
  );

  const totalOpenCostBasis = useMemo(
    () => holdingSnapshots.reduce((sum, row) => sum + row.openCostBasis, 0),
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

  const totalDividendIncomeGross = useMemo(
    () => dividendCashEvents.reduce((sum, event) => sum + event.grossAmount, 0),
    [dividendCashEvents],
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
  const yieldOnCost = totalOpenCostBasis > 0 ? (ttmDividends.net / totalOpenCostBasis) * 100 : null;

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

  const totalReturnValueForRange = useMemo(() => {
    if (!filteredPortfolioHistory.length) return null;
    const first = filteredPortfolioHistory[0].value;
    const last = filteredPortfolioHistory[filteredPortfolioHistory.length - 1].value;
    return last - first;
  }, [filteredPortfolioHistory]);

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

  const excessVsBenchmark = useMemo(() => {
    if (totalReturnPctForRange === null || benchmarkReturnPctForRange === null) return null;
    return totalReturnPctForRange - benchmarkReturnPctForRange;
  }, [totalReturnPctForRange, benchmarkReturnPctForRange]);

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
    return {
      price: resolved,
      currency: normalizeCurrency(stockMeta[symbol]?.currency || tradeCurrency),
    };
  }, [addInputMode, buyDate, search, stockData, stockMeta, tradeCurrency]);

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

  return (
    <div className="min-h-[50vh] pt-0 text-xs sm:text-sm md:text-base">
      <div className="mb-5 flex items-center justify-start">
        <h2 className="text-lg font-bold text-foreground">Portfolio Tracker</h2>
      </div>

      <main className="container mx-auto py-1 sm:py-6">
        <div className="mb-4 lg:hidden">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
            <button
              onClick={() => setMobileTab('overview')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                mobileTab === 'overview'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setMobileTab('holdings')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                mobileTab === 'holdings'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Holdings
            </button>
          </div>
        </div>

        <section
          className={`mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 ${
            mobileTab === 'holdings' ? 'hidden lg:grid' : ''
          }`}
        >
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
                {formatMoney(currentPortfolioValue, baseCurrency, 0, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Net invested: {formatMoney(investedCapital - withdrawnCapital, baseCurrency, 0, 0)}</div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-lg font-semibold sm:text-xl md:text-2xl ${
                  totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {formatMoney(totalReturn, baseCurrency, 0, 0)}
              </div>
              <div className={totalReturnPct !== null && totalReturnPct >= 0 ? 'text-green-500 text-xs' : 'text-red-500 text-xs'}>
                {formatPercent(totalReturnPct)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Price: {formatMoney(priceReturn, baseCurrency, 0, 0)} | Dividends: {formatMoney(totalDividendIncomeNet, baseCurrency, 0, 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Dividend Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
                {dividendLoading ? '...' : formatMoney(totalDividendIncomeNet, baseCurrency, 2, 2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatMoney(dividendIncomePerMonth, baseCurrency, 2, 2)} / month
              </div>
              <div className="text-[11px] text-muted-foreground">
                Gross {formatMoney(totalDividendIncomeGross, baseCurrency, 2, 2)} • {dividendPaymentsCount} payments
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Yield</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
                {formatPercent(annualYield)}
              </div>
              <div className="text-xs text-muted-foreground">TTM net dividends / current value</div>
              <div className="text-[11px] text-muted-foreground">
                Yield on cost: {formatPercent(yieldOnCost)}
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card
            className={`border border-border lg:col-span-3 ${
              mobileTab === 'holdings' ? 'hidden lg:block' : ''
            }`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                <div className="flex gap-1 rounded-lg p-1 text-xs sm:text-sm">
                  <button
                    onClick={() => {
                      setActiveChart('value');
                    }}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                      activeChart === 'value'
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => {
                      setActiveChart('dividends');
                      setPerformanceDragRange(null);
                    }}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                      activeChart === 'dividends'
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-muted-foreground hover:text-foreground'
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
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1 text-xs">
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setActiveTimeframe(period);
                        setPerformanceDragRange(null);
                      }}
                      className={`rounded px-2 py-1 transition-colors ${
                        activeTimeframe === period
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                </div>
              )}
            </CardHeader>

            <CardContent>
              <div className="relative h-56 w-full sm:h-72 md:h-80">
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
                      <BarChartComponent data={filteredDividendHistory} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
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
                              <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                                <div>{new Date(item.date).toLocaleDateString()}</div>
                                <div className="font-semibold">{formatMoney(item.amount, baseCurrency)}</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="amount" fill="#f97316" radius={[3, 3, 0, 0]} />
                      </BarChartComponent>
                    ) : (
                      <AreaChart
                        data={timeframePortfolioHistory}
                        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                        onMouseDown={handleChartDragStart}
                        onMouseMove={handleChartDragMove}
                        onMouseUp={handleChartDragEnd}
                        onMouseLeave={() => setPerformanceDragRange(null)}
                      >
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[chartDomainMin, chartDomainMax]} />
                        <defs>
                          <linearGradient id="portfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        {activeSelectionRange && (
                          <ReferenceArea
                            x1={activeSelectionRange.start}
                            x2={activeSelectionRange.end}
                            strokeOpacity={0}
                            fill="#14b8a6"
                            fillOpacity={dragOverlayRange ? 0.18 : 0.12}
                          />
                        )}
                        {activeSelectionRange && (
                          <>
                            <ReferenceLine
                              x={activeSelectionRange.start}
                              stroke="#2dd4bf"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                              strokeOpacity={0.9}
                            />
                            <ReferenceLine
                              x={activeSelectionRange.end}
                              stroke="#2dd4bf"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                              strokeOpacity={0.9}
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
                            if (activeSelectionRange && selectedRangeStartPoint && selectedRangeEndPoint) {
                              return (
                                <div className="w-[min(90vw,370px)] rounded-md border border-teal-300/20 bg-zinc-900/88 px-2.5 py-1.5 text-[10px] text-zinc-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:text-[11px]">
                                  <div className="grid grid-cols-3 items-center gap-1.5 text-center">
                                    <div>
                                      <div className="text-zinc-400">
                                        {formatShortDate(selectedRangeStartPoint.date)}
                                      </div>
                                      <div className="font-semibold">
                                        {formatMoney(selectedRangeStartPoint.value, baseCurrency, 2, 2)}
                                      </div>
                                    </div>
                                    <div className="rounded border border-white/10 bg-white/[0.03] py-1">
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
                              <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                                <div>{new Date(item.date).toLocaleDateString()}</div>
                                <div className="font-semibold">{formatMoney(item.value, baseCurrency)}</div>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#d4d4d8"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#portfolioValueGradient)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border border-border lg:col-span-2 ${
              mobileTab === 'overview' ? 'hidden lg:block' : ''
            }`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Holdings</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label="Add transaction"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleReload}
                    disabled={loading || trackedSymbols.length === 0}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                  >
                    <RefreshCw className={`mr-1 h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
                    Reload
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-xs sm:text-sm">
              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              {holdingSnapshots.length > 0 ? (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 sm:max-h-80 md:max-h-96">
                  {holdingSnapshots.map((holding) => (
                    <div
                      key={holding.symbol}
                      onClick={() => selectHoldingSymbol(holding.symbol)}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        selectedSymbol === holding.symbol
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="font-medium">{holding.symbol}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {holding.quantity.toFixed(4)} sh • {formatPercent(holding.weightPct, 1)}
                          </span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteHolding(holding.symbol);
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                            aria-label={`Delete ${holding.symbol}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{formatMoney(holding.currentValue, baseCurrency, 0, 0)}</span>
                        <span className={holding.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatPercent(holding.unrealizedPct, 1)}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Avg cost: {formatMoney(holding.avgOpenCost, baseCurrency, 2, 2)}</span>
                        <span>Price: {holding.currentPrice ? formatMoney(holding.currentPrice, baseCurrency, 2, 2) : '-'}</span>
                        <span className={holding.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          Realized: {formatMoney(holding.realizedPnl, baseCurrency, 0, 0)}
                        </span>
                        <span className={holding.dividendReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                          Div: {formatMoney(holding.dividendReturn, baseCurrency, 0, 0)}
                        </span>
                        <span className={holding.totalContribution >= 0 ? 'text-green-500' : 'text-red-500'}>
                          Contribution: {formatMoney(holding.totalContribution, baseCurrency, 0, 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center sm:h-40">
                  <div className="text-center text-muted-foreground">
                    <div className="mb-1">No holdings</div>
                    <div className="text-xs">Add your first transaction</div>
                  </div>
                </div>
              )}

              {recentTransactions.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Recent Transactions</div>
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="rounded-md border border-border p-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className={tx.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                              {tx.side}
                            </span>{' '}
                            {tx.symbol} • {tx.shares} @ {formatMoney(tx.price, tx.currency, 2, 2)}
                          </div>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(`${tx.date}T00:00:00`).toLocaleDateString()} • fees {formatMoney(tx.fees, tx.currency, 2, 2)} • taxes {formatMoney(tx.taxes, tx.currency, 2, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <section
          className={`mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 ${
            mobileTab === 'holdings' ? 'hidden lg:grid' : ''
          }`}
        >
          <Card className="overflow-hidden border border-border">
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() =>
                  setMobileAnalyticsOpen((prev) => ({ ...prev, returns: !prev.returns }))
                }
                className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2"
                aria-label="Toggle Return Analytics"
              >
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Analytics
                  </div>
                  <div className="text-sm font-semibold text-foreground">Return Analytics</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${metricTone(timeWeightedReturnPct)}`}>
                    {returnsSummaryLabel}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      mobileAnalyticsOpen.returns ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
            </CardHeader>
            <CardContent
              className={`space-y-2 pt-1 text-xs ${mobileAnalyticsOpen.returns ? 'block' : 'hidden'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">TWR</span>
                <span className={metricTone(timeWeightedReturnPct)}>
                  {formatPercent(timeWeightedReturnPct)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">XIRR</span>
                <span className={metricTone(moneyWeightedReturnPct)}>
                  {formatPercent(moneyWeightedReturnPct)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Realized P/L</span>
                <span className={metricTone(totalRealizedPnl)}>
                  {formatMoney(totalRealizedPnl, baseCurrency, 0, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unrealized P/L</span>
                <span className={metricTone(totalUnrealizedPnl)}>
                  {formatMoney(totalUnrealizedPnl, baseCurrency, 0, 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-border">
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() => setMobileAnalyticsOpen((prev) => ({ ...prev, risk: !prev.risk }))}
                className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2"
                aria-label="Toggle Risk and Concentration"
              >
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Risk
                  </div>
                  <div className="text-sm font-semibold text-foreground">Risk & Concentration</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-400">{riskSummaryLabel}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      mobileAnalyticsOpen.risk ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
            </CardHeader>
            <CardContent
              className={`space-y-2 pt-1 text-xs ${mobileAnalyticsOpen.risk ? 'block' : 'hidden'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Drawdown</span>
                <span className="text-rose-400">{formatPercent(maxDrawdownPct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Largest Holding</span>
                <span>{formatPercent(largestHoldingWeight)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Open Cost Basis</span>
                <span>{formatMoney(totalOpenCostBasis, baseCurrency, 0, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Holdings</span>
                <span>{holdingSnapshots.filter((h) => h.quantity > 0).length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-border">
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() =>
                  setMobileAnalyticsOpen((prev) => ({
                    ...prev,
                    benchmark: !prev.benchmark,
                  }))
                }
                className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2"
                aria-label="Toggle Benchmark"
              >
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Benchmark
                  </div>
                  <div className="text-sm font-semibold text-foreground">Benchmark (SPY)</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${metricTone(excessVsBenchmark)}`}>
                    {benchmarkSummaryLabel}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      mobileAnalyticsOpen.benchmark ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
            </CardHeader>
            <CardContent
              className={`space-y-2 pt-1 text-xs ${
                mobileAnalyticsOpen.benchmark ? 'block' : 'hidden'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portfolio ({activeTimeframe})</span>
                <span className={metricTone(totalReturnPctForRange)}>
                  {formatPercent(totalReturnPctForRange)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">P/L ({activeTimeframe})</span>
                <span className={metricTone(totalReturnValueForRange)}>
                  {totalReturnValueForRange === null
                    ? '-'
                    : formatMoney(totalReturnValueForRange, baseCurrency, 0, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SPY ({activeTimeframe})</span>
                <span className={metricTone(benchmarkReturnPctForRange)}>
                  {formatPercent(benchmarkReturnPctForRange)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Excess</span>
                <span className={metricTone(excessVsBenchmark)}>
                  {formatPercent(excessVsBenchmark)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-2 sm:p-4 dark:bg-black/50">
          <Card className="mx-2 w-full max-w-md border border-border shadow-lg sm:mx-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransactionSide('BUY')}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    transactionSide === 'BUY'
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTransactionSide('SELL')}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    transactionSide === 'SELL'
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAddInputMode('manual')}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    addInputMode === 'manual'
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Manual Input
                </button>
                <button
                  onClick={() => setAddInputMode('automatic')}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    addInputMode === 'automatic'
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Automatic Input
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Symbol</label>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={search}
                    onChange={(event) => setSearch(event.target.value.toUpperCase())}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={buyDate}
                    onChange={(event) => setBuyDate(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Shares</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="10"
                    value={shares}
                    onChange={(event) => setShares(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {addInputMode === 'manual' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Execution Price</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="251.04"
                      value={fillPrice}
                      onChange={(event) => setFillPrice(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Fees</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={fees}
                    onChange={(event) => setFees(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Taxes</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={taxes}
                    onChange={(event) => setTaxes(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {addInputMode === 'manual' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Transaction Currency</label>
                  <select
                    value={tradeCurrency}
                    onChange={(event) => setTradeCurrency(normalizeCurrency(event.target.value))}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  {autoModePreview ? (
                    <div className="mt-1 text-foreground">
                      Preview: {formatMoney(autoModePreview.price, autoModePreview.currency, 2, 2)}
                    </div>
                  ) : null}
                </div>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 text-xs sm:flex-row sm:gap-3 sm:text-sm">
                <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction} disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : transactionSide === 'BUY' ? 'Add Buy' : 'Add Sell'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <style>{`
        :root {
          --chart-positive-color: #000;
        }
        html.dark {
          --chart-positive-color: #fff;
        }
      `}</style>
    </div>
  );
}
