'use client';

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Dot,
  ExternalLink,
  Newspaper,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import AnalystValuation from './AnalystValuation';

type ChartRange = '1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W';
type MobilePanelTab = 'analysis' | 'insider' | 'news';
type RightPanelTab = 'insider' | 'news';

interface StockData {
  symbol: string;
  name: string;
  logoUrl?: string;
  price: number;
  change: number;
  changePercent: number;
  dcf?: number;
  pe?: number;
  peg?: number;
  pb?: number;
  roe?: number;
  netMargin?: number;
  roic?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  epsGrowth?: number;
  debtEquity?: number;
  currentRatio?: number;
  freeCashFlow?: number;
}

interface InsiderTrade {
  company: string;
  symbol: string;
  insider: string;
  position: string;
  transaction: string;
  shares: number;
  price: number;
  value: number;
  date: string;
}

interface StockNewsItem {
  id: string;
  headline: string;
  datetime: number;
  summary: string;
  url: string;
  source: string;
}

type Metrics = {
  peRatio?: number;
  pbRatio?: number;
  pegRatio?: number;
  roe?: number;
  debtToEquity?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  epsGrowth?: number;
  roic?: number;
  currentRatio?: number;
  freeCashFlow?: number;
  companyName?: string;
  logoUrl?: string;
};

type FullChartPoint = {
  price: number;
  date: Date;
};

type ChartPoint = {
  name: string;
  price: number;
  date?: Date;
};

type QuoteSnapshot = {
  meta: Record<string, any>;
  price: number | null;
  previousClose: number | null;
};

type ChartCacheEntry = {
  fetchedAt: number;
  points: FullChartPoint[];
  quote: QuoteSnapshot;
};

type FundamentalsCacheEntry = {
  fetchedAt: number;
  metrics: Metrics;
  dcf: number | null;
};

type InsiderCacheEntry = {
  fetchedAt: number;
  company: string;
  trades: InsiderTrade[];
};

type NewsCacheEntry = {
  fetchedAt: number;
  items: StockNewsItem[];
};

type MetricKind = 'ratio' | 'percent' | 'billions';
type MetricField =
  | 'pe'
  | 'peg'
  | 'pb'
  | 'roe'
  | 'netMargin'
  | 'roic'
  | 'revenueGrowth'
  | 'earningsGrowth'
  | 'epsGrowth'
  | 'debtEquity'
  | 'currentRatio'
  | 'freeCashFlow';

type MetricRow = {
  label: string;
  field: MetricField;
  kind: MetricKind;
};

type MetricSection = {
  title: string;
  rows: readonly MetricRow[];
};
type SignalTone = 'positive' | 'neutral' | 'negative' | 'none';

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const CHART_CACHE_TTL_MS = 5 * 60 * 1000;
const FUNDAMENTALS_CACHE_TTL_MS = 10 * 60 * 1000;
const INSIDER_CACHE_TTL_MS = 10 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
const CHART_RANGES: readonly ChartRange[] = ['1M', '3M', '6M', '1Y'];
const NEWS_PAGE_SIZE = 6;

const buyRegex = /buy|purchase|acq|acquisition|award|option|gift/i;
const sellRegex = /sell|sale|dispose|disposition/i;

const METRIC_SECTIONS: readonly MetricSection[] = [
  {
    title: 'Valuation',
    rows: [
      { label: 'P/E Ratio', field: 'pe', kind: 'ratio' },
      { label: 'PEG Ratio', field: 'peg', kind: 'ratio' },
      { label: 'P/B Ratio', field: 'pb', kind: 'ratio' },
    ],
  },
  {
    title: 'Profitability',
    rows: [
      { label: 'ROE', field: 'roe', kind: 'percent' },
      { label: 'Net Margin', field: 'netMargin', kind: 'percent' },
      { label: 'ROIC', field: 'roic', kind: 'percent' },
    ],
  },
  {
    title: 'Growth',
    rows: [
      { label: 'Revenue', field: 'revenueGrowth', kind: 'percent' },
      { label: 'Earnings', field: 'earningsGrowth', kind: 'percent' },
      { label: 'EPS', field: 'epsGrowth', kind: 'percent' },
    ],
  },
  {
    title: 'Financial Health',
    rows: [
      { label: 'Debt/Equity', field: 'debtEquity', kind: 'ratio' },
      { label: 'Current Ratio', field: 'currentRatio', kind: 'ratio' },
      { label: 'FCF', field: 'freeCashFlow', kind: 'billions' },
    ],
  },
];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[$,]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toSafeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const normalized = raw.includes('://') ? raw : `https://${raw}`;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function hasMetricsSignal(metrics: Metrics | null | undefined): boolean {
  if (!metrics || typeof metrics !== 'object') return false;
  const keys: (keyof Metrics)[] = [
    'peRatio',
    'pbRatio',
    'pegRatio',
    'roe',
    'profitMargin',
    'roic',
    'revenueGrowth',
    'earningsGrowth',
    'epsGrowth',
    'debtToEquity',
    'currentRatio',
    'freeCashFlow',
  ];
  return keys.some(
    (key) => typeof metrics[key] === 'number' && Number.isFinite(metrics[key] as number),
  );
}

function formatRatio(value?: number, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value?: number, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}

function formatBillions(value?: number, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}B`;
}

function formatCompactCurrency(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(digits)}`;
}

function formatCompactNumber(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(digits)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(digits)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(digits)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(digits)}K`;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatCurrency(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatSignedCompactCurrency(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${formatCompactNumber(Math.abs(value), digits)}`;
}

function formatMetricValue(value: number | undefined, kind: MetricKind): string {
  if (kind === 'percent') return formatPercent(value);
  if (kind === 'billions') return formatBillions(value);
  return formatRatio(value);
}

function signalToneClasses(tone: SignalTone): {
  dot: string;
  value: string;
  pill: string;
} {
  if (tone === 'positive') {
    return {
      dot: 'bg-emerald-400',
      value: 'text-emerald-300',
      pill: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }
  if (tone === 'negative') {
    return {
      dot: 'bg-rose-400',
      value: 'text-rose-300',
      pill: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    };
  }
  if (tone === 'neutral') {
    return {
      dot: 'bg-amber-300',
      value: 'text-amber-200',
      pill: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    };
  }
  return {
    dot: 'bg-zinc-500',
    value: 'text-foreground',
    pill: 'border-border bg-background text-muted-foreground',
  };
}

function metricSignalTone(field: MetricField, value: number | undefined): SignalTone {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'none';

  switch (field) {
    case 'pe':
      if (value <= 25) return 'positive';
      if (value <= 40) return 'neutral';
      return 'negative';
    case 'peg':
      if (value <= 1.5) return 'positive';
      if (value <= 2.5) return 'neutral';
      return 'negative';
    case 'pb':
      if (value <= 4) return 'positive';
      if (value <= 8) return 'neutral';
      return 'negative';
    case 'roe':
      if (value >= 15) return 'positive';
      if (value >= 8) return 'neutral';
      return 'negative';
    case 'netMargin':
      if (value >= 15) return 'positive';
      if (value >= 8) return 'neutral';
      return 'negative';
    case 'roic':
      if (value >= 12) return 'positive';
      if (value >= 6) return 'neutral';
      return 'negative';
    case 'revenueGrowth':
    case 'earningsGrowth':
    case 'epsGrowth':
      if (value >= 10) return 'positive';
      if (value >= 0) return 'neutral';
      return 'negative';
    case 'debtEquity':
      if (value < 1) return 'positive';
      if (value <= 2) return 'neutral';
      return 'negative';
    case 'currentRatio':
      if (value >= 1.5 && value <= 3) return 'positive';
      if (value >= 1 && value < 1.5) return 'neutral';
      return 'negative';
    case 'freeCashFlow':
      return value > 0 ? 'positive' : 'negative';
    default:
      return 'none';
  }
}

function calcPercentChange(points: FullChartPoint[]): number | null {
  if (!points || points.length < 2) return null;
  const first = points[0].price;
  const last = points[points.length - 1].price;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return ((last - first) / first) * 100;
}

function getRangeDays(range: ChartRange): number {
  switch (range) {
    case '1M':
      return 31;
    case '3M':
      return 93;
    case '6M':
      return 186;
    case '1Y':
      return 365;
    case 'YTD': {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    }
    case '52W':
      return 365;
    default:
      return 31;
  }
}

function formatChartLabel(date: Date, range: ChartRange): string {
  if (['1M', '3M', '6M'].includes(range)) {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function filterChartPointsByRange(points: FullChartPoint[], range: ChartRange): FullChartPoint[] {
  if (!points.length) return [];
  if (range === 'YTD') {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return points.filter((point) => point.date >= startOfYear && point.date <= now);
  }
  if (range === '52W') {
    return points.slice(-Math.min(points.length, 365));
  }
  const days = getRangeDays(range);
  return points.slice(-Math.min(points.length, days));
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function getTransactionKind(transaction: string): 'buy' | 'sell' | 'other' {
  if (buyRegex.test(transaction)) return 'buy';
  if (sellRegex.test(transaction)) return 'sell';
  return 'other';
}

function getTradeValue(trade: InsiderTrade | undefined): number {
  if (!trade) return 0;
  const value =
    typeof trade.value === 'number' && Number.isFinite(trade.value)
      ? trade.value
      : trade.shares * trade.price;
  return Math.abs(value || 0);
}

function getSignedTradeValue(trade: InsiderTrade | undefined): number {
  if (!trade) return 0;
  const value = getTradeValue(trade);
  if (buyRegex.test(trade.transaction)) return value;
  if (sellRegex.test(trade.transaction)) return -value;
  return 0;
}

function normalizeInsiderTrade(
  raw: any,
  fallbackSymbol: string,
  fallbackCompany: string,
): InsiderTrade {
  const symbol =
    typeof raw?.symbol === 'string' && raw.symbol.trim()
      ? raw.symbol.trim().toUpperCase()
      : fallbackSymbol;
  const company =
    typeof raw?.company === 'string' && raw.company.trim() ? raw.company.trim() : fallbackCompany;

  return {
    symbol,
    company,
    insider: typeof raw?.insider === 'string' ? raw.insider : '',
    position: typeof raw?.position === 'string' ? raw.position : '',
    transaction: typeof raw?.transaction === 'string' ? raw.transaction : '',
    shares: toFiniteNumber(raw?.shares) ?? 0,
    price: toFiniteNumber(raw?.price) ?? 0,
    value: toFiniteNumber(raw?.value) ?? 0,
    date: typeof raw?.date === 'string' ? raw.date : '',
  };
}

function normalizeNewsItem(raw: any, fallbackSymbol: string): StockNewsItem | null {
  const headline = typeof raw?.headline === 'string' ? raw.headline.trim() : '';
  const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  const datetime = toFiniteNumber(raw?.datetime);
  if (!headline || !url || typeof datetime !== 'number') return null;

  return {
    id:
      (typeof raw?.id === 'string' && raw.id.trim()) ||
      `${fallbackSymbol}-${datetime}-${headline.slice(0, 24)}`,
    headline,
    datetime,
    summary: typeof raw?.summary === 'string' ? raw.summary.trim() : '',
    url,
    source: typeof raw?.source === 'string' && raw.source.trim() ? raw.source.trim() : 'Source',
  };
}

export default function StockAnalysis() {
  const [loading, setLoading] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState<MobilePanelTab>('analysis');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('insider');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [insiderError, setInsiderError] = useState<string | null>(null);
  const [insiderEmptyState, setInsiderEmptyState] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<StockNewsItem[]>([]);
  const [newsPage, setNewsPage] = useState(1);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [fullChartData, setFullChartData] = useState<FullChartPoint[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>('1M');
  const [activeSectionTitle, setActiveSectionTitle] = useState(METRIC_SECTIONS[0].title);
  const [insiderCompanyName, setInsiderCompanyName] = useState('');
  const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>([]);
  const [selectedTradeIndexes, setSelectedTradeIndexes] = useState<number[]>([]);
  const [logoCandidateIndex, setLogoCandidateIndex] = useState(0);

  const chartCacheRef = useRef<Record<string, ChartCacheEntry>>({});
  const fundamentalsCacheRef = useRef<Record<string, FundamentalsCacheEntry>>({});
  const insiderCacheRef = useRef<Record<string, InsiderCacheEntry>>({});
  const newsCacheRef = useRef<Record<string, NewsCacheEntry>>({});
  const requestSequenceRef = useRef(0);
  const chartRangeSequenceRef = useRef(0);

  const ytdData = useMemo(() => {
    if (!selectedStock) return [];
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return fullChartData.filter((point) => point.date >= startOfYear && point.date <= now);
  }, [fullChartData, selectedStock]);

  const week52Data = useMemo(() => {
    if (!selectedStock || fullChartData.length < 2) return [];
    return fullChartData.slice(-Math.min(fullChartData.length, 365));
  }, [fullChartData, selectedStock]);

  const ytdChange = useMemo(() => calcPercentChange(ytdData), [ytdData]);
  const week52Change = useMemo(() => calcPercentChange(week52Data), [week52Data]);
  const activeMetricSection = useMemo(
    () =>
      METRIC_SECTIONS.find((section) => section.title === activeSectionTitle) ?? METRIC_SECTIONS[0],
    [activeSectionTitle],
  );
  const logoCandidates = useMemo(() => {
    if (!selectedStock) return [] as string[];
    const fromMetrics = selectedStock.logoUrl;
    const bySymbol = `https://financialmodelingprep.com/image-stock/${encodeURIComponent(
      selectedStock.symbol,
    )}.png`;
    return Array.from(
      new Set([fromMetrics, bySymbol].filter((value): value is string => Boolean(value))),
    );
  }, [selectedStock]);
  const activeLogoUrl =
    logoCandidateIndex >= 0 && logoCandidateIndex < logoCandidates.length
      ? logoCandidates[logoCandidateIndex]
      : undefined;
  const newsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(newsItems.length / NEWS_PAGE_SIZE)),
    [newsItems.length],
  );
  const visibleNewsItems = useMemo(
    () => newsItems.slice((newsPage - 1) * NEWS_PAGE_SIZE, newsPage * NEWS_PAGE_SIZE),
    [newsItems, newsPage],
  );

  useEffect(() => {
    setLogoCandidateIndex(0);
  }, [selectedStock?.symbol, selectedStock?.logoUrl]);

  useEffect(() => {
    if (newsPage > newsTotalPages) {
      setNewsPage(newsTotalPages);
    }
  }, [newsPage, newsTotalPages]);

  const chartIsPositive =
    chartData.length > 1 && chartData[chartData.length - 1].price >= chartData[0].price;
  const chartColor = chartIsPositive ? '#e5e5e5' : '#a3a3a3';
  const chartSummary = useMemo(() => {
    if (!chartData.length) return null;
    const prices = chartData
      .map((point) => point.price)
      .filter((price) => typeof price === 'number' && Number.isFinite(price));
    if (!prices.length) return null;
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const last = prices[prices.length - 1];
    return { low, high, last };
  }, [chartData]);
  const buyCount = useMemo(
    () => insiderTrades.filter((trade) => buyRegex.test(trade.transaction)).length,
    [insiderTrades],
  );
  const sellCount = useMemo(
    () => insiderTrades.filter((trade) => sellRegex.test(trade.transaction)).length,
    [insiderTrades],
  );
  const buyVolume = useMemo(
    () =>
      insiderTrades
        .filter((trade) => buyRegex.test(trade.transaction))
        .reduce((sum, trade) => sum + getTradeValue(trade), 0),
    [insiderTrades],
  );
  const sellVolume = useMemo(
    () =>
      insiderTrades
        .filter((trade) => sellRegex.test(trade.transaction))
        .reduce((sum, trade) => sum + getTradeValue(trade), 0),
    [insiderTrades],
  );
  const netVolume = useMemo(() => buyVolume - sellVolume, [buyVolume, sellVolume]);
  const uniqueInsiderCount = useMemo(
    () => new Set(insiderTrades.map((trade) => trade.insider).filter(Boolean)).size,
    [insiderTrades],
  );
  const latestInsiderTradeDate = insiderTrades.length ? insiderTrades[0].date : null;
  const selectedTradesNet = useMemo(
    () =>
      selectedTradeIndexes
        .map((index) => getSignedTradeValue(insiderTrades[index]))
        .reduce((sum, tradeValue) => sum + tradeValue, 0),
    [selectedTradeIndexes, insiderTrades],
  );

  const insiderChartData = useMemo(() => {
    const grouped: Record<string, { date: string; buy: number; sell: number; net: number }> = {};
    insiderTrades.forEach((trade) => {
      const key = trade.date;
      if (!grouped[key]) {
        grouped[key] = { date: key, buy: 0, sell: 0, net: 0 };
      }
      if (buyRegex.test(trade.transaction)) grouped[key].buy += getTradeValue(trade);
      if (sellRegex.test(trade.transaction)) grouped[key].sell += getTradeValue(trade);
    });
    return Object.values(grouped)
      .map((entry) => ({ ...entry, net: entry.buy - entry.sell, sellSigned: -entry.sell }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [insiderTrades]);

  const insiderChartAbsMax = useMemo(() => {
    if (!insiderChartData.length) return 0;
    return Math.max(...insiderChartData.map((point) => Math.max(point.buy, point.sell)));
  }, [insiderChartData]);

  const insiderChartStats = useMemo(() => {
    if (!insiderChartData.length) return null;
    const peakBuy = Math.max(...insiderChartData.map((point) => point.buy));
    const peakSell = Math.max(...insiderChartData.map((point) => point.sell));
    const avgNet =
      insiderChartData.reduce((sum, point) => sum + point.net, 0) / insiderChartData.length;
    return { peakBuy, peakSell, avgNet };
  }, [insiderChartData]);

  async function fetchAdditionalMetrics(symbol: string): Promise<Metrics> {
    try {
      const response = await fetch(`/api/metrics?symbol=${symbol}`);
      if (!response.ok) return {};
      return await response.json();
    } catch {
      return {};
    }
  }

  async function fetchDcfValue(symbol: string): Promise<number | null> {
    try {
      const response = await fetch(`/api/dcf?symbol=${encodeURIComponent(symbol)}`);
      if (!response.ok) return null;
      const payload = await response.json();
      const dcfCandidate = payload?.dcf ?? payload?.[0]?.dcf;
      return typeof dcfCandidate === 'number' && Number.isFinite(dcfCandidate)
        ? dcfCandidate
        : null;
    } catch {
      return null;
    }
  }

  async function fetchFundamentals(
    symbol: string,
  ): Promise<{ metrics: Metrics; dcf: number | null }> {
    const cached = fundamentalsCacheRef.current[symbol];
    const now = Date.now();

    if (
      cached &&
      now - cached.fetchedAt < FUNDAMENTALS_CACHE_TTL_MS &&
      (hasMetricsSignal(cached.metrics) || cached.dcf !== null)
    ) {
      return { metrics: cached.metrics, dcf: cached.dcf };
    }

    const [metrics, dcf] = await Promise.all([
      fetchAdditionalMetrics(symbol),
      fetchDcfValue(symbol),
    ]);

    if (hasMetricsSignal(metrics) || dcf !== null) {
      fundamentalsCacheRef.current[symbol] = {
        fetchedAt: now,
        metrics,
        dcf,
      };
    } else {
      delete fundamentalsCacheRef.current[symbol];
    }

    return { metrics, dcf };
  }

  function applyChartRange(points: FullChartPoint[], range: ChartRange) {
    setFullChartData(points);
    const filtered = filterChartPointsByRange(points, range);
    const normalized = filtered.map((point) => ({
      name: formatChartLabel(point.date, range),
      price: point.price,
      date: point.date,
    }));
    setChartData(normalized);
  }

  async function fetchChartSnapshot(
    symbol: string,
  ): Promise<{ points: FullChartPoint[]; quote: QuoteSnapshot } | null> {
    const cached = chartCacheRef.current[symbol];
    const now = Date.now();

    if (cached && now - cached.fetchedAt < CHART_CACHE_TTL_MS && cached.points.length > 0) {
      return { points: cached.points, quote: cached.quote };
    }

    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - 5 * 365 * 24 * 60 * 60;
    const response = await fetch(
      `/api/quote?symbol=${encodeURIComponent(symbol)}&chart=1&period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`,
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const meta = result?.meta ?? {};
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;

    let points: FullChartPoint[] = [];
    if (Array.isArray(timestamps) && Array.isArray(closes)) {
      points = timestamps
        .map((ts: number, idx: number) => ({
          date: new Date(ts * 1000),
          price: closes[idx],
        }))
        .filter((point) => typeof point.price === 'number' && !Number.isNaN(point.price));
    }

    const latestClose = points.length ? points[points.length - 1].price : null;
    const previousClose =
      toFiniteNumber(meta?.previousClose) ??
      (points.length > 1 ? points[points.length - 2].price : null);

    const snapshot: QuoteSnapshot = {
      meta,
      price: toFiniteNumber(meta?.regularMarketPrice) ?? latestClose,
      previousClose,
    };

    chartCacheRef.current[symbol] = {
      fetchedAt: now,
      points,
      quote: snapshot,
    };

    return { points, quote: snapshot };
  }

  async function fetchInsiderSnapshot(
    symbol: string,
  ): Promise<{ company: string; trades: InsiderTrade[] }> {
    const cached = insiderCacheRef.current[symbol];
    const now = Date.now();

    if (cached && now - cached.fetchedAt < INSIDER_CACHE_TTL_MS) {
      return { company: cached.company, trades: cached.trades };
    }

    const response = await fetch(`/api/insider-trades?symbol=${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      throw new Error(`Error fetching insider data: ${response.status}`);
    }

    const payload = await response.json();
    const company =
      typeof payload?.company === 'string' && payload.company.trim()
        ? payload.company.trim()
        : symbol;
    const rows: any[] = Array.isArray(payload?.trades) ? payload.trades : [];
    const trades = rows
      .map((row: any) => normalizeInsiderTrade(row, symbol, company))
      .filter((trade: InsiderTrade) => trade.date && trade.insider)
      .sort(
        (a: InsiderTrade, b: InsiderTrade) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

    insiderCacheRef.current[symbol] = {
      fetchedAt: now,
      company,
      trades,
    };

    return { company, trades };
  }

  async function fetchNewsSnapshot(symbol: string): Promise<StockNewsItem[]> {
    const cached = newsCacheRef.current[symbol];
    const now = Date.now();

    if (cached && now - cached.fetchedAt < NEWS_CACHE_TTL_MS) {
      return cached.items;
    }

    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - 6);

    const response = await fetch(
      `/api/news?ticker=${encodeURIComponent(symbol)}&from=${fromDate.toISOString().slice(0, 10)}&to=${toDate
        .toISOString()
        .slice(0, 10)}`,
    );

    if (!response.ok) {
      throw new Error(`Error fetching news: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const items = rows
      .map((row: any) => normalizeNewsItem(row, symbol))
      .filter((item: StockNewsItem | null): item is StockNewsItem => item !== null);

    newsCacheRef.current[symbol] = {
      fetchedAt: now,
      items,
    };

    return items;
  }

  function selectRightPanelTab(tab: RightPanelTab) {
    setRightPanelTab(tab);
    setMobilePanelTab(tab);
  }

  async function handleSearch() {
    const symbol = searchSymbol.trim().toUpperCase();
    if (!symbol) return;

    if (!SYMBOL_PATTERN.test(symbol)) {
      setValidationError('Please enter a valid ticker symbol.');
      setSelectedStock(null);
      setChartData([]);
      setFullChartData([]);
      setInsiderTrades([]);
      setInsiderCompanyName('');
      setSelectedTradeIndexes([]);
      setInsiderEmptyState(null);
      setAnalysisError(null);
      setInsiderError(null);
      setNewsError(null);
      setNewsItems([]);
      setNewsPage(1);
      return;
    }

    const requestId = ++requestSequenceRef.current;
    chartRangeSequenceRef.current += 1;

    setActiveSymbol(symbol);
    setValidationError(null);
    setAnalysisError(null);
    setInsiderError(null);
    setInsiderEmptyState(null);
    setNewsError(null);
    setNewsItems([]);
    setNewsPage(1);
    setSelectedTradeIndexes([]);
    setSelectedStock(null);
    setChartData([]);
    setFullChartData([]);
    setInsiderTrades([]);
    setInsiderCompanyName('');
    setLoading(true);

    try {
      const [chartResult, fundamentalsResult, insiderResult, newsResult] = await Promise.allSettled(
        [
          fetchChartSnapshot(symbol),
          fetchFundamentals(symbol),
          fetchInsiderSnapshot(symbol),
          fetchNewsSnapshot(symbol),
        ],
      );

      if (requestId !== requestSequenceRef.current) return;

      const chartSnapshot = chartResult.status === 'fulfilled' ? chartResult.value : null;
      const fundamentals =
        fundamentalsResult.status === 'fulfilled'
          ? fundamentalsResult.value
          : { metrics: {}, dcf: null };

      if (chartSnapshot?.quote) {
        applyChartRange(chartSnapshot.points, chartRange);

        const meta = chartSnapshot.quote.meta || {};
        const price = chartSnapshot.quote.price;
        const previousClose = chartSnapshot.quote.previousClose;
        const hasValidPrice = typeof price === 'number' && Number.isFinite(price);
        const hasPreviousClose =
          typeof previousClose === 'number' && Number.isFinite(previousClose);
        const change = hasValidPrice && hasPreviousClose ? price - previousClose : 0;
        const changePercent =
          hasValidPrice && hasPreviousClose && previousClose !== 0
            ? (change / previousClose) * 100
            : 0;

        if (hasValidPrice) {
          setSelectedStock({
            symbol,
            name: fundamentals.metrics?.companyName || meta?.longName || meta?.shortName || symbol,
            logoUrl: toSafeHttpUrl(fundamentals.metrics?.logoUrl),
            price,
            change,
            changePercent,
            dcf: fundamentals.dcf ?? undefined,
            pe: fundamentals.metrics?.peRatio,
            peg: fundamentals.metrics?.pegRatio,
            pb: fundamentals.metrics?.pbRatio,
            roe: fundamentals.metrics?.roe,
            netMargin: fundamentals.metrics?.profitMargin,
            roic: fundamentals.metrics?.roic,
            revenueGrowth: fundamentals.metrics?.revenueGrowth,
            earningsGrowth: fundamentals.metrics?.earningsGrowth,
            epsGrowth: fundamentals.metrics?.epsGrowth,
            debtEquity: fundamentals.metrics?.debtToEquity,
            currentRatio: fundamentals.metrics?.currentRatio,
            freeCashFlow: fundamentals.metrics?.freeCashFlow,
          });
          setAnalysisError(null);
        } else {
          setSelectedStock(null);
          setChartData([]);
          setFullChartData([]);
          setAnalysisError('Stock quote unavailable for this ticker.');
        }
      } else {
        setSelectedStock(null);
        setChartData([]);
        setFullChartData([]);
        setAnalysisError('Error fetching stock analysis data.');
      }

      if (insiderResult.status === 'fulfilled') {
        const payload = insiderResult.value;
        setInsiderCompanyName(payload.company || symbol);
        setInsiderTrades(payload.trades);
        setInsiderError(null);

        if (!payload.trades.length) {
          setInsiderEmptyState(
            `No recent insider filings found for ${symbol}. Try another symbol or check again later.`,
          );
        }
      } else {
        setInsiderTrades([]);
        setInsiderCompanyName(symbol);
        setInsiderEmptyState(null);
        setInsiderError(
          insiderResult.reason instanceof Error
            ? insiderResult.reason.message
            : 'Error fetching insider trades.',
        );
      }

      if (newsResult.status === 'fulfilled') {
        setNewsItems(newsResult.value);
        setNewsError(null);
        setNewsPage(1);
      } else {
        setNewsItems([]);
        setNewsPage(1);
        setNewsError(
          newsResult.status === 'rejected' && newsResult.reason instanceof Error
            ? newsResult.reason.message
            : 'Error fetching news.',
        );
      }
    } catch (err: unknown) {
      if (requestId !== requestSequenceRef.current) return;

      setAnalysisError('Unknown error while fetching stock data.');
      setInsiderError(
        err instanceof Error ? err.message : 'Unknown error while fetching insider data.',
      );
      setSelectedStock(null);
      setChartData([]);
      setFullChartData([]);
      setInsiderTrades([]);
      setInsiderCompanyName(symbol);
      setInsiderEmptyState(null);
      setNewsItems([]);
      setNewsPage(1);
      setNewsError(err instanceof Error ? err.message : 'Unknown error while fetching news.');
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }

  function toggleSelectTrade(index: number) {
    setSelectedTradeIndexes((prev) =>
      prev.includes(index) ? prev.filter((tradeIndex) => tradeIndex !== index) : [...prev, index],
    );
  }

  const shellClass = 'mx-auto w-full max-w-[72rem] space-y-2 sm:space-y-3';
  const panelClass = 'rounded-2xl border border-border/70 bg-card/70';
  const sectionClass = `${panelClass} p-3 sm:p-3.5`;
  const captionClass =
    'text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]';
  const metricRowClass =
    'flex items-center justify-between border-b border-border/60 py-1 text-xs sm:text-sm last:border-b-0';
  const tradeContainerClass = 'et-scrollbar max-h-[260px] overflow-y-auto pr-1 sm:max-h-[300px]';

  const hasResultState = Boolean(
    selectedStock ||
      analysisError ||
      insiderTrades.length ||
      insiderError ||
      insiderEmptyState ||
      insiderCompanyName,
  );
  const resolvedSymbol = selectedStock?.symbol || activeSymbol;

  return (
    <div className={shellClass}>
      <div
        className={`${panelClass} bg-gradient-to-b from-card/90 to-card/60 px-3 py-3 pr-14 sm:px-3.5 sm:py-3.5 sm:pr-16`}
      >
        <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground sm:text-[1.4rem]">
          Stock Analysis
        </h2>
        <form
          className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <Input
            placeholder="Enter ticker"
            value={searchSymbol}
            onChange={(event) => setSearchSymbol(event.target.value.toUpperCase())}
            className="h-9 min-w-0 rounded-xl border-border/80 bg-background/70 text-sm placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-9 w-11 rounded-xl border border-border/80 bg-background/80 px-0 text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.02)] hover:bg-secondary/70"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search ticker</span>
          </Button>
        </form>
      </div>

      {validationError && (
        <Alert
          variant="destructive"
          className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-900/20 px-3 py-2.5 text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <span className="text-sm">{validationError}</span>
        </Alert>
      )}

      <div className={`${panelClass} p-1 md:hidden`}>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setMobilePanelTab('analysis')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mobilePanelTab === 'analysis'
                ? 'bg-foreground text-background'
                : 'bg-background text-muted-foreground'
            }`}
          >
            Analysis
          </button>
          <button
            type="button"
            onClick={() => selectRightPanelTab('insider')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mobilePanelTab === 'insider'
                ? 'bg-foreground text-background'
                : 'bg-background text-muted-foreground'
            }`}
          >
            Insider
          </button>
          <button
            type="button"
            onClick={() => selectRightPanelTab('news')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mobilePanelTab === 'news'
                ? 'bg-foreground text-background'
                : 'bg-background text-muted-foreground'
            }`}
          >
            News
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 items-start gap-2.5 sm:gap-3 xl:grid-cols-2">
          <div
            className={`${mobilePanelTab === 'analysis' ? 'block' : 'hidden'} space-y-2.5 md:block`}
          >
            <div className={`${sectionClass} flex items-start justify-between`}>
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-7 w-28" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="ml-auto h-3 w-12" />
                <Skeleton className="ml-auto h-8 w-24" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={`analysis-skeleton-${idx}`} className={`${panelClass} px-3 py-2.5`}>
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="mt-1.5 h-4 w-16" />
                </div>
              ))}
            </div>

            <div className={sectionClass}>
              <Skeleton className="h-3 w-24" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>

            <div className={sectionClass}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-[160px] w-full sm:h-[190px]" />
            </div>
          </div>

          <div
            className={`${mobilePanelTab === 'insider' || mobilePanelTab === 'news' ? 'block' : 'hidden'} space-y-2.5 md:block`}
          >
            <div className={`${sectionClass} flex items-start justify-between`}>
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="ml-auto h-3 w-12" />
                <Skeleton className="ml-auto h-8 w-24" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={`insider-skeleton-${idx}`} className={`${panelClass} px-3 py-2.5`}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1.5 h-4 w-14" />
                </div>
              ))}
            </div>

            <div className={sectionClass}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-[150px] w-full sm:h-[170px]" />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
              {[...Array(4)].map((_, idx) => (
                <div key={`trade-skeleton-${idx}`} className={`${panelClass} p-2.5`}>
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : hasResultState ? (
        <div className="grid grid-cols-1 items-start gap-2.5 sm:gap-3 xl:grid-cols-2">
          <div
            className={`${mobilePanelTab === 'analysis' ? 'block' : 'hidden'} space-y-2.5 sm:space-y-3 md:block`}
          >
            {analysisError && !selectedStock && (
              <Alert
                variant="destructive"
                className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-900/20 px-3 py-2.5 text-rose-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <span className="text-sm">{analysisError}</span>
              </Alert>
            )}

            {selectedStock ? (
              <>
                <div className={sectionClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 self-center">
                      <div className="flex items-start gap-2.5">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border/70 bg-zinc-50">
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-zinc-500">
                            {selectedStock.symbol.slice(0, 2)}
                          </span>
                          {activeLogoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={activeLogoUrl}
                              alt={`${selectedStock.name} logo`}
                              className="absolute inset-0 h-full w-full object-contain"
                              loading="lazy"
                              onError={() => {
                                setLogoCandidateIndex((current) => {
                                  const next = current + 1;
                                  return next < logoCandidates.length
                                    ? next
                                    : logoCandidates.length;
                                });
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[1.2rem] font-semibold leading-tight text-foreground sm:text-[1.35rem]">
                            {selectedStock.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="tabular-nums text-[1.45rem] font-semibold leading-none tracking-tight text-foreground sm:text-[1.6rem]">
                        ${selectedStock.price.toFixed(2)}
                      </p>
                      <p
                        className={`mt-1 text-[0.95rem] font-semibold leading-none tabular-nums sm:text-[1rem] ${
                          selectedStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {selectedStock.changePercent >= 0 ? '+' : ''}
                        {selectedStock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className={sectionClass}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className={captionClass}>Fundamentals</p>
                    </div>
                    <div className="et-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
                      {METRIC_SECTIONS.map((section) => (
                        <button
                          key={section.title}
                          onClick={() => setActiveSectionTitle(section.title)}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            activeMetricSection.title === section.title
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    {activeMetricSection.rows.map((row) => {
                      const toneClasses = signalToneClasses(
                        metricSignalTone(row.field, selectedStock[row.field]),
                      );
                      return (
                        <div
                          key={`${activeMetricSection.title}-${row.field}`}
                          className={metricRowClass}
                        >
                          <span className="inline-flex items-center text-xs text-foreground sm:text-sm">
                            <span className={`mr-2 h-1.5 w-1.5 rounded-full ${toneClasses.dot}`} />
                            {row.label}
                          </span>
                          <span
                            className={`shrink-0 text-right text-xs font-semibold tabular-nums sm:text-sm ${toneClasses.value}`}
                          >
                            {formatMetricValue(selectedStock[row.field], row.kind)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className={sectionClass}>
                    <p className={captionClass}>DCF Valuation</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-foreground sm:text-lg">
                        {selectedStock.dcf !== undefined && selectedStock.dcf !== null
                          ? `$${Number(selectedStock.dcf).toFixed(2)}`
                          : 'Not available'}
                      </span>
                      {selectedStock.dcf !== undefined &&
                        selectedStock.dcf !== null &&
                        selectedStock.price !== undefined &&
                        selectedStock.price !== null && (
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                              Number(selectedStock.price) > Number(selectedStock.dcf)
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            {Number(selectedStock.price) > Number(selectedStock.dcf)
                              ? 'Overvalued'
                              : 'Undervalued'}
                          </span>
                        )}
                    </div>
                  </div>

                  <AnalystValuation symbol={selectedStock.symbol} price={selectedStock.price} />
                </div>

                <div className={sectionClass}>
                  <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className={captionClass}>Price Action</p>
                    </div>
                  </div>
                  {chartSummary && (
                    <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                        <span className="text-muted-foreground">Low</span>
                        <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                          {formatCompactCurrency(chartSummary.low)}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                        <span className="text-muted-foreground">High</span>
                        <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                          {formatCompactCurrency(chartSummary.high)}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                        <span className="text-muted-foreground">Last</span>
                        <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                          {formatCompactCurrency(chartSummary.last)}
                        </div>
                      </div>
                    </div>
                  )}

                  {chartData.length > 0 ? (
                    <ChartContainer
                      className="h-[155px] !aspect-auto sm:h-[185px]"
                      config={{ price: { label: 'Price', color: '#e5e5e5' } }}
                    >
                      <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 2, bottom: 0 }}>
                        <defs>
                          <linearGradient id="stockPriceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="4%" stopColor={chartColor} stopOpacity={0.66} />
                            <stop offset="96%" stopColor={chartColor} stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="rgba(161,161,170,0.18)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#a1a1aa', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={18}
                        />
                        <YAxis
                          tick={{ fill: '#a1a1aa', fontSize: 10 }}
                          tickFormatter={(value: number) => formatCompactCurrency(value, 1)}
                          axisLine={false}
                          tickLine={false}
                          width={44}
                          domain={[
                            'dataMin - (dataMax-dataMin)*0.05',
                            'dataMax + (dataMax-dataMin)*0.05',
                          ]}
                          allowDataOverflow={true}
                        />
                        {chartSummary && (
                          <ReferenceLine
                            y={chartSummary.last}
                            stroke="rgba(229,231,235,0.32)"
                            strokeDasharray="4 4"
                            ifOverflow="extendDomain"
                          />
                        )}
                        <Tooltip
                          cursor={{ stroke: 'rgba(161,161,170,0.35)', strokeDasharray: '4 4' }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;
                            const point = payload[0].payload;
                            const priceValue =
                              typeof point?.price === 'number' ? point.price : null;
                            return (
                              <div className="rounded-lg border border-border bg-background/95 px-2 py-1 text-[10px] text-foreground shadow-sm">
                                <div className="font-medium text-muted-foreground">
                                  {point?.date
                                    ? new Date(point.date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    : label}
                                </div>
                                <div className="mt-0.5 tabular-nums text-xs font-semibold text-foreground">
                                  {priceValue !== null ? `$${priceValue.toFixed(2)}` : '-'}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={chartColor}
                          fillOpacity={1}
                          fill="url(#stockPriceGradient)"
                          strokeWidth={2}
                          isAnimationActive={true}
                          animationDuration={450}
                          dot={false}
                          activeDot={{
                            r: 2.5,
                            strokeWidth: 1,
                            stroke: chartColor,
                            fill: '#0a0a0a',
                          }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[155px] items-center justify-center rounded-lg border border-border/70 bg-background/30 text-sm text-muted-foreground sm:h-[185px]">
                      No data available.
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
                      {CHART_RANGES.map((range) => (
                        <button
                          key={range}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            chartRange === range
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={async () => {
                            if (chartRange === range) return;

                            const symbol = selectedStock.symbol;
                            const searchSequence = requestSequenceRef.current;
                            const rangeSequence = ++chartRangeSequenceRef.current;

                            setChartRange(range);
                            const snapshot = await fetchChartSnapshot(symbol);

                            if (
                              !snapshot ||
                              searchSequence !== requestSequenceRef.current ||
                              rangeSequence !== chartRangeSequenceRef.current
                            ) {
                              return;
                            }

                            applyChartRange(snapshot.points, range);
                          }}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <div className="rounded-md border border-border bg-background px-1.5 py-0.5">
                        <span className="text-muted-foreground">YTD</span>
                        <span
                          className={
                            ytdChange !== null
                              ? ytdChange >= 0
                                ? 'ml-1 text-emerald-400'
                                : 'ml-1 text-rose-400'
                              : 'ml-1 text-foreground'
                          }
                        >
                          {ytdChange !== null
                            ? `${ytdChange > 0 ? '+' : ''}${ytdChange.toFixed(2)}%`
                            : ' - '}
                        </span>
                      </div>
                      <div className="rounded-md border border-border bg-background px-1.5 py-0.5">
                        <span className="text-muted-foreground">52W</span>
                        <span
                          className={
                            week52Change !== null
                              ? week52Change >= 0
                                ? 'ml-1 text-emerald-400'
                                : 'ml-1 text-rose-400'
                              : 'ml-1 text-foreground'
                          }
                        >
                          {week52Change !== null
                            ? `${week52Change > 0 ? '+' : ''}${week52Change.toFixed(2)}%`
                            : ' - '}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              !analysisError && (
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span className="text-xs font-normal text-muted-foreground">
                    Search a ticker to load valuation, fundamentals, and price action.
                  </span>
                </div>
              )
            )}
          </div>

          <div
            className={`${mobilePanelTab === 'insider' || mobilePanelTab === 'news' ? 'block' : 'hidden'} space-y-2.5 sm:space-y-3 md:block`}
          >
            <div className="hidden px-0 py-0 md:block">
              <div className="flex items-center justify-between gap-3">
                <div className="grid w-full max-w-[13.5rem] grid-cols-2 gap-1 rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => selectRightPanelTab('insider')}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      rightPanelTab === 'insider'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Insider
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRightPanelTab('news')}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      rightPanelTab === 'news'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    News
                  </button>
                </div>
              </div>
            </div>

            {rightPanelTab === 'insider' ? (
              <>
                {insiderError && (
                  <Alert
                    variant="destructive"
                    className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-900/20 px-3 py-2.5 text-rose-200"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    <span className="text-sm">{insiderError}</span>
                  </Alert>
                )}

                {!insiderError && insiderTrades.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div
                        className={`${panelClass} col-span-2 flex items-center gap-2 px-2.5 py-2 sm:col-span-1`}
                      >
                        <div
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            netVolume >= 0
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          {netVolume >= 0 ? (
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Net Flow
                          </p>
                          <p
                            className={`mt-0.5 truncate text-xs font-semibold tabular-nums sm:text-sm ${
                              netVolume >= 0 ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {formatSignedCompactCurrency(netVolume)}
                          </p>
                        </div>
                      </div>
                      <div className={`${panelClass} flex items-center gap-2 px-2.5 py-2`}>
                        <div className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                          <Users className="h-3 w-3" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Active Insiders
                          </p>
                          <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                            {uniqueInsiderCount}
                          </p>
                        </div>
                      </div>
                      <div className={`${panelClass} flex items-center gap-2 px-2.5 py-2`}>
                        <div className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Latest Filing
                          </p>
                          <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                            {latestInsiderTradeDate ? formatFullDate(latestInsiderTradeDate) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className={`${panelClass} px-2.5 py-2`}>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Buy Trades
                        </p>
                        <p className="mt-1 text-xs font-semibold tabular-nums text-emerald-300 sm:text-sm">
                          {buyCount}
                        </p>
                      </div>
                      <div className={`${panelClass} px-2.5 py-2`}>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Sell Trades
                        </p>
                        <p className="mt-1 text-xs font-semibold tabular-nums text-rose-300 sm:text-sm">
                          {sellCount}
                        </p>
                      </div>
                      <div className={`${panelClass} px-2.5 py-2`}>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Buy Volume
                        </p>
                        <p className="mt-1 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                          ${formatCompactNumber(buyVolume)}
                        </p>
                      </div>
                      <div className={`${panelClass} px-2.5 py-2`}>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Sell Volume
                        </p>
                        <p className="mt-1 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                          ${formatCompactNumber(sellVolume)}
                        </p>
                      </div>
                    </div>

                    <div className={sectionClass}>
                      {insiderChartStats && (
                        <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px]">
                          <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                            <span className="text-muted-foreground">Peak Buy</span>
                            <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                              ${formatCompactNumber(insiderChartStats.peakBuy, 2)}
                            </div>
                          </div>
                          <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                            <span className="text-muted-foreground">Peak Sell</span>
                            <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                              ${formatCompactNumber(insiderChartStats.peakSell, 2)}
                            </div>
                          </div>
                          <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                            <span className="text-muted-foreground">Avg Net</span>
                            <div
                              className={`mt-0.5 font-semibold tabular-nums ${
                                insiderChartStats.avgNet >= 0 ? 'text-emerald-300' : 'text-rose-300'
                              }`}
                            >
                              {formatSignedCompactCurrency(insiderChartStats.avgNet, 2)}
                            </div>
                          </div>
                        </div>
                      )}

                      <ChartContainer
                        className="h-[145px] !aspect-auto sm:h-[170px]"
                        config={{
                          buy: { label: 'Buy Volume', color: '#34d399' },
                          sellSigned: { label: 'Sell Volume', color: '#fb7185' },
                        }}
                      >
                        <BarChart
                          data={insiderChartData}
                          margin={{ top: 8, right: 8, left: -2, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="insiderBuyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.92} />
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0.5} />
                            </linearGradient>
                            <linearGradient id="insiderSellGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fb7185" stopOpacity={0.92} />
                              <stop offset="95%" stopColor="#fb7185" stopOpacity={0.5} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            stroke="rgba(161,161,170,0.18)"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#a1a1aa', fontSize: 10 }}
                            tickFormatter={(value: string) => formatShortDate(value)}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={20}
                          />
                          <YAxis
                            tick={{ fill: '#a1a1aa', fontSize: 10 }}
                            tickFormatter={(value: number) =>
                              `${value < 0 ? '-' : ''}$${formatCompactNumber(Math.abs(value), 1)}`
                            }
                            axisLine={false}
                            tickLine={false}
                            width={44}
                            domain={
                              insiderChartAbsMax > 0
                                ? [-insiderChartAbsMax * 1.15, insiderChartAbsMax * 1.15]
                                : ['auto', 'auto']
                            }
                          />
                          <ReferenceLine
                            y={0}
                            stroke="rgba(161,161,170,0.35)"
                            strokeDasharray="3 3"
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const point = payload[0]?.payload as
                                | { date: string; buy: number; sell: number; net: number }
                                | undefined;
                              if (!point) return null;
                              return (
                                <div className="rounded-lg border border-border bg-background/95 px-2 py-1 text-[10px] text-foreground shadow-sm">
                                  <div className="font-medium text-muted-foreground">
                                    {formatFullDate(String(label || point.date))}
                                  </div>
                                  <div className="mt-1 text-emerald-300">
                                    Buy: ${formatCompactNumber(point.buy)}
                                  </div>
                                  <div className="text-rose-300">
                                    Sell: ${formatCompactNumber(point.sell)}
                                  </div>
                                  <div
                                    className={
                                      point.net >= 0 ? 'text-emerald-300' : 'text-rose-300'
                                    }
                                  >
                                    Net: {formatSignedCompactCurrency(point.net)}
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Bar
                            dataKey="buy"
                            fill="url(#insiderBuyGradient)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={14}
                          />
                          <Bar
                            dataKey="sellSigned"
                            fill="url(#insiderSellGradient)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={14}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>

                    {selectedTradeIndexes.length > 0 && (
                      <div className="flex items-center justify-center">
                        <div className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground sm:text-sm">
                          Selected total: {selectedTradesNet >= 0 ? '+' : '-'}$
                          {formatCompactNumber(Math.abs(selectedTradesNet))}
                        </div>
                      </div>
                    )}

                    <div className="text-center text-[11px] text-muted-foreground">
                      Select transactions to aggregate signed value.
                    </div>

                    <div className={tradeContainerClass}>
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                        {insiderTrades.map((trade, index) => {
                          const selected = selectedTradeIndexes.includes(index);
                          const transactionKind = getTransactionKind(trade.transaction);
                          const transactionClass =
                            transactionKind === 'buy'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : transactionKind === 'sell'
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                : 'border-border bg-background text-muted-foreground';
                          const transactionLabel =
                            transactionKind === 'buy'
                              ? 'Buy'
                              : transactionKind === 'sell'
                                ? 'Sell'
                                : trade.transaction;
                          const tradeValue = getTradeValue(trade);
                          const signedTradeValueLabel =
                            transactionKind === 'buy'
                              ? `+$${formatCompactNumber(tradeValue)}`
                              : transactionKind === 'sell'
                                ? `-$${formatCompactNumber(tradeValue)}`
                                : `$${formatCompactNumber(tradeValue)}`;

                          return (
                            <button
                              key={`${trade.symbol}-${trade.date}-${trade.insider}-${index}`}
                              type="button"
                              onClick={() => toggleSelectTrade(index)}
                              className={`${panelClass} w-full p-2.5 text-left transition-colors sm:p-3 ${
                                selected ? 'border-foreground bg-card' : 'hover:bg-card/90'
                              }`}
                              aria-pressed={selected}
                              aria-label={`Toggle insider transaction ${index + 1}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                                    {trade.insider}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                    {trade.position}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span
                                    className={`text-[10px] font-semibold tabular-nums ${
                                      transactionKind === 'buy'
                                        ? 'text-emerald-300'
                                        : transactionKind === 'sell'
                                          ? 'text-rose-300'
                                          : 'text-foreground'
                                    }`}
                                  >
                                    {signedTradeValueLabel}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${transactionClass}`}
                                  >
                                    {transactionKind === 'buy' ? (
                                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                    ) : transactionKind === 'sell' ? (
                                      <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                                    ) : (
                                      <Dot className="h-3 w-3" aria-hidden="true" />
                                    )}
                                    {transactionLabel}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-1.5 text-[10px] text-muted-foreground">
                                {formatFullDate(trade.date)}
                              </p>

                              <div className="mt-2 grid grid-cols-3 gap-1.5">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                    Price
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground sm:text-xs">
                                    {formatCurrency(trade.price)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                    Shares
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground sm:text-xs">
                                    {formatCompactNumber(trade.shares)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                    Value
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground sm:text-xs">
                                    ${formatCompactNumber(tradeValue)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {!insiderError && insiderTrades.length === 0 && !!insiderEmptyState && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-200">
                    {insiderEmptyState}
                  </div>
                )}

                {!insiderError && insiderTrades.length === 0 && !insiderEmptyState && (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-muted-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span className="text-xs font-normal text-muted-foreground">
                      Insider trading data is delayed and should be used for informational purposes
                      only.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2.5 md:pt-7">
                {newsError && (
                  <Alert
                    variant="destructive"
                    className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-900/20 px-3 py-2.5 text-rose-200"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    <span className="text-sm">{newsError}</span>
                  </Alert>
                )}

                {!newsError && visibleNewsItems.length > 0 && (
                  <>
                    <div className={sectionClass}>
                      <div className="et-scrollbar max-h-[430px] space-y-2 overflow-y-auto pr-1 md:max-h-[485px]">
                        {visibleNewsItems.map((item) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block overflow-hidden rounded-xl border border-border bg-background/40 p-2.5 transition hover:border-foreground/20 hover:bg-background/70"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="max-w-[58%] truncate rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {item.source}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {new Date(item.datetime * 1000).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <h4 className="mt-1.5 line-clamp-2 break-words text-xs font-semibold text-foreground sm:text-sm">
                              {item.headline}
                            </h4>
                            <p className="mt-1 line-clamp-3 break-words text-[11px] text-muted-foreground sm:text-xs">
                              {item.summary || item.headline}
                            </p>
                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/85 group-hover:text-foreground">
                              Read article
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className={`${panelClass} flex items-center justify-between px-3 py-2`}>
                      <button
                        type="button"
                        onClick={() => setNewsPage((page) => Math.max(1, page - 1))}
                        disabled={newsPage <= 1}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-[11px] text-muted-foreground">
                        Page {newsPage} of {newsTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewsPage((page) => Math.min(newsTotalPages, page + 1))}
                        disabled={newsPage >= newsTotalPages}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}

                {!newsError && visibleNewsItems.length === 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2.5">
                    <Newspaper className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-normal text-muted-foreground">
                      No recent news found for {resolvedSymbol || 'this ticker'}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="text-xs font-normal text-muted-foreground">
            Search a ticker to load stock analysis, insider activity, and news in one view.
          </span>
        </div>
      )}
    </div>
  );
}
