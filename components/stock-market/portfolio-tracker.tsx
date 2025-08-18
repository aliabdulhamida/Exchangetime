'use client';
import { RefreshCw, Trash } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo, JSX } from 'react';
// Revert: remove continuous-calendar import
import { XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';

// Einzelne Card-Komponente mit Swipe-to-Delete
function SwipeToDeleteCard({
  symbol,
  date,
  shares,
  price,
  returnPct,
  onDelete,
  animateSwipe = false,
}: {
  symbol: string;
  date: string;
  shares: number;
  price: number | null;
  returnPct: string | JSX.Element;
  onDelete: () => void;
  animateSwipe?: boolean;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const threshold = 80;

  // Animation für neuen Eintrag: Swipe kurz nach links und zurück
  useEffect(() => {
    if (animateSwipe) {
      setTimeout(() => setDragX(-60), 250); // nach Mount swipen
      setTimeout(() => setDragX(0), 1100); // zurück
    }
    // animateSwipe intentionally excluded from deps to only run on mount
  }, [animateSwipe]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    setStartX(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || startX === null) return;
    const delta = e.clientX - startX;
    if (delta < 0) setDragX(delta);
  };
  const [showDelete, setShowDelete] = useState(false);
  const handlePointerUp = () => {
    setDragging(false);
    if (Math.abs(dragX) > threshold) {
      setShowDelete(true);
      setDragX(-80); // fix position for delete button
    } else {
      setShowDelete(false);
      setDragX(0);
    }
    setStartX(null);
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };
  const handlePointerLeave = () => {
    setDragging(false);
    if (!showDelete) {
      setDragX(0);
    }
    setStartX(null);
  };

  return (
    <div className="relative w-full" style={{ minWidth: 0 }}>
      {/* Delete background (klickbar) */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-2 bg-red-50 dark:bg-red-900 rounded-lg z-0 transition-colors cursor-pointer"
        style={{
          opacity: dragX < -10 || showDelete ? 1 : 0,
          pointerEvents: showDelete ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
        onClick={showDelete ? handleDeleteClick : undefined}
        aria-label={showDelete ? 'Delete purchase' : undefined}
        tabIndex={showDelete ? 0 : -1}
      >
        <Trash className="w-6 h-6 text-red-600 mr-4" />
      </div>
      {/* Card */}
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b] p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 relative text-xs sm:text-sm shadow-sm min-h-[56px] hover:shadow-md transition-shadow z-10 touch-none select-none w-full"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
      >
        <div className="flex flex-row w-full min-w-0 justify-between items-stretch">
          {/* Linke Spalte: Name, Shares, Datum */}
          <div className="flex flex-col min-w-0 justify-center">
            <span className="font-mono font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate max-w-[80px] sm:max-w-none">
              {symbol}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
                Shares:
              </span>
              <span className="font-semibold text-xs sm:text-sm">{shares}</span>
            </div>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap mt-1">
              {date}
            </span>
          </div>
          {/* Rechte Spalte: Current Price, Return */}
          <div className="flex flex-col items-end min-w-[90px] justify-center">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] text-gray-700 dark:text-gray-300">
                Current Price:
              </span>
              <span className="font-mono text-xs sm:text-sm">
                {price !== null ? (
                  `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] text-gray-700 dark:text-gray-300">
                Return:
              </span>
              {returnPct}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// moved imports to top

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
    const nShares = parseFloat(shares);
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
    let allDates: string[] = [];
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

  // Helper: get current price for symbol
  function getCurrentPrice(symbol: string): number | null {
    const data = stockData[symbol];
    if (!data || data.length === 0) return null;
    // Last known close price
    return data[data.length - 1].close;
  }

  // Helper: get buy price for symbol at buy date
  function getBuyPrice(symbol: string, buyDate: string): number | null {
    const data = stockData[symbol];
    if (!data || data.length === 0) return null;
    // Find the first price on or after the buy date
    const found = data.find((d) => d.date >= buyDate);
    return found ? found.close : null;
  }

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

  // Calculate total dividend income based on purchases and dividend events
  function getTotalDividendIncome(): number {
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
  }

  const totalDividendIncome = getTotalDividendIncome();
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
    const aggregated: { [date: string]: number } = {};
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
  return (
    <div className="rounded-xl flex flex-col w-full max-w-full">
      <header className="flex flex-col px-4 pt-2 pb-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight leading-tight">
          Portfolio Tracker
        </h3>
      </header>

      {/* Body Content Wrapper */}
      <div className="flex flex-col gap-5 px-2 sm:px-4 pb-5 md:pb-6">
        {/* KPIs */}
        <section className="grid w-full gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
          <KpiCard
            label="Value"
            value={getCurrentPortfolioValue().toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 2,
            })}
            trend={totalReturn}
            rawPct={totalReturn.pct}
          />
          <KpiCard
            label="Total Return"
            value={
              <div className="flex flex-row items-center gap-2">
                <span className="text-lg text-green-500 font-normal">
                  {(
                    getCurrentPortfolioValue() -
                    (() => {
                      let totalInvested = 0;
                      purchases.forEach((p) => {
                        const buyPrice = getBuyPrice(p.symbol, p.date);
                        if (buyPrice !== null) {
                          totalInvested += buyPrice * p.shares;
                        }
                      });
                      return totalInvested;
                    })()
                  ).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-sm text-green-500 font-normal">{totalReturn.formatted}</span>
              </div>
            }
            rawPct={totalReturn.pct}
          />
          <KpiCard
            label="Total Dividends"
            value={totalDividendIncome.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 2,
            })}
            loading={dividendLoading}
            muted={dividendHistory.length === 0}
          />
          <KpiCard
            label="Yield"
            value={yearlyDividendYieldPct === null ? '-' : `${yearlyDividendYieldPct.toFixed(2)}%`}
            loading={dividendLoading}
            muted={dividendHistory.length === 0}
          />
        </section>
        <div className="border-t border-gray-200 dark:border-gray-800" />

        <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
          {/* Charts Card */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 w-full">
            {/* Removed extra percentage display above chart area */}
            <div className="rounded-lg bg-transparent p-2 sm:p-3 md:p-4 flex flex-col w-full">
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3 flex-wrap w-full">
                  {/* Mobile-first layout: value/percentage centered, buttons below */}
                  <div className="w-full flex flex-col items-center justify-center gap-2 mb-2 sm:hidden">
                    <nav className="flex gap-1 mb-2">
                      <ChartTab
                        active={activeChart === 'value'}
                        onClick={() => setActiveChart('value')}
                      >
                        Value
                      </ChartTab>
                      {dividendHistory.length > 0 && (
                        <ChartTab
                          active={activeChart === 'dividends'}
                          onClick={() => setActiveChart('dividends')}
                        >
                          Dividends
                        </ChartTab>
                      )}
                    </nav>
                    <div className="flex flex-col items-center gap-1">
                      {activeChart === 'value' ? (
                        (() => {
                          let filteredPortfolioHistory = portfolioHistory;
                          if (timeframe !== 'ALL') {
                            const now = Date.now();
                            const daysMap: Record<string, number> = {
                              '1M': 30,
                              '3M': 90,
                              '6M': 180,
                              '1Y': 365,
                            };
                            const days = daysMap[timeframe] || 100000;
                            const cutoff = now - days * 24 * 60 * 60 * 1000;
                            filteredPortfolioHistory = portfolioHistory.filter(
                              (p) => new Date(p.date).getTime() >= cutoff,
                            );
                          }
                          if (!filteredPortfolioHistory || filteredPortfolioHistory.length < 2)
                            return null;
                          let displayValue;
                          const startValue = filteredPortfolioHistory[0]?.value ?? 0;
                          const endValue =
                            filteredPortfolioHistory[filteredPortfolioHistory.length - 1]?.value ??
                            0;
                          if (timeframe === 'ALL') {
                            const totalInvested = purchases.reduce((sum, p) => {
                              const buyPrice = getBuyPrice(p.symbol, p.date);
                              return buyPrice !== null ? sum + buyPrice * p.shares : sum;
                            }, 0);
                            displayValue = getCurrentPortfolioValue() - totalInvested;
                          } else {
                            displayValue = endValue - startValue;
                          }
                          const pct =
                            startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0;
                          return (
                            <>
                              <span className="text-lg font-semibold text-gray-100">
                                {displayValue.toLocaleString(undefined, {
                                  style: 'currency',
                                  currency: 'USD',
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span
                                className={`text-base font-normal ${pct > 0 ? 'text-green-500' : pct < 0 ? 'text-red-500' : 'text-gray-400'}`}
                              >
                                {pct > 0 ? '+' : ''}
                                {pct.toFixed(2)}%
                              </span>
                            </>
                          );
                        })()
                      ) : (
                        <span className="text-lg font-semibold text-gray-100">Dividends</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full mt-2">
                      {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
                        <TimeframeTab
                          key={tf}
                          active={timeframe === tf}
                          onClick={() => setTimeframe(tf)}
                        >
                          {tf}
                        </TimeframeTab>
                      ))}
                    </div>
                  </div>
                  {/* Desktop layout: original flex row */}
                  <div className="hidden sm:flex flex-row w-full items-center justify-between gap-3">
                    <nav className="flex gap-1">
                      <ChartTab
                        active={activeChart === 'value'}
                        onClick={() => setActiveChart('value')}
                      >
                        Value
                      </ChartTab>
                      {dividendHistory.length > 0 && (
                        <ChartTab
                          active={activeChart === 'dividends'}
                          onClick={() => setActiveChart('dividends')}
                        >
                          Dividends
                        </ChartTab>
                      )}
                    </nav>
                    <div className="flex gap-2 ml-auto items-center">
                      {activeChart === 'value' &&
                        (() => {
                          let filteredPortfolioHistory = portfolioHistory;
                          if (timeframe !== 'ALL') {
                            const now = Date.now();
                            const daysMap: Record<string, number> = {
                              '1M': 30,
                              '3M': 90,
                              '6M': 180,
                              '1Y': 365,
                            };
                            const days = daysMap[timeframe] || 100000;
                            const cutoff = now - days * 24 * 60 * 60 * 1000;
                            filteredPortfolioHistory = portfolioHistory.filter(
                              (p) => new Date(p.date).getTime() >= cutoff,
                            );
                          }
                          if (!filteredPortfolioHistory || filteredPortfolioHistory.length < 2)
                            return null;
                          let displayValue;
                          const startValue = filteredPortfolioHistory[0]?.value ?? 0;
                          const endValue =
                            filteredPortfolioHistory[filteredPortfolioHistory.length - 1]?.value ??
                            0;
                          if (timeframe === 'ALL') {
                            const totalInvested = purchases.reduce((sum, p) => {
                              const buyPrice = getBuyPrice(p.symbol, p.date);
                              return buyPrice !== null ? sum + buyPrice * p.shares : sum;
                            }, 0);
                            displayValue = getCurrentPortfolioValue() - totalInvested;
                          } else {
                            displayValue = endValue - startValue;
                          }
                          const pct =
                            startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0;
                          return (
                            <span className="flex items-center gap-2">
                              <span className="text-sm text-gray-300 font-normal">
                                {displayValue.toLocaleString(undefined, {
                                  style: 'currency',
                                  currency: 'USD',
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span
                                className={`text-sm font-normal ${pct > 0 ? 'text-green-500' : pct < 0 ? 'text-red-500' : 'text-gray-400'}`}
                              >
                                {pct > 0 ? '+' : ''}
                                {pct.toFixed(2)}%
                              </span>
                            </span>
                          );
                        })()}
                      {activeChart === 'value' && (
                        <>
                          {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
                            <TimeframeTab
                              key={tf}
                              active={timeframe === tf}
                              onClick={() => setTimeframe(tf)}
                            >
                              {tf}
                            </TimeframeTab>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  {activeChart === 'dividends' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDividendYear((y) => y - 1)}
                        className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 transition"
                        aria-label="Previous Year"
                      >
                        ‹
                      </button>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200 min-w-[46px] text-center">
                        {dividendYear}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDividendYear((y) => y + 1)}
                        className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 transition"
                        aria-label="Next Year"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div
                className={
                  activeChart === 'dividends'
                    ? 'min-h-[320px] sm:min-h-[480px] max-h-[700px] h-auto w-full'
                    : 'h-[220px] sm:h-[400px] w-full'
                }
              >
                {activeChart === 'value' &&
                  (() => {
                    // Filter portfolioHistory by timeframe (no hook here to satisfy rules-of-hooks)
                    let filteredPortfolioHistory = portfolioHistory;
                    if (timeframe !== 'ALL') {
                      const now = Date.now();
                      const daysMap: Record<string, number> = {
                        '1M': 30,
                        '3M': 90,
                        '6M': 180,
                        '1Y': 365,
                      };
                      const days = daysMap[timeframe] || 100000; // large for ALL fallback
                      const cutoff = now - days * 24 * 60 * 60 * 1000;
                      filteredPortfolioHistory = portfolioHistory.filter(
                        (p) => new Date(p.date).getTime() >= cutoff,
                      );
                    }
                    let chartColor = '#2563eb';
                    if (filteredPortfolioHistory.length > 1) {
                      const first = filteredPortfolioHistory[0].value;
                      const last =
                        filteredPortfolioHistory[filteredPortfolioHistory.length - 1].value;
                      if (last > first) chartColor = '#16a34a';
                      else if (last < first) chartColor = '#dc2626';
                    }
                    return (
                      <ChartContainer config={{ value: { label: 'Value', color: chartColor } }}>
                        <div
                          className="w-full"
                          style={{ maxWidth: 800, height: '100%', minWidth: 0 }}
                        >
                          {filteredPortfolioHistory.length ? (
                            <AreaChart
                              width={
                                typeof window !== 'undefined' && window.innerWidth < 640 ? 340 : 800
                              }
                              height={
                                typeof window !== 'undefined' && window.innerWidth < 640 ? 220 : 400
                              }
                              data={filteredPortfolioHistory}
                              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorPortfolioValue"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                                minTickGap={18}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                                width={60}
                                domain={['auto', 'auto']}
                                tickFormatter={(v: number) =>
                                  v >= 1_000_000
                                    ? (v / 1_000_000).toFixed(1) + 'M'
                                    : v >= 1_000
                                      ? (v / 1_000).toFixed(1) + 'K'
                                      : v.toLocaleString()
                                }
                              />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || !payload.length) return null;
                                  return (
                                    <div className="bg-gray-900 dark:bg-gray-800 text-white rounded px-2 py-1 text-[10px] shadow">
                                      <div
                                        className="font-semibold mb-0.5"
                                        style={{ color: chartColor }}
                                      >
                                        {label}
                                      </div>
                                      <div>
                                        $
                                        {payload[0].payload.value.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                fillOpacity={1}
                                fill="url(#colorPortfolioValue)"
                              />
                            </AreaChart>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[11px] text-gray-400">
                              No data.
                            </div>
                          )}
                        </div>
                      </ChartContainer>
                    );
                  })()}
                {activeChart === 'dividends' && dividendHistory.length > 0 && (
                  <div className="overflow-y-auto custom-scroll pr-1 max-h-[520px]">
                    <DividendCalendar
                      events={dividendHistory}
                      timeframe={timeframe}
                      externalYear={dividendYear}
                      disableYearNav
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Right side: Form + Purchases unified */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 w-full">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b] p-2 sm:p-3 md:p-4 flex flex-col gap-3 w-full">
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddPurchase();
                }}
              >
                <div className="flex gap-2 flex-col sm:flex-row w-full">
                  <Input
                    type="text"
                    placeholder="Ticker (e.g. AAPL)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Shares"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    min={0}
                    step={0.01}
                    disabled={loading}
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={buyDate}
                    onChange={(e) => setBuyDate(e.target.value)}
                    disabled={loading}
                    className="text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-9 px-4 text-sm whitespace-nowrap"
                  >
                    Buy
                  </Button>
                </div>
                {error && <div className="text-red-500 text-xs">{error}</div>}
              </form>
              <div className="flex items-center justify-between mt-1 mb-1">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
                  Purchases{' '}
                  <span className="font-normal text-[10px] text-gray-500 ml-1">
                    {purchases.length}
                  </span>
                </h4>
                <button
                  onClick={handleReload}
                  disabled={loading || trackedStocks.length === 0}
                  className="h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  title="Reload prices & chart"
                  aria-label="Reload prices & chart"
                >
                  <RefreshCw className={`w-4 h-4${reloading ? ' animate-spin' : ''}`} />
                </button>
              </div>
              <div className="relative rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#202024] p-2 overflow-hidden h-48 sm:h-64 md:h-[360px] xl:h-[400px] w-full">
                <div
                  className="overflow-y-auto pr-1 h-full custom-scroll"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {purchases.length === 0 ? (
                    <div className="text-gray-400 dark:text-gray-600 text-xs">
                      No purchases yet.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {purchases.map((p, i) => {
                        const price = getCurrentPrice(p.symbol);
                        const buyPrice = getBuyPrice(p.symbol, p.date);
                        let returnPct: string | JSX.Element = (
                          <span className="text-gray-400">-</span>
                        );
                        if (price !== null && buyPrice !== null && buyPrice !== 0) {
                          const pct = ((price - buyPrice) / buyPrice) * 100;
                          const pctStr = pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
                          returnPct = (
                            <span
                              className={
                                pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : undefined
                              }
                            >
                              {pctStr}
                            </span>
                          );
                        }
                        const animateSwipe = i === purchases.length - 1;
                        return (
                          <SwipeToDeleteCard
                            key={i}
                            symbol={p.symbol}
                            date={p.date}
                            shares={p.shares}
                            price={price}
                            returnPct={returnPct}
                            onDelete={() =>
                              setPurchases((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            animateSwipe={animateSwipe}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* end body wrapper */}
    </div>
  );
}

// --- Small KPI Card Component ---
function KpiCard({
  label,
  value,
  trend,
  rawPct,
  loading = false,
  muted = false,
}: {
  label: string;
  value: any;
  trend?: { pct: number | null; formatted: string | JSX.Element };
  rawPct?: number | null;
  loading?: boolean;
  muted?: boolean;
}) {
  const color =
    rawPct !== undefined && rawPct !== null
      ? rawPct > 0
        ? 'text-green-600'
        : rawPct < 0
          ? 'text-red-600'
          : 'text-gray-800 dark:text-gray-200'
      : 'text-gray-800 dark:text-gray-200';
  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18181b] p-3 sm:p-4 flex flex-col justify-center min-h-[86px] ${muted ? 'opacity-50' : ''}`}
    >
      <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </span>
      <span className={`text-sm sm:text-base font-semibold leading-tight break-all ${color}`}>
        {loading ? '…' : value}
      </span>
      {label === 'Return' && trend && trend.pct !== null && (
        <span className="text-[10px] mt-0.5">{trend.formatted}</span>
      )}
    </div>
  );
}

function ChartTab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-7 text-xs rounded-md border transition font-medium tracking-wide ${active ? 'bg-white dark:bg-[#222] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}

function TimeframeTab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 h-7 text-[11px] rounded-md border transition font-medium ${active ? 'bg-gray-900 dark:bg-[#222] text-white border-gray-700 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}

// --- Dividend Calendar Component ---
interface DividendCalendarProps {
  events: { date: string; amount: number }[];
  timeframe: string; // '1M' | '3M' | '6M' | '1Y' | 'ALL'
  externalYear?: number; // if provided, calendar is controlled externally
  disableYearNav?: boolean; // suppress internal year nav rendering
}

function DividendCalendar({
  events,
  timeframe,
  externalYear,
  disableYearNav,
}: DividendCalendarProps) {
  const today = useMemo(() => new Date(), []);

  // Apply timeframe filter to events (so year list respects timeframe)
  const timeframeStart = useMemo(() => {
    if (timeframe === 'ALL') {
      if (!events.length) return null;
      const earliest = events.reduce((m, e) => (e.date < m ? e.date : m), events[0].date);
      return new Date(earliest + 'T00:00:00');
    }
    const daysMap: Record<string, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
    const days = daysMap[timeframe] || 365;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }, [timeframe, events]);

  const filteredEvents = useMemo(
    () =>
      timeframeStart
        ? events.filter((e) => new Date(e.date).getTime() >= timeframeStart.getTime())
        : events,
    [events, timeframeStart],
  );

  // Map for quick lookups (only filtered events)
  const eventsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredEvents) {
      map[e.date] = (map[e.date] || 0) + e.amount;
    }
    return map;
  }, [filteredEvents]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    (filteredEvents.length ? filteredEvents : events).forEach((e) => {
      set.add(new Date(e.date + 'T00:00:00').getFullYear());
    });
    if (!set.size) set.add(today.getFullYear());
    return Array.from(set).sort((a, b) => a - b);
  }, [filteredEvents, events, today]);

  const [internalYear, setInternalYear] = useState<number>(() =>
    availableYears.length ? availableYears[availableYears.length - 1] : today.getFullYear(),
  );
  const selectedYear = externalYear ?? internalYear;

  useEffect(() => {
    if (externalYear === undefined) {
      if (!availableYears.includes(internalYear)) {
        setInternalYear(availableYears[availableYears.length - 1]);
      }
    }
  }, [availableYears, internalYear, externalYear]);

  const months = useMemo(() => {
    const list: Date[] = [];
    const startMonth =
      timeframeStart && timeframeStart.getFullYear() === selectedYear
        ? timeframeStart.getMonth()
        : 0;
    const endMonth = selectedYear === today.getFullYear() ? today.getMonth() : 11;
    for (let m = startMonth; m <= endMonth; m++) list.push(new Date(selectedYear, m, 1));
    return list;
  }, [selectedYear, timeframeStart, today]);

  const maxAmount = useMemo(() => {
    let max = 0;
    for (const [dateStr, amt] of Object.entries(eventsByDate)) {
      if (new Date(dateStr + 'T00:00:00').getFullYear() === selectedYear && amt > max) max = amt;
    }
    return max || 1;
  }, [eventsByDate, selectedYear]);

  const canPrev = availableYears.indexOf(selectedYear) > 0;
  const canNext = availableYears.indexOf(selectedYear) < availableYears.length - 1;
  const goPrev = () => {
    if (externalYear !== undefined) return; // controlled externally
    if (canPrev) {
      const idx = availableYears.indexOf(selectedYear);
      setInternalYear(availableYears[idx - 1]);
    }
  };
  const goNext = () => {
    if (externalYear !== undefined) return;
    if (canNext) {
      const idx = availableYears.indexOf(selectedYear);
      setInternalYear(availableYears[idx + 1]);
    }
  };

  function dayColor(amt: number) {
    if (amt <= 0) return 'bg-gray-200 dark:bg-gray-800';
    const intensity = Math.min(1, amt / maxAmount);
    if (intensity < 0.2) return 'bg-green-200 dark:bg-green-800/40';
    if (intensity < 0.4) return 'bg-green-300 dark:bg-green-700/60';
    if (intensity < 0.6) return 'bg-green-400 dark:bg-green-600/70';
    if (intensity < 0.8) return 'bg-green-500 dark:bg-green-500/80';
    return 'bg-green-600 dark:bg-green-400/80';
  }

  // Restore custom calendar rendering with monthly sum
  return (
    <div className="pb-2 space-y-4">
      {!disableYearNav && (
        <div className="flex items-center justify-start gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className={`h-7 w-7 flex items-center justify-center rounded border text-xs font-medium transition ${canPrev ? 'border-gray-300 dark:border-gray-600 hover:bg-white/40 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200' : 'border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed opacity-40'}`}
              aria-label="Previous Year"
            >
              ‹
            </button>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
              {selectedYear}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className={`h-7 w-7 flex items-center justify-center rounded border text-xs font-medium transition ${canNext ? 'border-gray-300 dark:border-gray-600 hover:bg-white/40 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200' : 'border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed opacity-40'}`}
              aria-label="Next Year"
            >
              ›
            </button>
          </div>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {months.map((monthDate) => {
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const nextMonth = new Date(year, month + 1, 1);
          const daysInMonth = Math.round((+nextMonth - +firstDay) / (1000 * 60 * 60 * 24));
          const prefixBlanks = firstDay.getDay();
          const cells: (Date | null)[] = [];
          for (let i = 0; i < prefixBlanks; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
          while (cells.length % 7 !== 0) cells.push(null);
          // Monthly sum
          const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
          let monthSum = 0;
          for (const [dateStr, amt] of Object.entries(eventsByDate)) {
            if (dateStr.startsWith(monthKey)) monthSum += amt as number;
          }
          const monthSumFormatted = monthSum
            ? monthSum.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 2,
              })
            : '-';
          return (
            <div
              key={monthDate.toISOString()}
              className="border border-gray-200 dark:border-gray-700 rounded-md p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  {monthDate.toLocaleString(undefined, { month: 'short', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <span>Dividends</span>
                  <span className="font-semibold text-[10px] text-gray-600 dark:text-gray-300">
                    {monthSumFormatted}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                  <div
                    key={d + 'hdr'}
                    className="text-[9px] font-medium text-center text-gray-400 dark:text-gray-600 select-none"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((cell, idx) => {
                  if (!cell) return <div key={idx} className="h-8 rounded-sm bg-transparent" />;
                  const dateStr = cell.toISOString().substring(0, 10);
                  const amt = eventsByDate[dateStr] || 0;
                  // Aggregate tickers for this date
                  const tickers: { symbol: string; amount: number }[] = [];
                  for (const e of filteredEvents) {
                    if (e.date === dateStr && 'symbol' in e) {
                      tickers.push({ symbol: (e as any).symbol, amount: e.amount });
                    }
                  }
                  return (
                    <div
                      key={idx}
                      className={`relative group h-8 rounded-sm flex items-center justify-center ${dayColor(amt)} transition-colors`}
                    >
                      <span className="text-[9px] font-semibold text-gray-700 dark:text-gray-100">
                        {cell.getDate()}
                      </span>
                      {amt > 0 && (
                        <div className="absolute z-10 bottom-full mb-1 hidden group-hover:block px-2 py-1 rounded bg-gray-900 text-white text-[10px] whitespace-nowrap shadow-lg min-w-[120px]">
                          <div className="font-semibold mb-0.5">{dateStr}</div>
                          <div>
                            {amt.toLocaleString(undefined, {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="mt-1">
                            {tickers.length > 0 ? (
                              tickers.map((t, i) => (
                                <div key={t.symbol + '-' + i} className="flex gap-1 items-center">
                                  <span className="font-mono text-green-300">{t.symbol}</span>
                                  <span className="text-gray-200">
                                    {t.amount.toLocaleString(undefined, {
                                      style: 'currency',
                                      currency: 'USD',
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="italic text-gray-400">No ticker info</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {months.length === 0 && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">No dividend data</div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">Scale:</span>
        <div className="flex items-center gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t, i) => {
            const sample = maxAmount * t;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm ${dayColor(sample)}`}
                title={`${(sample || 0).toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                })}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
