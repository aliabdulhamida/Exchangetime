"use client";

import { BarChart3, RefreshCw, Trash, TrendingUp, TrendingDown } from "lucide-react";
import React, { useState, useEffect, JSX } from "react";

// Einzelne Card-Komponente mit Swipe-to-Delete
function SwipeToDeleteCard({
  symbol,
  date,
  shares,
  price,
  returnPct,
  onDelete,
  animateSwipe = false
}: {
  symbol: string;
  date: string;
  shares: number;
  price: number | null;
  returnPct: string | JSX.Element;
  onDelete: () => void;
  animateSwipe?: boolean;
}) {
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [startX, setStartX] = React.useState<number | null>(null);
  const threshold = 80;

  // Animation für neuen Eintrag: Swipe kurz nach links und zurück
  React.useEffect(() => {
    if (animateSwipe) {
      setTimeout(() => setDragX(-60), 250); // nach Mount swipen
      setTimeout(() => setDragX(0), 1100); // zurück
    }
    // eslint-disable-next-line
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
  const [showDelete, setShowDelete] = React.useState(false);
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
        style={{ opacity: dragX < -10 || showDelete ? 1 : 0, pointerEvents: showDelete ? 'auto' : 'none', transition: 'opacity 0.2s' }}
        onClick={showDelete ? handleDeleteClick : undefined}
        aria-label={showDelete ? 'Delete purchase' : undefined}
        tabIndex={showDelete ? 0 : -1}
      >
        <Trash className="w-6 h-6 text-red-600 mr-4" />
      </div>
      {/* Card */}
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b] p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 relative text-xs sm:text-sm shadow-sm min-h-[56px] hover:shadow-md transition-shadow z-10 touch-none select-none w-full"
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform 0.2s' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
      >
        <div className="flex flex-row w-full min-w-0 justify-between items-stretch">
          {/* Linke Spalte: Name, Shares, Datum */}
          <div className="flex flex-col min-w-0 justify-center">
            <span className="font-mono font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate max-w-[80px] sm:max-w-none">{symbol}</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Shares:</span>
              <span className="font-semibold text-xs sm:text-sm">{shares}</span>
            </div>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap mt-1">{date}</span>
          </div>
          {/* Rechte Spalte: Current Price, Return */}
          <div className="flex flex-col items-end min-w-[90px] justify-center">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] text-gray-700 dark:text-gray-300">Current Price:</span>
              <span className="font-mono text-xs sm:text-sm">{price !== null ? `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : <span className="text-gray-400">-</span>}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] text-gray-700 dark:text-gray-300">Return:</span>
              {returnPct}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StockDataPoint {
  date: string;
  close: number;
}

interface Purchase {
  symbol: string;
  shares: number;
  date: string; // yyyy-mm-dd
}

export async function fetchStockData(symbol: string): Promise<StockDataPoint[] | { error: string }> {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = 0; // keine Begrenzung, seit 1970
    const proxyUrl = "https://corsproxy.io/?";
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;
    const url = proxyUrl + encodeURIComponent(yahooUrl);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) throw new Error("Invalid data format received");
    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;
    return timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split("T")[0],
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
  function getTotalReturn(): { pct: number | null, formatted: string | JSX.Element } {
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
    if (totalInvested === 0) return { pct: null, formatted: <span className="text-gray-400">-</span> };
    const pct = ((totalCurrent - totalInvested) / totalInvested) * 100;
    const pctStr = pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
    return {
      pct,
      formatted: <span className={pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : undefined}>{pctStr}</span>
    };
  }
  const [stockData, setStockData] = useState<{ [key: string]: StockDataPoint[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stockData");
      try {
        const parsed = saved ? JSON.parse(saved) : {};
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [trackedStocks, setTrackedStocks] = useState<string[]>(() => {
    // Load trackedStocks from localStorage on mount
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trackedStocks");
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
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("purchases");
      try {
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) &&
          parsed.every(
            (p: any) => typeof p.symbol === "string" && typeof p.shares === "number" && typeof p.date === "string"
          )
          ? parsed
          : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [search, setSearch] = useState("");
  const [shares, setShares] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save trackedStocks, purchases und stockData zu localStorage, wenn sie sich ändern
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trackedStocks", JSON.stringify(trackedStocks));
    }
  }, [trackedStocks]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("purchases", JSON.stringify(purchases));
    }
  }, [purchases]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("stockData", JSON.stringify(stockData));
    }
  }, [stockData]);

  const fetchAndCacheStock = async (symbol: string, force = false) => {
    if (!force && stockData[symbol]) return;
    setLoading(true);
    const data = await fetchStockData(symbol);
    setLoading(false);
    if ("error" in data) {
      setError(`Could not fetch data for ${symbol}: ${data.error}`);
      return;
    }
    setStockData((prev) => ({ ...prev, [symbol]: data }));
  };

  // Fetch data for tracked stocks on mount or when trackedStocks changes
  useEffect(() => {
    trackedStocks.forEach((symbol: string) => {
      if (!stockData[symbol]) {
        fetchAndCacheStock(symbol);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedStocks]);

  // Aktualisiere alle 15 Minuten die aktuellen Preise und den Chart
  useEffect(() => {
    if (trackedStocks.length === 0) return;
    const interval = setInterval(() => {
      trackedStocks.forEach((symbol) => {
        fetchAndCacheStock(symbol);
      });
    }, 900000); // 15 Minuten
    return () => clearInterval(interval);
  }, [trackedStocks]);

  // Add a purchase (buy)
  const handleAddPurchase = async () => {
    const symbol = search.trim().toUpperCase();
    const nShares = parseFloat(shares);
    if (!symbol || isNaN(nShares) || nShares <= 0 || !buyDate) {
      setError("Please fill in all fields with valid values.");
      return;
    }
    setLoading(true);
    setError(null);
    await fetchAndCacheStock(symbol);
    setTrackedStocks((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
    setPurchases((prev) => [...prev, { symbol, shares: nShares, date: buyDate }]);
    setSearch("");
    setShares("");
    setBuyDate("");
    setLoading(false);
  };

  // Calculate aggregated portfolio value over time
  let allDates: string[] = [];
  Object.values(stockData).forEach((arr) => {
    arr.forEach((d) => {
      if (!allDates.includes(d.date)) allDates.push(d.date);
    });
  });
  allDates.sort();

  // Finde das früheste Kaufdatum
  let earliestBuyDate = null;
  if (purchases.length > 0) {
    earliestBuyDate = purchases.reduce((min, p) => (min === null || p.date < min ? p.date : min), null as string | null);
  }

  // Filtere allDates, sodass sie erst ab dem frühesten Kaufdatum starten
  let filteredDates = allDates;
  if (earliestBuyDate) {
    filteredDates = allDates.filter(date => date >= earliestBuyDate!);
  }

  let lastValue = 0;
  const portfolioHistory = filteredDates.map((date) => {
    let value = 0;
    purchases.forEach((p) => {
      if (stockData[p.symbol]) {
        // Finde den letzten bekannten Kurs bis zu diesem Datum
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
    setReloading(false);
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col">
      <div className="flex items-center justify-start mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Tracker</h3>
      </div>
      <div className="mb-6">
        <form
          className="flex flex-col sm:flex-row gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddPurchase();
          }}
        >
          <Input
            type="text"
            className="w-full sm:w-44"
            placeholder="Enter ticker (e.g. AAPL)"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            disabled={loading}
          />
          <Input
            type="number"
            className="w-full sm:w-20"
            placeholder="Shares"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            min={0}
            step={0.01}
            disabled={loading}
          />
          <Input
            type="date"
            className="w-full sm:w-40"
            value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="h-10 px-4 flex items-center whitespace-nowrap w-full sm:w-auto">
            Buy
          </Button>
        </form>
        {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Purchases</h3>
          <button
            type="button"
            onClick={handleReload}
            disabled={loading || trackedStocks.length === 0}
            className="h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
            title="Reload prices and chart"
            aria-label="Reload prices and chart"
          >
            <RefreshCw className={`w-4 h-4${reloading ? ' animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          {purchases.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-600 text-sm">No purchases yet.</div>
          ) : (
            <div
              className="grid gap-2 grid-cols-1 max-h-64 overflow-y-auto pr-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {purchases.map((p, i) => {
                const price = getCurrentPrice(p.symbol);
                const buyPrice = getBuyPrice(p.symbol, p.date);
                let returnPct: string | JSX.Element = <span className="text-gray-400">-</span>;
                if (price !== null && buyPrice !== null && buyPrice !== 0) {
                  const pct = ((price - buyPrice) / buyPrice) * 100;
                  const pctStr = pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
                  returnPct = <span className={pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : undefined}>{pctStr}</span>;
                }
                // Animation für die zuletzt hinzugefügte Card (auch wenn es die erste ist)
                const animateSwipe = i === purchases.length - 1;
                return (
                  <SwipeToDeleteCard
                    key={i}
                    symbol={p.symbol}
                    date={p.date}
                    shares={p.shares}
                    price={price}
                    returnPct={returnPct}
                    onDelete={() => setPurchases((prev) => prev.filter((_, idx) => idx !== i))}
                    animateSwipe={animateSwipe}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="mb-2 flex flex-row items-end gap-6 flex-wrap justify-end">
          <div className="flex flex-col items-end">
            <span className="font-semibold text-gray-900 dark:text-white">Portfolio Value:</span>
            <span className="text-blue-700 dark:text-blue-400 font-bold">
              {getCurrentPortfolioValue().toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}
            </span>
            <span className="mt-1 flex items-center gap-1">
              {(() => {
                const totalReturn = getTotalReturn();
                if (totalReturn.pct === null) return totalReturn.formatted;
                if (totalReturn.pct > 0) {
                  return <><TrendingUp className="w-4 h-4 text-green-500" />{totalReturn.formatted}</>;
                } else if (totalReturn.pct < 0) {
                  return <><TrendingDown className="w-4 h-4 text-red-500" />{totalReturn.formatted}</>;
                } else {
                  return totalReturn.formatted;
                }
              })()}
            </span>
          </div>
        </div>
        {(() => {
          // Chart-Farbe je nach Entwicklung
          let chartColor = "#2563eb";
          if (portfolioHistory.length > 1) {
            const first = portfolioHistory[0].value;
            const last = portfolioHistory[portfolioHistory.length - 1].value;
            if (last > first) chartColor = "#16a34a"; // grün
            else if (last < first) chartColor = "#dc2626"; // rot
          }
          return (
            <ChartContainer config={{ value: { label: "Portfolio Value", color: chartColor } }}>
              <ResponsiveContainer width="100%" height={300}>
                {portfolioHistory.length > 0 ? (
                  <AreaChart data={portfolioHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPortfolioValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#a1a1aa' }} minTickGap={30} />
                    <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} width={80} domain={["auto", "auto"]} tickFormatter={(v: number) => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1_000 ? (v/1_000).toFixed(1)+'K' : v.toLocaleString()} />
                    <Tooltip
                      content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-2 py-1 shadow-lg text-[11px] min-w-[80px]" style={{ lineHeight: 1.2 }}>
                            <div className="mb-0.5" style={{ color: chartColor, fontSize: '11px' }}>{label}</div>
                            <div><span style={{ color: chartColor, fontSize: '11px' }}>Value:</span> ${payload[0]?.payload?.value?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke={chartColor} fillOpacity={1} fill="url(#colorPortfolioValue)" name="Portfolio Value" />
                  </AreaChart>
                ) : (
                  <div className="text-gray-400 dark:text-gray-600 text-sm">No data available.</div>
                )}
              </ResponsiveContainer>
            </ChartContainer>
          );
        })()}
      </div>
    </div>
  );
}