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
  // ...existing code...
  const [ticker, setTicker] = useState('');
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  const selectedSum = selectedIndexes.map((i) => trades[i]?.value || 0).reduce((a, b) => a + b, 0);

  const fetchInsiderTrades = async () => {
    setLoading(true);
    setError(null);
    setCompanyName('');
    try {
      const finvizUrl = `https://finviz.com/quote.ashx?t=${ticker}`;
      const proxyUrl = 'https://corsproxy.io/?';
      const response = await fetch(`${proxyUrl}${encodeURIComponent(finvizUrl)}`);
      if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
      const html = await response.text();
      // Parse HTML for trades
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Try to extract company name from title
      const title = doc.querySelector('title')?.textContent || ticker;
      let name = title;
      if (name.includes('Stock Price and Quote')) {
        name = name
          .split('Stock Price and Quote')[0]
          .replace(/^[A-Z]+\s*-\s*/, '')
          .trim();
      } else {
        name = name
          .split('(')[0]
          .replace(/^[A-Z]+\s*-\s*/, '')
          .trim();
      }
      setCompanyName(name);
      // Find insider table
      const insiderTable = [...doc.querySelectorAll('table.body-table')].find((table) => {
        const headers = table.querySelectorAll('th');
        return [...headers].some((th) => th.textContent?.includes('Insider Trading'));
      });
      const parsedTrades: InsiderTrade[] = [];
      if (insiderTable) {
        const rows = insiderTable.querySelectorAll('tr');
        rows.forEach((row, idx) => {
          if (idx === 0) return; // skip header
          const cells = row.querySelectorAll('td');
          if (cells.length >= 6) {
            parsedTrades.push({
              company: name,
              symbol: ticker,
              insider: cells[1]?.textContent?.trim() || '-',
              position: cells[2]?.textContent?.trim() || '-',
              transaction: cells[3]?.textContent?.trim() || '-',
              shares: Number(cells[5]?.textContent?.replace(/[^\d.-]/g, '')) || 0,
              price: Number(cells[4]?.textContent?.replace(/[^\d.-]/g, '')) || 0,
              value:
                (Number(cells[5]?.textContent?.replace(/[^\d.-]/g, '')) || 0) *
                (Number(cells[4]?.textContent?.replace(/[^\d.-]/g, '')) || 0),
              date: cells[0]?.textContent?.trim() || '-',
            });
          }
        });
      }
      setTrades(parsedTrades);
      if (parsedTrades.length === 0) {
        setError('No insider trades found.');
      } else {
        // Hole Preis und Tagesänderung nur nach erfolgreichem Laden
        await fetchChange(ticker);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setLatestPrice(null);
      setDailyChange(null);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  // Statistiken für Buy/Sell
  const buyRegex = /buy|purchase|acq|acquisition|award|option|gift/i;
  const sellRegex = /sell|sale|dispose|disposition/i;
  const buyCount = trades.filter((t) => buyRegex.test(t.transaction)).length;
  const sellCount = trades.filter((t) => sellRegex.test(t.transaction)).length;
  const buyVolume = trades
    .filter((t) => buyRegex.test(t.transaction))
    .reduce((sum, t) => sum + t.value, 0);
  const sellVolume = trades
    .filter((t) => sellRegex.test(t.transaction))
    .reduce((sum, t) => sum + t.value, 0);

  function formatCompactNumber(num: number) {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
              // Theme detection: prefers dark if available
              let isDark = false;
              if (typeof document !== 'undefined') {
                isDark =
                  document.documentElement.classList.contains('dark') ||
                  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
              }
              const bg = isDark ? '#23232a' : '#f3f4f6';
              const text = isDark ? '#fff' : '#222';
              return (
                <div
                  style={{
                    background: bg,
                    color: text,
                    borderRadius: 6,
                    padding: '4px 8px',
                    minWidth: 70,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    fontSize: '11px',
                    lineHeight: 1.2,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 2,
                      color: isDark ? '#a5b4fc' : '#2563eb',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  >
                    {label}
                  </div>
                  <div>
                    <span style={{ color: '#38FFB7', fontWeight: 600, fontSize: '11px' }}>
                      Buy:
                    </span>{' '}
                    {formatCompactNumber(payload[0]?.payload?.buy ?? 0)} $
                  </div>
                  <div>
                    <span style={{ color: '#FF3860', fontWeight: 600, fontSize: '11px' }}>
                      Sell:
                    </span>{' '}
                    {formatCompactNumber(payload[0]?.payload?.sell ?? 0)} $
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="buy" fill="#38FFB7" name="Buy Volume" />
          <Bar dataKey="sell" fill="#FF3860" name="Sell Volume" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ...alle useEffect, Handler, Variablen etc. (wie vorher)...

  // --- BEGINN JSX-RETURN ---
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-2xl pt-4 pl-4 pr-8 pb-8 border border-gray-200 dark:border-[#1F1F23] w-full md:max-w-2xl md:mx-auto">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 mt-0 ml-0">
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
          className="flex-1 min-w-[220px]"
        />
        <Button onClick={fetchInsiderTrades} disabled={loading}>
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {/* Disclaimer ähnlich wie Stock Analysis */}
      {!loading && !error && trades.length === 0 && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 Insider trading data is reported with a delay and should be used for informational
            purposes only.
          </p>
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
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[420px] h-[420px] overflow-y-auto pr-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="flex flex-col px-6 py-5 min-h-[160px] relative">
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
          className="mb-6 border-red-400 bg-red-100/60 dark:bg-red-900/30 text-red-700 dark:text-red-300 border flex flex-col items-center justify-center text-center relative py-8 px-4"
        >
          <div className="flex flex-col items-center w-full">
            <AlertTriangle className="w-8 h-8 mb-2 text-red-600 dark:text-red-200" />
            <div className="text-lg mb-1 mx-auto max-w-xs break-words">{error}</div>
          </div>
        </Alert>
      )}
      {/* Bereich mit Company, Ticker, Preis und Tagesänderung entfernt */}
      {/* Statistikkarten und Chart */}
      {trades.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Card className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Buy Transactions
                  </span>
                  <span className="text-base font-bold text-green-400 dark:text-[#38FFB7] break-words">
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
                  <span className="text-base font-bold text-red-500 dark:text-[#FF3860] break-words">
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
                  <span className="text-base font-bold text-green-400 dark:text-[#38FFB7] break-words">
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
                  <span className="text-base font-bold text-red-500 dark:text-[#FF3860] break-words">
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
          <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-gray-500 dark:text-white"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[320px] overflow-y-auto pr-2">
              {trades.map((trade, index) => {
                const selected = selectedIndexes.includes(index);
                return (
                  <Card
                    key={index}
                    className={`flex flex-col px-6 py-5 min-h-[160px] relative cursor-pointer transition-all duration-150 border-2 ${selected ? 'border-white dark:border-white shadow-lg' : 'border-transparent'}`}
                    onClick={() => toggleSelect(index)}
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`Insider Trade ${index + 1} auswählen`}
                  >
                    <CardContent className="flex flex-col p-0 h-full">
                      {/* Top Row: Titel und Sale-Badge nebeneinander */}
                      <div className="flex items-start w-full mb-6 relative">
                        <div className="absolute left-0 -top-1 text-xs font-extrabold text-card-foreground uppercase tracking-tight leading-tight max-w-[70%] break-words">
                          {trade.position}
                        </div>
                        {/* Badges absolut oben rechts platzieren */}
                        <div className="absolute -right-4 -top-2 flex gap-1">
                          {sellRegex.test(trade.transaction) && (
                            <span
                              className="text-red-400 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1"
                              style={{ letterSpacing: 1 }}
                            >
                              <ArrowDownCircle className="w-3 h-3 mr-0.5" /> Sale
                            </span>
                          )}
                          {buyRegex.test(trade.transaction) && (
                            <span
                              className="text-green-400 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1"
                              style={{ letterSpacing: 1 }}
                            >
                              <ArrowUpCircle className="w-3 h-3 mr-0.5" /> Buy
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Datum und Name */}
                      <div className="text-[10px] font-bold text-card-foreground flex justify-center mt-2 mb-0.5">
                        {trade.date}
                      </div>
                      <div className="text-[10px] text-muted-foreground text-center mb-2">
                        {trade.insider}
                      </div>
                      {/* Werte */}
                      <div className="flex flex-row items-end justify-between w-full mt-auto gap-2">
                        <div className="flex flex-col items-start flex-1 pl-1">
                          <span className="text-[8px] text-muted-foreground font-semibold mb-0.5">
                            PRICE
                          </span>
                          <span className="text-[11px] font-bold text-card-foreground">
                            ${trade.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-start flex-1 pl-1">
                          <span className="text-[8px] text-muted-foreground font-semibold mb-0.5">
                            SHARES
                          </span>
                          <span className="text-[11px] font-bold text-card-foreground">
                            {formatCompactNumber(trade.shares)}
                          </span>
                        </div>
                        <div className="flex flex-col items-start flex-1 pl-1">
                          <span className="text-[8px] text-muted-foreground font-semibold mb-0.5">
                            VALUE
                          </span>
                          <span className="text-[11px] font-bold text-card-foreground">
                            ${formatCompactNumber(trade.value)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          {selectedIndexes.length > 0 && (
            <div className="mt-4 mb-2 flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-900 bg-white dark:bg-white px-4 py-2 rounded-lg shadow border border-blue-100 dark:border-blue-900">
                <span className="text-black">
                  Total value of selected trades: ${formatCompactNumber(selectedSum)}
                </span>
              </span>
            </div>
          )}
        </>
      )}
      {/* Info-Hinweis entfernt, jetzt als Tooltip am Titel */}
    </div>
  );
}
