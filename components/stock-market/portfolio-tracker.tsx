'use client';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, type JSX } from 'react';
import {
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart as BarChartComponent,
  Bar,
  XAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';

interface StockDataPoint {
  date: string;
  close: number;
}

interface Purchase {
  symbol: string;
  shares: number;
  date: string; // yyyy-mm-dd
}

interface DividendEvent {
  date: string; // yyyy-mm-dd
  amount: number; // dividend per share
}

function dateToUnix(date: string) {
  return Math.floor(new Date(date).getTime() / 1000);
}

async function fetchDividendData(
  symbol: string,
  startDate: string,
): Promise<DividendEvent[] | { error: string }> {
  try {
    // Add a small buffer (30 days earlier) to catch dividends announced shortly before purchase
    const start = new Date(startDate);
    start.setDate(start.getDate() - 30);
    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = Math.floor(Date.now() / 1000);
    const proxyUrl = 'https://corsproxy.io/?';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startUnix}&period2=${endUnix}&interval=1d&events=div`;
    const url = proxyUrl + encodeURIComponent(yahooUrl);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) return [];
    const result = data.chart.result[0];
    const dividends = result.events?.dividends
      ? Object.values(result.events.dividends).sort((a: any, b: any) => a.date - b.date)
      : [];
    return dividends.map((div: any) => ({
      date: new Date(div.date * 1000).toISOString().split('T')[0],
      amount: div.amount,
    }));
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function fetchStockData(
  symbol: string,
): Promise<StockDataPoint[] | { error: string }> {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = 0; // keine Begrenzung, seit 1970
    const proxyUrl = 'https://corsproxy.io/?';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;
    const url = proxyUrl + encodeURIComponent(yahooUrl);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0])
      throw new Error('Invalid data format received');
    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;
    return timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        close: closePrices[index],
      }))
      .filter((item: StockDataPoint) => item.close !== null);
  } catch (error: any) {
    return { error: error.message };
  }
}

export default function PortfolioTracker() {
  // ...existing code...
  // Calculate total return for the whole portfolio

  // Berechne aktuellen aggregierten Portfoliowert
  function getCurrentPortfolioValue(): number {
    let total = 0;
    purchases.forEach((p) => {
      const currentPrice = getCurrentPrice(p.symbol);
      if (currentPrice !== null) {
        total += p.shares * currentPrice;
      }
    });
    return total;
  }
  function getTotalReturn(): { pct: number | null; formatted: string | JSX.Element } {
    let totalInvested = 0;
    let totalCurrent = 0;
    purchases.forEach((p) => {
      const buyPrice = getBuyPrice(p.symbol, p.date);
      const currentPrice = getCurrentPrice(p.symbol);
      if (buyPrice !== null && currentPrice !== null) {
        totalInvested += buyPrice * p.shares;
        totalCurrent += currentPrice * p.shares;
      }
    });
    if (totalInvested === 0)
      return { pct: null, formatted: <span className="text-gray-400">-</span> };
    const pct = ((totalCurrent - totalInvested) / totalInvested) * 100;
    const pctStr = pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
    return {
      pct,
      formatted: (
        <span className={pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : undefined}>
          {pctStr}
        </span>
      ),
    };
  }
  const [stockData, setStockData] = useState<{ [key: string]: StockDataPoint[] }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stockData');
      try {
        const parsed = saved ? JSON.parse(saved) : {};
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [trackedStocks, setTrackedStocks] = useState<string[]>(() => {
    // Load trackedStocks from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trackedStocks');
      try {
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    // Load purchases from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchases');
      try {
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) &&
          parsed.every(
            (p: any) =>
              typeof p.symbol === 'string' &&
              typeof p.shares === 'number' &&
              typeof p.date === 'string',
          )
          ? parsed
          : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [search, setSearch] = useState('');
  const [shares, setShares] = useState('');
  const [buyDate, setBuyDate] = useState('');
  // Year selection for dividends calendar (external control)
  const [dividendYear, setDividendYear] = useState<number>(() => new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dividendData, setDividendData] = useState<{ [symbol: string]: DividendEvent[] }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dividendData');
      try {
        const parsed = saved ? JSON.parse(saved) : {};
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [dividendLoading, setDividendLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Batch localStorage writes for trackedStocks, purchases, stockData, dividendData
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeout = setTimeout(() => {
      localStorage.setItem('trackedStocks', JSON.stringify(trackedStocks));
      localStorage.setItem('purchases', JSON.stringify(purchases));
      localStorage.setItem('stockData', JSON.stringify(stockData));
      localStorage.setItem('dividendData', JSON.stringify(dividendData));
    }, 300); // batch writes every 300ms
    return () => clearTimeout(timeout);
  }, [trackedStocks, purchases, stockData, dividendData]);

  const fetchAndCacheStock = useCallback(
    async (symbol: string, force = false) => {
      if (!force && stockData[symbol]) return;
      setLoading(true);
      const data = await fetchStockData(symbol);
      setLoading(false);
      if ('error' in data) {
        setError(`Could not fetch data for ${symbol}: ${data.error}`);
        return;
      }
      setStockData((prev) => ({ ...prev, [symbol]: data }));
    },
    [stockData],
  );

  // Fetch and cache dividends for a symbol based on earliest purchase date
  const fetchAndCacheDividends = useCallback(
    async (symbol: string, force = false) => {
      const earliestPurchase = purchases
        .filter((p) => p.symbol === symbol)
        .map((p) => p.date)
        .sort()[0];
      if (!earliestPurchase) return; // no purchase yet
      if (!force && dividendData[symbol]) return;
      setDividendLoading(true);
      const data = await fetchDividendData(symbol, earliestPurchase);
      setDividendLoading(false);
      if (Array.isArray(data)) {
        setDividendData((prev) => ({ ...prev, [symbol]: data }));
      }
    },
    [purchases, dividendData],
  );

  // Fetch data for tracked stocks on mount or when trackedStocks changes
  useEffect(() => {
    trackedStocks.forEach((symbol: string) => {
      if (!stockData[symbol]) {
        fetchAndCacheStock(symbol);
      }
      // ensure dividends loaded for symbols with purchases
      const hasPurchase = purchases.some((p) => p.symbol === symbol);
      if (hasPurchase && !dividendData[symbol]) {
        fetchAndCacheDividends(symbol);
      }
    });
  }, [
    trackedStocks,
    stockData,
    purchases,
    dividendData,
    fetchAndCacheStock,
    fetchAndCacheDividends,
  ]);

  // Aktualisiere alle 15 Minuten die aktuellen Preise und den Chart
  useEffect(() => {
    if (trackedStocks.length === 0) return;
    const interval = setInterval(() => {
      trackedStocks.forEach((symbol) => {
        fetchAndCacheStock(symbol);
      });
    }, 900000); // 15 Minuten
    return () => clearInterval(interval);
  }, [trackedStocks, fetchAndCacheStock]);

  // Add a purchase (buy)
  const handleAddPurchase = async () => {
    const symbol = search.trim().toUpperCase();
    const nShares = Number.parseFloat(shares);
    if (!symbol || isNaN(nShares) || nShares <= 0 || !buyDate) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setLoading(true);
    setError(null);
    await fetchAndCacheStock(symbol);
    setTrackedStocks((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
    setPurchases((prev) => [...prev, { symbol, shares: nShares, date: buyDate }]);
    // fetch dividends after adding purchase
    setTimeout(() => fetchAndCacheDividends(symbol, true), 0);
    setSearch('');
    setShares('');
    setBuyDate('');
    setLoading(false);
  };

  // Memoize portfolio history calculation
  const portfolioHistory = useMemo(() => {
    const allDates: string[] = [];
    Object.values(stockData).forEach((arr) => {
      arr.forEach((d) => {
        if (!allDates.includes(d.date)) allDates.push(d.date);
      });
    });
    allDates.sort();
    let earliestBuyDate = null;
    if (purchases.length > 0) {
      earliestBuyDate = purchases.reduce(
        (min, p) => (min === null || p.date < min ? p.date : min),
        null as string | null,
      );
    }
    let filteredDates = allDates;
    if (earliestBuyDate) {
      filteredDates = allDates.filter((date) => date >= earliestBuyDate!);
    }
    let lastValue = 0;
    return filteredDates.map((date) => {
      let value = 0;
      purchases.forEach((p) => {
        if (stockData[p.symbol]) {
          const priceArr = stockData[p.symbol].filter((d) => d.date <= date && d.close !== null);
          if (priceArr.length > 0 && date >= p.date) {
            const lastPrice = priceArr[priceArr.length - 1].close;
            value += p.shares * lastPrice;
          }
        }
      });
      if (value === 0 && lastValue > 0) {
        value = lastValue;
      }
      lastValue = value;
      return { date, value };
    });
  }, [stockData, purchases]);

  // Memoized helpers to avoid recalculating on every render
  const getCurrentPrice = useCallback(
    (symbol: string): number | null => {
      const data = stockData[symbol];
      if (!data || data.length === 0) return null;
      return data[data.length - 1].close;
    },
    [stockData],
  );

  const getBuyPrice = useCallback(
    (symbol: string, buyDate: string): number | null => {
      const data = stockData[symbol];
      if (!data || data.length === 0) return null;
      const found = data.find((d) => d.date >= buyDate);
      return found ? found.close : null;
    },
    [stockData],
  );

  // Reload-Handler für alle getrackten Aktien
  const handleReload = async () => {
    setReloading(true);
    setError(null);
    await Promise.all(trackedStocks.map((symbol) => fetchAndCacheStock(symbol, true)));
    // Reload dividends as well for all symbols with purchases
    await Promise.all(
      trackedStocks
        .filter((s) => purchases.some((p) => p.symbol === s))
        .map((symbol) => fetchAndCacheDividends(symbol, true)),
    );
    setReloading(false);
  };

  // Memoize total dividend income calculation
  const totalDividendIncome = useMemo(() => {
    let total = 0;
    // Group purchases by symbol for efficiency
    const purchasesBySymbol: { [symbol: string]: Purchase[] } = {};
    purchases.forEach((p) => {
      (purchasesBySymbol[p.symbol] = purchasesBySymbol[p.symbol] || []).push(p);
    });
    Object.keys(purchasesBySymbol).forEach((symbol) => {
      const events = dividendData[symbol];
      if (!events || events.length === 0) return;
      // For each event, sum shares of purchases with date <= event.date
      events.forEach((ev) => {
        const totalSharesAtEvent = purchasesBySymbol[symbol]
          .filter((p) => p.date <= ev.date)
          .reduce((sum, p) => sum + p.shares, 0);
        if (totalSharesAtEvent > 0) {
          total += totalSharesAtEvent * ev.amount;
        }
      });
    });
    return total;
  }, [dividendData, purchases]);
  // (Yield calculations moved below dividendHistory definition)
  // Build aggregated dividend history for visualization
  const dividendHistory = useMemo(() => {
    const events: { date: string; amount: number }[] = [];
    // Group purchases once per symbol
    const purchasesBySymbol: { [symbol: string]: Purchase[] } = {};
    purchases.forEach((p) => {
      (purchasesBySymbol[p.symbol] = purchasesBySymbol[p.symbol] || []).push(p);
    });
    Object.keys(dividendData).forEach((symbol) => {
      const symbolEvents = dividendData[symbol];
      if (!symbolEvents) return;
      const symbolPurchases = purchasesBySymbol[symbol] || [];
      if (symbolPurchases.length === 0) return;
      symbolEvents.forEach((ev) => {
        const sharesHeld = symbolPurchases
          .filter((p) => p.date <= ev.date)
          .reduce((sum, p) => sum + p.shares, 0);
        if (sharesHeld > 0) {
          events.push({ date: ev.date, amount: sharesHeld * ev.amount });
        }
      });
    });
    if (events.length === 0) return [];
    // Aggregate by date across symbols
    const aggregated: Record<string, number> = {};
    events.forEach((e) => {
      aggregated[e.date] = (aggregated[e.date] || 0) + e.amount;
    });
    return Object.entries(aggregated)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [dividendData, purchases]);
  // Aggregate dividends per calendar month for visualization (YYYY-MM)
  const monthlyDividendHistory = useMemo(() => {
    if (!dividendHistory.length) return [] as { date: string; month: string; amount: number }[];
    const grouped: Record<string, number> = {};
    dividendHistory.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      grouped[key] = (grouped[key] || 0) + e.amount;
    });
    return Object.entries(grouped)
      .map(([month, amount]) => ({ date: `${month}-01`, month, amount }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [dividendHistory]);
  // Trailing 12-month (TTM) dividend income and yearly yield (based on current portfolio value)
  const ttmDividendIncome = useMemo(() => {
    if (!dividendHistory.length) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    return dividendHistory
      .filter((e) => new Date(e.date) >= cutoff)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [dividendHistory]);
  const currentPortfolioValue = getCurrentPortfolioValue();
  const yearlyDividendYieldPct =
    currentPortfolioValue > 0 ? (ttmDividendIncome / currentPortfolioValue) * 100 : null;
  // UI layout controls
  const [activeChart, setActiveChart] = useState<'value' | 'dividends'>('value');
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const totalReturn = getTotalReturn();

  const [activeTimeframe, setActiveTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const annualYield =
    currentPortfolioValue > 0 ? (ttmDividendIncome / currentPortfolioValue) * 100 : 0;

  const handleDeletePurchase = (indexToDelete: number) => {
    setPurchases((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  // Calculate total return value and percentage for selected timeframe
  let totalReturnValue: number | null = null;
  let totalReturnPct: number | null = null;
  {
    let filtered = portfolioHistory;
    if (portfolioHistory.length > 0) {
      if (activeTimeframe !== 'ALL') {
        const now = Date.now();
        const daysMap: Record<string, number> = {
          '1M': 30,
          '3M': 90,
          '6M': 180,
          '1Y': 365,
        };
        const days = daysMap[activeTimeframe] || 100000;
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        filtered = portfolioHistory.filter((p) => new Date(p.date).getTime() >= cutoff);
      }
      if (filtered.length > 0) {
        const first = filtered[0].value;
        const last = filtered[filtered.length - 1].value;
        totalReturnValue = last - first;
        totalReturnPct = first > 0 ? ((last - first) / first) * 100 : null;
      }
    }
  }

  // Calculate dividend income per month from first to last payment
  let monthsSpan = 1;
  let dividendIncomeSpan = 0;
  let dividendIncomePerMonthSpan = 0;
  if (dividendHistory.length > 1) {
    const firstDate = new Date(dividendHistory[0].date);
    const lastDate = new Date(dividendHistory[dividendHistory.length - 1].date);
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    monthsSpan = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 30)));
    dividendIncomeSpan = dividendHistory.reduce((sum, d) => sum + d.amount, 0);
    dividendIncomePerMonthSpan = monthsSpan > 0 ? dividendIncomeSpan / monthsSpan : 0;
  }

  return (
    <div className="min-h-[50vh] text-xs sm:text-sm md:text-base">
      <header>
        <div className="container mx-auto px-4 sm:px-6 pt-2 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              Portfolio Tracker
            </h1>
            <div className="flex items-center gap-3">
              {/* Theme toggle removed */}
              {/* Reload button removed as requested */}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="grid gap-4 mb-8 grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1">
                {getCurrentPortfolioValue().toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                })}
              </div>
              {totalReturn.pct !== null && (
                <div
                  className={`text-xs sm:text-sm ${totalReturn.pct > 0 ? 'text-green-600' : totalReturn.pct < 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                >
                  {totalReturn.formatted}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Return
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1">
                {totalReturnValue !== null
                  ? totalReturnValue.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                      minimumFractionDigits: 0,
                    })
                  : '-'}
              </div>
              {totalReturnPct !== null && (
                <div
                  className={`text-xs sm:text-sm ${totalReturnPct > 0 ? 'text-green-600' : totalReturnPct < 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                >
                  {totalReturnPct > 0 ? '+' : ''}
                  {totalReturnPct.toFixed(2)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Dividend Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start gap-0">
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1">
                  {dividendLoading
                    ? '...'
                    : dividendIncomeSpan.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 2,
                      })}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground block text-left">
                  {dividendIncomePerMonthSpan.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 2,
                  })}{' '}
                  per month
                </span>
                {/* payments count below value */}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {dividendHistory.length} payments
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Annual Yield
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1">
                {annualYield.toFixed(2)}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Estimated</div>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          <Card className="lg:col-span-3 border border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                <div className="flex gap-1 rounded-lg p-1 text-xs sm:text-sm">
                  <button
                    onClick={() => setActiveChart('value')}
                    className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors 
                      ${
                        activeChart === 'value'
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-transparent text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => setActiveChart('dividends')}
                    className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors 
                      ${
                        activeChart === 'dividends'
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-transparent text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    Dividends
                  </button>
                </div>
              </div>
              {activeChart === 'dividends' ? (
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="relative">
                    <select
                      id="dividend-year-select"
                      value={dividendYear}
                      onChange={(e) => setDividendYear(Number(e.target.value))}
                      className="appearance-none px-2 py-1 pr-6 rounded-md border border-border bg-background text-foreground shadow-sm text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                      {Array.from(
                        new Set(
                          Object.values(dividendData)
                            .flat()
                            .map((d) => new Date(d.date).getFullYear()),
                        ),
                      )
                        .sort((a, b) => b - a)
                        .map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 8L10 12L14 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1 text-xs sm:text-sm">
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setActiveTimeframe(period)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        activeTimeframe === period
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 md:h-80 w-full">
                <ChartContainer
                  config={
                    activeChart === 'dividends'
                      ? { amount: { label: 'Dividends', color: 'hsl(var(--chart-2))' } }
                      : { value: { label: 'Value', color: '#3b82f6' } }
                  }
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      if (activeChart === 'dividends') {
                        let filteredDividendHistory = monthlyDividendHistory;
                        if (activeChart === 'dividends') {
                          filteredDividendHistory = monthlyDividendHistory.filter(
                            (d) => new Date(d.date).getFullYear() === dividendYear,
                          );
                        } else if (activeTimeframe !== 'ALL') {
                          const now = Date.now();
                          const daysMap: Record<string, number> = {
                            '1M': 30,
                            '3M': 90,
                            '6M': 180,
                            '1Y': 365,
                          };
                          const days = daysMap[activeTimeframe] || 100000;
                          const cutoff = now - days * 24 * 60 * 60 * 1000;
                          filteredDividendHistory = monthlyDividendHistory.filter(
                            (d) => new Date(d.date).getTime() >= cutoff,
                          );
                        }

                        return (
                          <BarChartComponent
                            data={filteredDividendHistory}
                            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                          >
                            <XAxis
                              dataKey="date"
                              interval={0}
                              height={60}
                              tickFormatter={(date: string | number) => {
                                // Format date as short string (e.g. 'Aug')
                                const d = new Date(date);
                                return d.toLocaleDateString('en-US', { month: 'short' });
                              }}
                              tick={(props: any) => {
                                const { x, y, payload } = props;
                                const d = new Date(payload.value);
                                const label = d.toLocaleDateString('en-US', { month: 'short' });
                                return (
                                  <g transform={`translate(${x},${y})`}>
                                    <text
                                      x={0}
                                      y={0}
                                      dy={16}
                                      textAnchor="end"
                                      fill="#444"
                                      fontSize={14}
                                      transform="rotate(-45)"
                                    >
                                      {label}
                                    </text>
                                  </g>
                                );
                              }}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload || !payload.length) return null;
                                const item = payload[0].payload;
                                return (
                                  <div className="min-w-[140px] max-w-[220px] rounded-lg bg-black text-white dark:bg-white dark:text-black border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs shadow-lg flex flex-col gap-1">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-mono text-[13px] text-white dark:text-black">
                                        $
                                        {item.amount.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                      {item.symbol && (
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Symbol:{' '}
                                          <span className="font-semibold">{item.symbol}</span>
                                        </span>
                                      )}
                                      {item.note && (
                                        <span className="text-gray-400 italic">{item.note}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="amount" fill="#f97316" radius={[2, 2, 0, 0]} />
                          </BarChartComponent>
                        );
                      }

                      let filteredPortfolioHistory = portfolioHistory;
                      if (activeTimeframe !== 'ALL') {
                        const now = Date.now();
                        const daysMap: Record<string, number> = {
                          '1M': 30,
                          '3M': 90,
                          '6M': 180,
                          '1Y': 365,
                        };
                        const days = daysMap[activeTimeframe] || 100000;
                        const cutoff = now - days * 24 * 60 * 60 * 1000;
                        filteredPortfolioHistory = portfolioHistory.filter(
                          (p) => new Date(p.date).getTime() >= cutoff,
                        );
                      }

                      // Set chart color using CSS variable for theme responsiveness
                      let chartColor = 'var(--chart-positive-color, #000)';
                      if (filteredPortfolioHistory.length > 1) {
                        const first = filteredPortfolioHistory[0].value;
                        const last =
                          filteredPortfolioHistory[filteredPortfolioHistory.length - 1].value;
                        if (last > first) {
                          chartColor = 'var(--chart-positive-color, #000)';
                        } else if (last < first) {
                          chartColor = '#ef4444'; // Red for negative performance
                        } else {
                          chartColor = '#6b7280'; // Gray for neutral
                        }
                      }

                      return (
                        <AreaChart
                          data={filteredPortfolioHistory}
                          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                        >
                          {/* Hidden YAxis for domain padding to prevent flat chart */}
                          <YAxis
                            type="number"
                            domain={[
                              (dataMin: number) => dataMin * 0.99,
                              (dataMax: number) => dataMax * 1.01,
                            ]}
                            hide
                          />
                          <defs>
                            <linearGradient id="colorPortfolioValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length) return null;
                              const item = payload[0].payload;
                              return (
                                <div className="min-w-[140px] max-w-[220px] rounded-lg bg-black text-white dark:bg-white dark:text-black border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs shadow-lg flex flex-col gap-1">
                                  <div className="font-semibold text-white dark:text-black mb-0.5">
                                    {payload &&
                                    payload[0] &&
                                    payload[0].payload &&
                                    payload[0].payload.date
                                      ? new Date(payload[0].payload.date).toLocaleDateString(
                                          'en-US',
                                          { year: 'numeric', month: 'short', day: 'numeric' },
                                        )
                                      : label}
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-mono text-[13px] text-white dark:text-black">
                                      $
                                      {item.value.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                    {item.symbol && (
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Symbol: <span className="font-semibold">{item.symbol}</span>
                                      </span>
                                    )}
                                    {item.note && (
                                      <span className="text-gray-400 italic">{item.note}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={chartColor}
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorPortfolioValue)"
                          />
                        </AreaChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Holdings</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleReload}
                    disabled={loading || trackedStocks.length === 0}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm">
              {purchases.length > 0 ? (
                <div className="space-y-2 max-h-40 sm:max-h-60 md:max-h-80 overflow-y-auto">
                  {purchases.map((purchase, index) => {
                    const currentPrice = getCurrentPrice(purchase.symbol);
                    const buyPrice = getBuyPrice(purchase.symbol, purchase.date);
                    const currentValue = currentPrice ? currentPrice * purchase.shares : 0;
                    const investedValue = buyPrice ? buyPrice * purchase.shares : 0;
                    const returnPct =
                      investedValue > 0
                        ? ((currentValue - investedValue) / investedValue) * 100
                        : 0;

                    return (
                      <div
                        key={index}
                        className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-foreground text-xs sm:text-sm">
                            {purchase.symbol}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-xs text-muted-foreground">
                              {purchase.shares} shares
                            </div>
                            <button
                              onClick={() => handleDeletePurchase(index)}
                              className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-red-600"
                              aria-label="Delete holding"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="text-muted-foreground">
                            {currentValue.toLocaleString(undefined, {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            })}
                          </div>
                          <div className={returnPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {returnPct >= 0 ? '+' : ''}
                            {returnPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-24 sm:h-40 md:h-60 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="mb-1">No holdings</div>
                    <div className="text-xs">Click + to add</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/30 dark:bg-black/50">
          <Card className="w-full max-w-md border border-border shadow-lg mx-2 sm:mx-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add Purchase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-sm font-medium mb-2 block">Symbol</label>
                <input
                  type="text"
                  placeholder="e.g., AAPL"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  inputMode="text"
                  autoCapitalize="characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Shares</label>
                <input
                  type="number"
                  placeholder="Number of shares"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <input
                  type="date"
                  value={buyDate}
                  onChange={(e) => setBuyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 text-xs sm:text-sm">
                <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddPurchase} disabled={loading} className="flex-1">
                  {loading ? 'Adding...' : 'Add'}
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
