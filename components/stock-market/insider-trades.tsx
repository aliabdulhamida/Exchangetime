'use client';

import { Search, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { fetchStockData } from '../stock-market/portfolio-tracker';

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

export default function InsiderTrades() {
  // Helper for correct compact formatting with decimals and sign
  function formatSelectedTotal(num: number) {
    const absNum = Math.abs(num);
    let value: number, unit: string;
    if (absNum >= 1_000_000_000_000) {
      value = num / 1_000_000_000_000;
      unit = 'T';
    } else if (absNum >= 1_000_000_000) {
      value = num / 1_000_000_000;
      unit = 'B';
    } else if (absNum >= 1_000_000) {
      value = num / 1_000_000;
      unit = 'M';
    } else if (absNum >= 1_000) {
      value = num / 1_000;
      unit = 'K';
    } else {
      value = num;
      unit = '';
    }
    return `${value.toFixed(2)}${unit}`;
  }

  const [ticker, setTicker] = useState('');
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emptyState, setEmptyState] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  // Auswahl-Logik für Karten
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [dailyChange, setDailyChange] = useState<number | null>(null);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // --- Logik und Hilfsfunktionen ---
  // Preis und Tagesänderung werden nur nach erfolgreichem Laden der Trades geholt
  async function fetchChange(symbol: string) {
    if (!symbol) {
      setDailyChange(null);
      setLatestPrice(null);
      return;
    }
    const data = await fetchStockData(symbol);
    if (Array.isArray(data) && data.length > 1) {
      const last = data[data.length - 1];
      const prev = data[data.length - 2];
      if (last && prev && last.close !== null && prev.close !== null && prev.close !== 0) {
        setLatestPrice(last.close);
        setDailyChange(((last.close - prev.close) / prev.close) * 100);
      } else {
        setLatestPrice(null);
        setDailyChange(null);
      }
    } else {
      setLatestPrice(null);
      setDailyChange(null);
    }
  }

  function toggleSelect(index: number) {
    setSelectedIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  const buyRegex = /buy|purchase|acq|acquisition|award|option|gift/i;
  const sellRegex = /sell|sale|dispose|disposition/i;

  function getSignedTradeValue(trade: InsiderTrade | undefined) {
    if (!trade) return 0;
    const rawValue =
      typeof trade.value === 'number' && Number.isFinite(trade.value)
        ? trade.value
        : trade.shares * trade.price;
    const absValue = Math.abs(rawValue || 0);
    if (buyRegex.test(trade.transaction)) return absValue;
    if (sellRegex.test(trade.transaction)) return -absValue;
    return 0;
  }

  const selectedSum = selectedIndexes
    .map((i) => getSignedTradeValue(trades[i]))
    .reduce((a, b) => a + b, 0);

  const fetchInsiderTrades = async () => {
    setLoading(true);
    setError(null);
    setEmptyState(null);
    setCompanyName('');
    setTrades([]);
    setSelectedIndexes([]);
    try {
      const cleanTicker = ticker.trim().toUpperCase();
      const response = await fetch(`/api/insider-trades?symbol=${cleanTicker}`);
      if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
      const data = await response.json();

      setCompanyName(data.company || cleanTicker);

      const parsedTrades: InsiderTrade[] = data.trades || [];
      setTrades(parsedTrades);

      if (parsedTrades.length === 0) {
        setEmptyState(
          `No recent insider filings found for ${cleanTicker}. Try another symbol or check again later.`,
        );
        setLatestPrice(null);
        setDailyChange(null);
      } else {
        // Fetch price and daily change after successful load
        await fetchChange(cleanTicker);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setLatestPrice(null);
      setDailyChange(null);
    } finally {
      setLoading(false);
    }
  };

  // Statistiken für Buy/Sell
  const buyCount = trades.filter((t) => buyRegex.test(t.transaction)).length;
  const sellCount = trades.filter((t) => sellRegex.test(t.transaction)).length;
  const buyVolume = trades
    .filter((t) => buyRegex.test(t.transaction))
    .reduce((sum, t) => sum + t.value, 0);
  const sellVolume = trades
    .filter((t) => sellRegex.test(t.transaction))
    .reduce((sum, t) => sum + t.value, 0);

  function formatCompactNumber(num: number) {
    if (num >= 1_000_000_000_000) return Math.ceil(num / 1_000_000_000_000) + 'T';
    if (num >= 1_000_000_000) return Math.ceil(num / 1_000_000_000) + 'B';
    if (num >= 1_000_000) return Math.ceil(num / 1_000_000) + 'M';
    if (num >= 1_000) return Math.ceil(num / 1_000) + 'K';
    if (num <= -1_000_000_000_000) return Math.ceil(num / 1_000_000_000_000) + 'T';
    if (num <= -1_000_000_000) return Math.ceil(num / 1_000_000_000) + 'B';
    if (num <= -1_000_000) return Math.ceil(num / 1_000_000) + 'M';
    if (num <= -1_000) return Math.ceil(num / 1_000) + 'K';
    return Math.ceil(num).toString();
  }

  // Chart-Komponente im Compound-Interest-Stil für Insider Trades
  function InsiderTradesChart({ trades }: { trades: InsiderTrade[] }) {
    function formatCompactNumber(num: number) {
      if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // Aggregiere Buy/Sell-Volumen pro Tag
    const buyRegex = /buy|purchase|acq|acquisition|award|option|gift/i;
    const sellRegex = /sell|sale|dispose|disposition/i;
    // Nach Datum gruppieren
    const grouped: Record<string, { date: string; buy: number; sell: number }> = {};
    trades.forEach((t) => {
      if (!grouped[t.date]) grouped[t.date] = { date: t.date, buy: 0, sell: 0 };
      if (buyRegex.test(t.transaction)) grouped[t.date].buy += t.value;
      if (sellRegex.test(t.transaction)) grouped[t.date].sell += t.value;
    });
    // Sortiere nach Datum (neueste oben)
    const chartData = Object.values(grouped).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? (v / 1_000_000).toFixed(1) + 'M'
                : v >= 1_000
                  ? (v / 1_000).toFixed(1) + 'K'
                  : v.toLocaleString()
            }
          />
          <Tooltip
            wrapperStyle={{ background: 'transparent', boxShadow: 'none' }}
            content={({
              active,
              payload,
              label,
            }: {
              active?: boolean;
              payload?: any[];
              label?: string;
            }) => {
              if (!active || !payload || !payload.length) return null;
              return (
                <div
                  style={{
                    background: '#000',
                    color: '#fff',
                    border: '1px solid #262626',
                    borderRadius: 6,
                    padding: '4px 8px',
                    minWidth: 70,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    fontSize: '11px',
                    lineHeight: 1.2,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 2,
                      color: '#e5e7eb',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  >
                    {label}
                  </div>
                  <div>
                    <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '11px' }}>
                      Buy:
                    </span>{' '}
                    {formatCompactNumber(payload[0]?.payload?.buy ?? 0)} $
                  </div>
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '11px' }}>
                      Sell:
                    </span>{' '}
                    {formatCompactNumber(payload[0]?.payload?.sell ?? 0)} $
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="buy" fill="#22c55e" name="Buy Volume" />
          <Bar dataKey="sell" fill="#ef4444" name="Sell Volume" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="pt-0">
      <h2 className="mb-2 mt-0 ml-0 flex items-center gap-2 text-lg font-bold text-foreground">
        Insider Trades
      </h2>
      <div className="flex gap-2 mb-4">
        <Input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchInsiderTrades();
            }
          }}
          placeholder="Enter ticker (e.g. AAPL)"
          className="min-w-0 flex-1"
        />
        <Button onClick={fetchInsiderTrades} disabled={loading}>
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {companyName && trades.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-card/50 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Company</p>
              <p className="truncate text-base font-semibold text-foreground sm:text-lg">{companyName}</p>
            </div>

            <div className="flex items-end gap-3">
              {typeof latestPrice === 'number' && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p>
                  <p className="tabular-nums text-base font-semibold text-foreground sm:text-lg">
                    ${latestPrice.toFixed(2)}
                  </p>
                </div>
              )}
              {typeof dailyChange === 'number' && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today</p>
                  <p
                    className={`tabular-nums text-base font-semibold sm:text-lg ${dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {dailyChange >= 0 ? '+' : ''}
                    {dailyChange.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Disclaimer ähnlich wie Stock Analysis */}
      {!loading && !error && trades.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
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
            Insider trading data is reported with a delay and should be used for informational
            purposes only.
          </span>
        </div>
      )}
      {loading && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="col-span-1 mt-4 grid max-h-[420px] h-[420px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:col-span-2 sm:h-[600px] sm:grid-cols-2 sm:gap-6 sm:pr-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="relative flex min-h-[160px] flex-col px-4 py-4 sm:px-6 sm:py-5">
                <CardContent className="flex flex-col p-0 h-full">
                  <div className="flex items-start justify-between w-full mb-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-3 w-20 mb-2" />
                  <div className="flex flex-row items-end justify-between w-full mt-auto gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {error && (
        <Alert
          variant="destructive"
          className="relative mb-6 flex flex-col items-center justify-center border border-red-400 bg-red-900/20 px-4 py-8 text-center text-red-300"
        >
          <div className="flex flex-col items-center w-full">
            <AlertTriangle className="mb-2 h-8 w-8 text-red-300" />
            <div className="text-lg mb-1 mx-auto max-w-xs break-words">{error}</div>
          </div>
        </Alert>
      )}
      {emptyState && !loading && !error && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-center text-amber-200">
          <div className="font-medium mb-1">No Insider Trades Available</div>
          <div className="text-sm opacity-90">{emptyState}</div>
        </div>
      )}
      {/* Bereich mit Company, Ticker, Preis und Tagesänderung entfernt */}
      {/* Statistikkarten und Chart */}
      {trades.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <Card className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Buy Transactions
                  </span>
                  <span className="break-words text-base font-bold text-green-400">
                    {buyCount}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Sell Transactions
                  </span>
                  <span className="break-words text-base font-bold text-red-500">
                    {sellCount}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Buy Volume
                  </span>
                  <span className="break-words text-base font-bold text-green-400">
                    ${formatCompactNumber(buyVolume)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Sell Volume
                  </span>
                  <span className="break-words text-base font-bold text-red-500">
                    ${formatCompactNumber(sellVolume)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Chart im Compound-Interest-Stil (kleiner) */}
          <div className="w-full h-48 mb-8">
            <InsiderTradesChart trades={trades} />
          </div>
        </>
      )}
      {/* Kartenliste */}
      {trades.length > 0 && (
        <>
          {selectedIndexes.length > 0 && (
            <div className="mb-4 flex items-center justify-center">
              <span className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">
                Total value of selected trades: ${formatSelectedTotal(selectedSum)}
              </span>
            </div>
          )}
          <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
            </svg>
            <span>Select transactions to show the total value.</span>
          </div>
          <div className="relative">
            <div className="grid max-h-[360px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:max-h-[420px] sm:grid-cols-2 sm:gap-6 sm:pr-2">
              {trades.map((trade, index) => {
                const selected = selectedIndexes.includes(index);
                return (
                  <Card
                    key={index}
                    className={`relative flex min-h-[160px] cursor-pointer flex-col border border-border px-4 py-4 transition-all duration-150 sm:px-6 sm:py-5 ${selected ? 'border-foreground shadow-lg' : ''}`}
                    onClick={() => toggleSelect(index)}
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`Insider Trade ${index + 1} auswählen`}
                  >
                    <CardContent className="flex flex-col p-0 h-full">
                      {/* Top Row: Titel und Sale-Badge nebeneinander */}
                      <div className="flex items-start w-full mb-6 relative">
                        <div className="absolute left-0 -top-1 text-[10px] sm:text-xs font-extrabold text-card-foreground uppercase tracking-tight leading-tight max-w-[70%] break-words">
                          {trade.position}
                        </div>
                        {/* Badges absolut oben rechts platzieren */}
                        <div className="absolute -right-2 -top-2 flex gap-1 sm:-right-4">
                          {sellRegex.test(trade.transaction) && (
                            <span
                              className="flex items-center gap-1 px-1 py-0.5 text-[8px] font-bold text-red-300 sm:text-[10px]"
                              style={{ letterSpacing: 1 }}
                            >
                              <ArrowDownCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Sale
                            </span>
                          )}
                          {buyRegex.test(trade.transaction) && (
                            <span
                              className="flex items-center gap-1 px-1 py-0.5 text-[8px] font-bold text-green-300 sm:text-[10px]"
                              style={{ letterSpacing: 1 }}
                            >
                              <ArrowUpCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Buy
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Datum und Name */}
                      <div className="text-[8px] sm:text-[10px] font-bold text-card-foreground flex justify-center mt-2 mb-0.5">
                        {trade.date}
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center mb-2">
                        {trade.insider}
                      </div>
                      {/* Werte */}
                      <div className="flex flex-row items-end justify-between w-full mt-auto gap-2">
                        <div className="flex flex-col items-start flex-1 -ml-1">
                          <span className="text-[7px] sm:text-[8px] text-muted-foreground font-semibold mb-0.5">
                            PRICE
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-bold text-card-foreground">
                            ${formatCompactNumber(Math.ceil(trade.price))}
                          </span>
                        </div>
                        <div className="flex flex-col items-start flex-1 -ml-1">
                          <span className="text-[7px] sm:text-[8px] text-muted-foreground font-semibold mb-0.5">
                            SHARES
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-bold text-card-foreground">
                            {formatCompactNumber(Math.ceil(trade.shares))}
                          </span>
                        </div>
                        <div className="flex flex-col items-start flex-1 -ml-1">
                          <span className="text-[7px] sm:text-[8px] text-muted-foreground font-semibold mb-0.5">
                            VALUE
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-bold text-card-foreground">
                            ${formatSelectedTotal(trade.value)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
