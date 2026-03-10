'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ScreenerKey = 'gainers' | 'losers' | 'movers' | 'mostActive';

type ScreenerRow = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  exchange: string | null;
  currency: string | null;
  regularMarketTime: number | null;
};

type ScreenerList = {
  title: string;
  description: string;
  asOf: number | null;
  rows: ScreenerRow[];
};

type ScreenerPayload = {
  fetchedAt: string;
  source: 'yahoo';
  lists: Record<ScreenerKey, ScreenerList>;
};

const TAB_ORDER: ScreenerKey[] = ['gainers', 'losers', 'movers', 'mostActive'];
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

function formatAsOf(unixSeconds: number | null): string {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return 'As of: -';
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return 'As of: -';
  return `As of: ${date.toLocaleString()}`;
}

function formatFetchedAt(iso: string | null): string {
  if (!iso) return 'Updated: -';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Updated: -';
  return `Updated: ${date.toLocaleString()}`;
}

function formatCompactNumber(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(digits)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(digits)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(digits)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(digits)}K`;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPrice(value: number | null, currency: string | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const currencyCode = (currency || 'USD').toUpperCase();

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

function formatSignedPrice(value: number | null, currency: string | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatPrice(Math.abs(value), currency)}`;
}

function formatSignedPercent(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatRelativeVolume(volume: number | null, averageVolume: number | null): string {
  if (
    typeof volume !== 'number' ||
    !Number.isFinite(volume) ||
    typeof averageVolume !== 'number' ||
    !Number.isFinite(averageVolume) ||
    averageVolume <= 0
  ) {
    return '-';
  }
  const ratio = volume / averageVolume;
  return `${ratio.toFixed(ratio >= 10 ? 1 : 2)}x`;
}

function toneClass(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'text-muted-foreground';
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-foreground';
}

function isPayload(value: any): value is ScreenerPayload {
  return (
    value &&
    typeof value === 'object' &&
    value.lists &&
    typeof value.lists === 'object' &&
    value.lists.gainers &&
    value.lists.losers &&
    value.lists.movers &&
    value.lists.mostActive
  );
}

export default function MarketScreener() {
  const [payload, setPayload] = useState<ScreenerPayload | null>(null);
  const [activeTab, setActiveTab] = useState<ScreenerKey>('gainers');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/market-screener?count=25', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.details || data?.error || 'Unable to load market screener data.');
      }

      if (!isPayload(data)) {
        throw new Error('Invalid market screener response payload.');
      }

      setPayload(data);
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err || 'Failed to load market screener data.'));
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData(false);
    const interval = window.setInterval(() => {
      void fetchData(true);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  const activeList = useMemo(() => {
    if (!payload) return null;
    return payload.lists[activeTab] || null;
  }, [activeTab, payload]);

  const filteredRows = useMemo(() => {
    if (!activeList) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return activeList.rows;
    return activeList.rows.filter((row) => {
      return row.symbol.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle);
    });
  }, [activeList, query]);

  const fetchedAtText = formatFetchedAt(payload?.fetchedAt || null);
  const asOfText = formatAsOf(activeList?.asOf || null);

  const handleTickerClick = useCallback((symbol: string) => {
    const next = String(symbol || '')
      .trim()
      .toUpperCase();
    if (!next || typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('portfolio-symbol-selected', {
        detail: {
          symbol: next,
          applyToBoth: true,
          source: 'market-screener',
        },
      }),
    );
    window.dispatchEvent(new CustomEvent('focusModule', { detail: 'TechnicalAnalysis' }));
  }, []);

  return (
    <div className="rounded-xl px-3 pb-4 pt-2 sm:px-4 sm:pb-5">
      <div className="mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">Stock Market Screener</h2>
        </div>
      </div>

      <div className="mb-3 overflow-x-auto pb-1">
        <div className="flex w-max min-w-full gap-2">
          {TAB_ORDER.map((key) => {
            const isActive = activeTab === key;
            const title = payload?.lists?.[key]?.title || key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                  isActive
                    ? 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                    : 'border-border/70 bg-background/50 text-foreground hover:border-border hover:bg-muted/40'
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          <p>
            {asOfText} • {fetchedAtText}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by symbol or company"
            className="h-9 w-full rounded-lg border-border/70 bg-background/70 text-sm sm:w-72"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            className="h-9 w-9 shrink-0 rounded-lg"
            aria-label="Refresh screener"
            title="Refresh screener"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </Alert>
      )}

      <div className="md:hidden">
        <div className="max-h-[62vh] space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-card/20 p-2">
          {loading && !payload ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`mobile-skeleton-${index}`}
                className="rounded-lg border border-border/60 bg-background/50 p-3"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
                <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted/40" />
                <div className="mt-3 h-9 w-full animate-pulse rounded bg-muted/40" />
              </div>
            ))
          ) : filteredRows.length > 0 ? (
            filteredRows.map((row) => (
              <div
                key={`${activeTab}-mobile-${row.symbol}`}
                className="rounded-lg border border-border/60 bg-background/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => handleTickerClick(row.symbol)}
                      className="text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                      title="Load in Technical Analysis"
                      aria-label={`Load ${row.symbol} in Technical Analysis`}
                    >
                      {row.symbol}
                    </button>
                    <p className="mt-0.5 line-clamp-1 text-xs text-foreground">{row.name}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {row.exchange || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatPrice(row.price, row.currency)}
                    </p>
                    <p className={`text-xs font-semibold ${toneClass(row.changePercent)}`}>
                      {formatSignedPercent(row.changePercent)}
                    </p>
                    <p className={`text-xs font-semibold ${toneClass(row.change)}`}>
                      {formatSignedPrice(row.change, row.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border/60 bg-card/60 p-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      Volume
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {formatCompactNumber(row.volume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      Rel Vol
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {formatRelativeVolume(row.volume, row.averageVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      Mkt Cap
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {formatCompactNumber(row.marketCap)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-6 text-center text-sm text-muted-foreground">
              No stocks match the current filter.
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="max-h-[560px] overflow-auto rounded-xl border border-border/70 bg-card/20">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-left backdrop-blur">
                  Symbol
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-left backdrop-blur">
                  Company
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-right backdrop-blur">
                  Price
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-right backdrop-blur">
                  % Change
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-right backdrop-blur">
                  Change
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-right backdrop-blur">
                  Volume
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-right backdrop-blur">
                  Rel Vol
                </th>
                <th className="sticky top-0 z-10 bg-muted/70 px-3 py-2 text-right backdrop-blur">
                  Mkt Cap
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !payload ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-border/60">
                    <td className="px-3 py-2" colSpan={8}>
                      <div className="h-5 w-full animate-pulse rounded bg-muted/40" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr
                    key={`${activeTab}-${row.symbol}`}
                    className="border-b border-border/60 transition-colors hover:bg-muted/25"
                  >
                    <td className="px-3 py-2 font-semibold text-foreground">
                      <button
                        type="button"
                        onClick={() => handleTickerClick(row.symbol)}
                        className="font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                        title="Load in Technical Analysis"
                        aria-label={`Load ${row.symbol} in Technical Analysis`}
                      >
                        {row.symbol}
                      </button>
                      <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                        {row.exchange || '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      <p className="line-clamp-1">{row.name}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatPrice(row.price, row.currency)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${toneClass(row.changePercent)}`}
                    >
                      {formatSignedPercent(row.changePercent)}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${toneClass(row.change)}`}>
                      {formatSignedPrice(row.change, row.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatCompactNumber(row.volume)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatRelativeVolume(row.volume, row.averageVolume)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatCompactNumber(row.marketCap)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-muted-foreground" colSpan={8}>
                    No stocks match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
