'use client';

import {
  Search,
  AlertTriangle,
  AlertCircle,
  CircleCheck,
  CircleDot,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { AreaChart, Area, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import AnalystValuation from './AnalystValuation';
import NewsModal from './NewsModal';

interface StockData {
  symbol: string;
  name: string;
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

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;

export default function StockAnalysis() {
  const [loading, setLoading] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  // --- Hilfsfunktionen für zusätzliche Metriken ---
  type Metrics = {
    peRatio?: number;
    pbRatio?: number;
    pegRatio?: number;
    eps?: number;
    revenue?: number;
    beta?: number;
    roe?: number;
    debtToEquity?: number;
    profitMargin?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    epsGrowth?: number;
    roic?: number;
    currentRatio?: number;
    freeCashFlow?: number;
    forwardPE?: number;
    dividendYield?: number;
    companyName?: string;
  };
  async function fetchAdditionalMetrics(symbol: string): Promise<Metrics> {
    try {
      const response = await fetch(`/api/metrics?symbol=${symbol}`);
      if (!response.ok) {
        return {};
      }
      return await response.json();
    } catch (error) {
      return {};
    }
  }
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dcfValue, setDcfValue] = useState<number | null>(null);
  // chartData: für aktuellen Range, fullChartData: für YTD/52W
  const [chartData, setChartData] = useState<{ name: string; price: number }[]>([]);
  const [fullChartData, setFullChartData] = useState<{ name: string; price: number; date: Date }[]>(
    [],
  );
  const [chartRange, setChartRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W'>('1M');

  // Chart-Farbe je nach Entwicklung
  const chartIsPositive =
    chartData.length > 1 && chartData[chartData.length - 1].price >= chartData[0].price;
  const chartColor = chartIsPositive ? '#E5E5E5' : '#A3A3A3';

  function formatRatio(value?: number, digits = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  function formatPercent(value?: number, digits = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    })}%`;
  }

  function formatBillions(value?: number, digits = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    })}B`;
  }

  // Hilfsfunktion für Prozentveränderung
  function calcPercentChange(data: { price: number }[]): number | null {
    if (!data || data.length < 2) return null;
    const first = data[0].price;
    const last = data[data.length - 1].price;
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
    return ((last - first) / first) * 100;
  }

  // YTD und 52W Daten immer aus dem vollen Datensatz berechnen
  const ytdData = useMemo(() => {
    if (!selectedStock) return [];
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return fullChartData.filter((d) => d.date >= startOfYear && d.date <= now);
  }, [fullChartData, selectedStock]);

  const week52Data = useMemo(() => {
    if (!selectedStock) return [];
    if (fullChartData.length < 2) return [];
    // Letzte 365 Tage
    return fullChartData.slice(-Math.min(fullChartData.length, 365));
  }, [fullChartData, selectedStock]);

  const ytdChange = useMemo(() => calcPercentChange(ytdData), [ytdData]);
  const week52Change = useMemo(() => calcPercentChange(week52Data), [week52Data]);

  // Hilfsfunktion für Zeiträume
  function getRangeDays(range: '1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W') {
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
        const diff = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
      }
      case '52W':
        return 365;
      default:
        return 31;
    }
  }

  // Holt immer alle verfügbaren Daten für YTD/52W, filtert für Chart-Range
  async function fetchChartData(symbol: string, range: '1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W') {
    const endDate = Math.floor(Date.now() / 1000);
    // Hole immer 5 Jahre für vollen Verlauf (maximal für YTD/52W)
    const startDateFull = endDate - 5 * 365 * 24 * 60 * 60;
    const yahooResFull = await fetch(
      `/api/quote?symbol=${encodeURIComponent(symbol)}&chart=1&period1=${startDateFull}&period2=${endDate}&interval=1d&includePrePost=false`,
    );
    if (!yahooResFull.ok) {
      setChartData([]);
      setFullChartData([]);
      return;
    }
    const yahooJsonFull = await yahooResFull.json();
    const timestampsFull = yahooJsonFull?.chart?.result?.[0]?.timestamp;
    const closesFull = yahooJsonFull?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    let fullArr: { name: string; price: number; date: Date }[] = [];
    if (
      timestampsFull &&
      closesFull &&
      Array.isArray(timestampsFull) &&
      Array.isArray(closesFull)
    ) {
      fullArr = timestampsFull
        .map((ts: number, idx: number) => {
          const date = new Date(ts * 1000);
          let label: string;
          if (['1M', '3M', '6M'].includes(range)) {
            // z.B. 25. Jul
            label = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
          } else {
            // z.B. Jul 25
            label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          }
          return { name: label, price: closesFull[idx], date };
        })
        .filter((d) => typeof d.price === 'number' && !isNaN(d.price));
    }
    setFullChartData(fullArr);

    // Jetzt für den Chart-Range filtern
    let chartArr: { name: string; price: number }[] = [];
    if (fullArr.length > 0) {
      let filtered = fullArr;
      if (range === 'YTD') {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filtered = fullArr.filter((d) => d.date >= startOfYear && d.date <= now);
      } else if (range === '52W') {
        filtered = fullArr.slice(-Math.min(fullArr.length, 365));
      } else {
        const days = getRangeDays(range);
        filtered = fullArr.slice(-Math.min(fullArr.length, days));
      }
      chartArr = filtered.map((d) => ({ name: d.name, price: d.price, date: d.date }));
    }
    setChartData(chartArr);
  }

  const handleSearch = async () => {
    const symbol = searchSymbol.trim().toUpperCase();
    if (!symbol) return;
    if (!SYMBOL_PATTERN.test(symbol)) {
      setError('Please enter a valid ticker symbol.');
      setSelectedStock(null);
      setChartData([]);
      setDcfValue(null);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await fetchChartData(symbol, chartRange);
      const yahooRes = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      if (!yahooRes.ok) {
        setError(`Error fetching data: ${yahooRes.status}`);
        setSelectedStock(null);
        setDcfValue(null);
        setChartData([]);
        setLoading(false);
        return;
      }
      const yahooJson = await yahooRes.json();
      const meta = yahooJson?.meta || {};
      const price = yahooJson?.price;
      const previousClose = yahooJson?.previousClose;
      const hasValidPrice = typeof price === 'number' && Number.isFinite(price);
      const hasPreviousClose = typeof previousClose === 'number' && Number.isFinite(previousClose);
      const change = hasValidPrice && hasPreviousClose ? price - previousClose : 0;
      const changePercent =
        hasValidPrice && hasPreviousClose && previousClose !== 0
          ? (change / previousClose) * 100
          : 0;

      // Hole zusätzliche Metriken (Finviz + Yahoo Fallback)
      const metrics = await fetchAdditionalMetrics(symbol);

      // DCF von financialmodellingprep.com
      let dcf = null;
      try {
        const dcfRes = await fetch(`/api/dcf?symbol=${encodeURIComponent(symbol)}`);
        if (dcfRes.ok) {
          const dcfJson = await dcfRes.json();
          dcf = dcfJson?.dcf || dcfJson[0]?.dcf || null;
          setDcfValue(dcf);
        } else {
          setDcfValue(null);
        }
      } catch (dcfErr) {
        setDcfValue(null);
      }

      if (meta && hasValidPrice) {
        setSelectedStock({
          symbol: symbol,
          name: metrics?.companyName || meta?.longName || meta?.shortName || symbol,
          price: price,
          change: change,
          changePercent: changePercent,
          dcf: dcf,
          pe: metrics?.peRatio,
          peg: metrics?.pegRatio,
          pb: metrics?.pbRatio,
          roe: metrics?.roe,
          netMargin: metrics?.profitMargin,
          roic: metrics?.roic,
          revenueGrowth: metrics?.revenueGrowth,
          earningsGrowth: metrics?.earningsGrowth,
          epsGrowth: metrics?.epsGrowth,
          debtEquity: metrics?.debtToEquity,
          currentRatio: metrics?.currentRatio,
          freeCashFlow: metrics?.freeCashFlow,
        });
      } else {
        setError('Error fetching data.');
        setSelectedStock(null);
        setChartData([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unbekannter Fehler beim Fetch.');
      setSelectedStock(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-0 space-y-4">
      <div>
        <h2 className="mb-2 mt-0 ml-0 flex items-center gap-2 text-lg font-bold text-foreground">
          Stock Analysis
        </h2>
      </div>

      {/* Chart: Kursverlauf (dynamisch von Yahoo Finance) wird nach DCF angezeigt */}

      <div className="flex gap-2 mb-5">
        <Input
          placeholder="Enter ticker (e.g. AAPL)"
          value={searchSymbol}
          onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="min-w-0 flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="mb-4 flex flex-col items-center rounded-lg border border-red-400 bg-red-900/20 p-4 text-red-300"
        >
          <div className="flex flex-col items-center">
            <AlertTriangle className="mb-2 h-8 w-8 text-red-300" />
            <span className="text-center font-normal">{error}</span>
          </div>
        </Alert>
      )}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="text-right">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="col-span-1 space-y-2 rounded-lg border border-border bg-card p-3"
              >
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
            <div className="col-span-1 rounded-lg border border-border bg-card p-3 sm:col-span-2">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="col-span-1 mt-6 sm:col-span-2">
              <Skeleton className="h-40 w-full mb-2" />
              <div className="flex gap-4 mt-2 justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        </div>
      ) : selectedStock ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card/50 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Company</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                    {selectedStock.name}
                  </h3>
                  <button
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-secondary"
                    onClick={() => setNewsOpen(true)}
                    aria-label={`Show news for ${selectedStock.symbol}`}
                  >
                    News
                  </button>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p>
                  <p className="tabular-nums text-base font-semibold text-foreground sm:text-lg">
                    ${selectedStock.price?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today</p>
                  <p
                    className={`tabular-nums text-base font-semibold ${selectedStock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'} sm:text-lg`}
                  >
                    {selectedStock.changePercent >= 0 ? '+' : ''}
                    {selectedStock.changePercent?.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
            {/* News Modal */}
            {selectedStock && (
              <NewsModal
                open={newsOpen}
                onOpenChange={setNewsOpen}
                ticker={selectedStock.symbol}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 items-stretch">
            {/* VALUATION */}
            <div className="col-span-1 h-full rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">Valuation</h4>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">P/E Ratio</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatRatio(selectedStock.pe)}
                  {typeof selectedStock.pe === 'number' ? (
                    selectedStock.pe < 10 ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : selectedStock.pe <= 25 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.pe <= 40 ? (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">PEG Ratio</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatRatio(selectedStock.peg)}
                  {typeof selectedStock.peg === 'number' ? (
                    selectedStock.peg < 1 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.peg <= 2 ? (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">P/B Ratio</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatRatio(selectedStock.pb)}
                  {typeof selectedStock.pb === 'number' ? (
                    selectedStock.pb < 1 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.pb <= 3 ? (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
            </div>
            {/* PROFITABILITY */}
            <div className="col-span-1 h-full rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">Profitability</h4>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">ROE</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatPercent(selectedStock.roe)}
                  {typeof selectedStock.roe === 'number' ? (
                    selectedStock.roe > 15 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.roe >= 10 ? (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">Net Margin</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatPercent(selectedStock.netMargin)}
                  {typeof selectedStock.netMargin === 'number' ? (
                    selectedStock.netMargin > 10 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.netMargin >= 5 ? (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">ROIC</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatPercent(selectedStock.roic)}
                  {typeof selectedStock.roic === 'number' ? (
                    selectedStock.roic > 10 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.roic >= 5 ? (
                      <CircleDot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
            </div>
            {/* GROWTH */}
            <div className="col-span-1 h-full rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">Growth</h4>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">Revenue</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatPercent(selectedStock.revenueGrowth)}
                  {typeof selectedStock.revenueGrowth === 'number' ? (
                    selectedStock.revenueGrowth > 0 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.revenueGrowth === 0 ? (
                      <CircleDot className="w-4 h-4 text-gray-300" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">Earnings</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatPercent(selectedStock.earningsGrowth)}
                  {typeof selectedStock.earningsGrowth === 'number' ? (
                    selectedStock.earningsGrowth > 0 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.earningsGrowth === 0 ? (
                      <CircleDot className="w-4 h-4 text-gray-300" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">EPS</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatPercent(selectedStock.epsGrowth)}
                  {typeof selectedStock.epsGrowth === 'number' ? (
                    selectedStock.epsGrowth > 0 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.epsGrowth === 0 ? (
                      <CircleDot className="w-4 h-4 text-gray-300" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
            </div>
            {/* FINANCIAL HEALTH */}
            <div className="col-span-1 h-full rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                Financial Health
              </h4>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">Debt/Equity</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatRatio(selectedStock.debtEquity)}
                  {typeof selectedStock.debtEquity === 'number' ? (
                    selectedStock.debtEquity < 1 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.debtEquity <= 2 ? (
                      <CircleDot className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">Current Ratio</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatRatio(selectedStock.currentRatio)}
                  {typeof selectedStock.currentRatio === 'number' ? (
                    selectedStock.currentRatio >= 1.5 && selectedStock.currentRatio <= 3 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.currentRatio < 1 ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CircleDot className="w-4 h-4 text-yellow-400" />
                    )
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-xs sm:text-sm">FCF</span>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap tabular-nums text-right shrink-0">
                  {formatBillions(selectedStock.freeCashFlow)}
                  {typeof selectedStock.freeCashFlow === 'number' ? (
                    selectedStock.freeCashFlow > 0 ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : selectedStock.freeCashFlow === 0 ? (
                      <CircleDot className="w-4 h-4 text-gray-300" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : null}
                </span>
              </div>
            </div>
            {/* DCF Valuation */}
            <div className="col-span-1 h-full rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">DCF Valuation</p>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  {selectedStock.dcf !== undefined && selectedStock.dcf !== null
                    ? `$${Number(selectedStock.dcf).toFixed(2)}`
                    : 'Not available'}
                </span>
                {selectedStock.dcf !== undefined &&
                  selectedStock.dcf !== null &&
                  selectedStock.price !== undefined &&
                  selectedStock.price !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${Number(selectedStock.price) > Number(selectedStock.dcf) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}
                    >
                      {Number(selectedStock.price) > Number(selectedStock.dcf) ? (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <CircleCheck className="w-3 h-3 text-green-500" />
                      )}
                    </span>
                  )}
              </div>
            </div>
            {/* Analyst Valuation (Finviz scrape) */}
            <AnalystValuation symbol={selectedStock?.symbol} price={selectedStock?.price} />
            {/* Chart: Kursverlauf (dynamisch von Yahoo Finance) */}
            <div className="col-span-2 mt-4 rounded-xl border border-border/80 bg-card/60 p-3 sm:p-4">
              <ChartContainer config={{ price: { label: 'Price', color: '#e5e5e5' } }}>
                <ResponsiveContainer width="100%" height={300}>
                  {chartData.length > 0 ? (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      {/* YAxis added for auto-scaling, but hidden visually */}
                      <YAxis
                        hide={true}
                        domain={[
                          'dataMin - (dataMax-dataMin)*0.05',
                          'dataMax + (dataMax-dataMin)*0.05',
                        ]}
                        allowDataOverflow={true}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          const item = payload[0].payload;
                          function formatPrice(num: number) {
                            if (typeof num !== 'number') return '-';
                            return num
                              .toFixed(2)
                              .replace('.', ',')
                              .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          }
                          return (
                            <div className="flex min-w-[110px] max-w-[180px] flex-col gap-1 rounded-lg border border-border bg-black px-2 py-1 text-[11px] text-white shadow-lg">
                              <div className="font-semibold mb-0.5">
                                {item && item.date
                                  ? new Date(item.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : label}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-[12px]">
                                  ${formatPrice(item?.price)}
                                </span>
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
                        fill="url(#colorPrice)"
                        name="Price"
                      />
                    </AreaChart>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No data available.
                    </div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-2">
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {(['1M', '3M', '6M', '1Y'] as const).map((r) => (
                      <button
                        key={r}
                        className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${chartRange === r ? 'border-foreground bg-foreground text-background' : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}
                        onClick={async () => {
                          setChartRange(r);
                          if (selectedStock) await fetchChartData(selectedStock.symbol, r);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <div>
                      <span>YTD:</span>
                      <span
                        className={
                          ytdChange !== null
                            ? ytdChange >= 0
                              ? 'text-green-600 dark:text-green-400 ml-1'
                              : 'text-red-600 dark:text-red-400 ml-1'
                            : 'ml-1'
                        }
                      >
                        {ytdChange !== null ? `${ytdChange > 0 ? '+' : ''}${ytdChange.toFixed(2)}%` : '–'}
                      </span>
                    </div>
                    <div>
                      <span>52W:</span>
                      <span
                        className={
                          week52Change !== null
                            ? week52Change >= 0
                              ? 'text-green-600 dark:text-green-400 ml-1'
                              : 'text-red-600 dark:text-red-400 ml-1'
                            : 'ml-1'
                        }
                      >
                        {week52Change !== null
                          ? `${week52Change > 0 ? '+' : ''}${week52Change.toFixed(2)}%`
                          : '–'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 px-3 py-2 rounded-lg bg-secondary/60 flex items-center gap-2 border border-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-muted-foreground"
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
          <span className="text-xs text-muted-foreground font-normal">
            Stock analysis data is for informational purposes only and does not constitute
            investment advice.
          </span>
        </div>
      )}
    </div>
  );
}
