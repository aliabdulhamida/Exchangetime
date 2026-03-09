'use client';

import { Pencil, RotateCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { fetchStockData as fetchStockDataPortfolio } from '../stock-market/portfolio-tracker';

interface WatchlistMenuProps {
  trigger: (state: { open: boolean }) => React.ReactElement;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type WatchlistEntry = { ticker: string };
type WatchlistRecord = { id: string; title: string; items: WatchlistEntry[] };

const DEFAULT_WATCHLIST: WatchlistEntry[] = [{ ticker: 'AAPL' }, { ticker: 'MSFT' }, { ticker: 'TSLA' }];
const WATCHLISTS_STORAGE_KEY = 'et_watchlists';
const ACTIVE_WATCHLIST_STORAGE_KEY = 'et_active_watchlist_id';
const LEGACY_WATCHLIST_STORAGE_KEY = 'et_watchlist';
const LEGACY_WATCHLIST_TITLE_STORAGE_KEY = 'et_watchlist_title';

function cloneDefaultWatchlist(): WatchlistEntry[] {
  return DEFAULT_WATCHLIST.map((entry) => ({ ticker: entry.ticker }));
}

function normalizeTickerInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 12);
}

function sanitizeWatchlistTitle(raw: unknown): string {
  if (typeof raw !== 'string') return 'Watchlist';
  const trimmed = raw.trim();
  return trimmed || 'Watchlist';
}

function parseStorageJson(key: string): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizeWatchlistItems(raw: unknown): WatchlistEntry[] {
  if (!Array.isArray(raw)) return [];

  const unique = new Set<string>();
  const sanitized: WatchlistEntry[] = [];

  for (const item of raw) {
    const itemRecord = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    const tickerRaw =
      typeof item === 'string'
        ? item
        : itemRecord && typeof itemRecord.ticker === 'string'
          ? itemRecord.ticker
          : '';
    const ticker = normalizeTickerInput(tickerRaw);
    if (!ticker || unique.has(ticker)) continue;
    unique.add(ticker);
    sanitized.push({ ticker });
  }

  return sanitized;
}

function sanitizeWatchlists(raw: unknown): WatchlistRecord[] {
  if (!Array.isArray(raw)) return [];

  const usedIds = new Set<string>();
  const sanitized: WatchlistRecord[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== 'object') continue;
    const itemRecord = item as Record<string, unknown>;

    const idRaw = typeof itemRecord.id === 'string' ? itemRecord.id.trim() : '';
    const baseId = idRaw || `wl_${index + 1}`;
    let id = baseId;
    let suffix = 1;
    while (usedIds.has(id)) {
      id = `${baseId}_${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const title = sanitizeWatchlistTitle(itemRecord.title);
    const items = sanitizeWatchlistItems(itemRecord.items);
    sanitized.push({ id, title, items });
  }

  return sanitized;
}

function loadInitialWatchlists(): WatchlistRecord[] {
  if (typeof window === 'undefined') {
    return [{ id: 'wl_default', title: 'Watchlist', items: cloneDefaultWatchlist() }];
  }

  const storedWatchlists = sanitizeWatchlists(parseStorageJson(WATCHLISTS_STORAGE_KEY));
  if (storedWatchlists.length > 0) return storedWatchlists;

  const legacyItems = sanitizeWatchlistItems(parseStorageJson(LEGACY_WATCHLIST_STORAGE_KEY));
  const legacyTitle = sanitizeWatchlistTitle(window.localStorage.getItem(LEGACY_WATCHLIST_TITLE_STORAGE_KEY));

  return [
    {
      id: 'wl_default',
      title: legacyTitle,
      items: legacyItems.length > 0 ? legacyItems : cloneDefaultWatchlist(),
    },
  ];
}

function loadInitialActiveWatchlistId(watchlists: WatchlistRecord[]): string {
  if (watchlists.length === 0) return 'wl_default';
  if (typeof window === 'undefined') return watchlists[0].id;

  try {
    const stored = window.localStorage.getItem(ACTIVE_WATCHLIST_STORAGE_KEY);
    if (stored && watchlists.some((watchlist) => watchlist.id === stored)) {
      return stored;
    }
  } catch {}

  return watchlists[0].id;
}

function buildWatchlistName(watchlists: WatchlistRecord[]): string {
  const taken = new Set(
    watchlists.map((watchlist) => watchlist.title.trim().toLowerCase()).filter(Boolean),
  );

  let number = watchlists.length + 1;
  let candidate = `Watchlist ${number}`;
  while (taken.has(candidate.toLowerCase())) {
    number += 1;
    candidate = `Watchlist ${number}`;
  }

  return candidate;
}

function makeWatchlistId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `wl_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function buildSparklinePath(points: number[], width: number, height: number): string {
  if (points.length < 2) return '';

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function DaySparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;

  const width = 110;
  const height = 24;
  const isPositive = series[series.length - 1] >= series[0];
  const strokeColor = isPositive ? 'hsl(var(--foreground))' : 'hsl(var(--destructive))';
  const path = buildSparklinePath(series, width, height);

  if (!path) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-6 w-full overflow-visible"
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export default function WatchlistMenu({
  trigger,
  contentClassName = 'et-dropdown-panel min-w-[300px] max-w-[94vw] p-0',
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  open: controlledOpen,
  onOpenChange,
}: WatchlistMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [watchlists, setWatchlists] = useState<WatchlistRecord[]>(() => loadInitialWatchlists());
  const [activeWatchlistId, setActiveWatchlistId] = useState(() =>
    loadInitialActiveWatchlistId(loadInitialWatchlists()),
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [prices, setPrices] = useState<{ [ticker: string]: string }>({});
  const [changes, setChanges] = useState<{ [ticker: string]: number | null }>({});
  const [daySeries, setDaySeries] = useState<{ [ticker: string]: number[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = controlledOpen ?? internalOpen;
  const activeWatchlist =
    watchlists.find((watchlistItem) => watchlistItem.id === activeWatchlistId) ?? watchlists[0];
  const watchlist = activeWatchlist?.items ?? [];
  const activeWatchlistTitle = activeWatchlist?.title ?? 'Watchlist';

  const fetchPrices = useCallback(async () => {
    if (watchlist.length === 0) {
      setPrices({});
      setChanges({});
      setDaySeries({});
      return;
    }

    setLoading(true);
    setError(null);

    const results: { [ticker: string]: string } = {};
    const changesResult: { [ticker: string]: number | null } = {};
    const daySeriesResult: { [ticker: string]: number[] } = {};

    await Promise.all(
      watchlist.map(async (stock) => {
        const dayChartRequest = fetch(
          `/api/quote?symbol=${encodeURIComponent(stock.ticker)}&chart=1&range=1d&interval=5m&includePrePost=false`,
          { cache: 'no-store' },
        );

        try {
          const data = await fetchStockDataPortfolio(stock.ticker);
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1];
            results[stock.ticker] =
              last && last.close !== null && last.close !== undefined
                ? `$${last.close.toFixed(2)}`
                : 'N/A';

            if (data.length > 1 && last && last.close !== null && last.close !== undefined) {
              const prev = data[data.length - 2];
              if (prev && prev.close !== null && prev.close !== undefined && prev.close !== 0) {
                changesResult[stock.ticker] = ((last.close - prev.close) / prev.close) * 100;
              } else {
                changesResult[stock.ticker] = null;
              }
            } else {
              changesResult[stock.ticker] = null;
            }
          } else {
            results[stock.ticker] = 'N/A';
            changesResult[stock.ticker] = null;
          }
        } catch (err) {
          results[stock.ticker] = 'N/A';
          changesResult[stock.ticker] = null;
          setError('Could not fetch stock prices. Please try again later.');
          if (typeof window !== 'undefined') console.error('Price fetch error', stock.ticker, err);
        }

        try {
          const chartResponse = await dayChartRequest;
          if (!chartResponse.ok) return;

          const chartPayload = await chartResponse.json();
          const rawSeries = Array.isArray(chartPayload?.series)
            ? chartPayload.series
            : chartPayload?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;

          if (!Array.isArray(rawSeries)) return;
          const cleaned = rawSeries.filter(
            (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value),
          );
          if (cleaned.length >= 2) {
            daySeriesResult[stock.ticker] = cleaned;
          }
        } catch {}
      }),
    );

    setPrices(results);
    setChanges(changesResult);
    setDaySeries(daySeriesResult);
    setLoading(false);
  }, [watchlist]);

  useEffect(() => {
    if (watchlists.length === 0) return;
    if (!watchlists.some((watchlistItem) => watchlistItem.id === activeWatchlistId)) {
      setActiveWatchlistId(watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(watchlists));
    } catch {}
  }, [watchlists]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(ACTIVE_WATCHLIST_STORAGE_KEY, activeWatchlistId);
    } catch {}
  }, [activeWatchlistId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LEGACY_WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LEGACY_WATCHLIST_TITLE_STORAGE_KEY, activeWatchlistTitle);
    } catch {}
  }, [activeWatchlistTitle]);

  useEffect(() => {
    setShowAdd(false);
    setNewTicker('');
    setInputError(null);
    setEditingTitle(false);
    setTitleDraft(activeWatchlistTitle);
    setPrices({});
    setChanges({});
    setDaySeries({});
  }, [activeWatchlistId, activeWatchlistTitle]);

  useEffect(() => {
    if (watchlist.length === 0) return;

    let isMounted = true;
    fetchPrices().catch((err) => {
      if (typeof window !== 'undefined') console.error('fetchPrices error', err);
    });

    const interval = setInterval(() => {
      if (!isMounted) return;
      fetchPrices().catch((err) => {
        if (typeof window !== 'undefined') console.error('fetchPrices error', err);
      });
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [watchlist.length, fetchPrices]);

  const finishTitleEdit = () => {
    const nextTitle = sanitizeWatchlistTitle(titleDraft);
    setWatchlists((currentWatchlists) =>
      currentWatchlists.map((watchlistItem) =>
        watchlistItem.id === activeWatchlistId ? { ...watchlistItem, title: nextTitle } : watchlistItem,
      ),
    );
    setTitleDraft(nextTitle);
    setEditingTitle(false);
  };

  const handleCreateWatchlist = () => {
    const newWatchlist: WatchlistRecord = {
      id: makeWatchlistId(),
      title: buildWatchlistName(watchlists),
      items: [],
    };

    setWatchlists((currentWatchlists) => [...currentWatchlists, newWatchlist]);
    setActiveWatchlistId(newWatchlist.id);
  };

  const handleDeleteActiveWatchlist = () => {
    if (watchlists.length <= 1 || !activeWatchlist) return;

    const currentIndex = watchlists.findIndex((watchlistItem) => watchlistItem.id === activeWatchlist.id);
    const fallbackId =
      watchlists[currentIndex - 1]?.id ??
      watchlists[currentIndex + 1]?.id ??
      watchlists[0]?.id ??
      'wl_default';

    setWatchlists((currentWatchlists) =>
      currentWatchlists.filter((watchlistItem) => watchlistItem.id !== activeWatchlist.id),
    );
    setActiveWatchlistId(fallbackId);
  };

  const handleAddStock = () => {
    const normalizedTicker = normalizeTickerInput(newTicker.trim());
    if (!normalizedTicker) return;

    if (watchlist.some((entry) => entry.ticker === normalizedTicker)) {
      setInputError(`${normalizedTicker} is already in your watchlist.`);
      return;
    }

    setWatchlists((currentWatchlists) =>
      currentWatchlists.map((watchlistItem) =>
        watchlistItem.id === activeWatchlistId
          ? { ...watchlistItem, items: [...watchlistItem.items, { ticker: normalizedTicker }] }
          : watchlistItem,
      ),
    );
    setNewTicker('');
    setInputError(null);
    setShowAdd(false);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        if (controlledOpen === undefined) {
          setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger({ open })}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={contentClassName}
      >
        <div className="overflow-hidden rounded-[inherit]">
          <div className="border-b border-border/70 bg-card/70 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                {editingTitle ? (
                  <input
                    type="text"
                    className="w-full min-w-[120px] border-b border-border bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={finishTitleEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishTitleEdit();
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="truncate text-sm font-semibold text-foreground" title="Watchlist title">
                      {activeWatchlistTitle}
                    </span>
                    <button
                      type="button"
                      className="et-module-action h-7 w-7"
                      title="Edit watchlist title"
                      aria-label="Edit watchlist title"
                      onClick={() => {
                        setTitleDraft(activeWatchlistTitle);
                        setEditingTitle(true);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  fetchPrices().catch((err) => {
                    if (typeof window !== 'undefined') console.error('fetchPrices error', err);
                  });
                }}
                title="Reload prices"
                aria-label="Reload prices"
                disabled={loading}
                className="et-module-action h-7 w-7 disabled:opacity-60"
              >
                <RotateCw className={`h-4 w-4${loading ? ' animate-spin' : ''}`} />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {watchlist.length} {watchlist.length === 1 ? 'symbol' : 'symbols'}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <select
                value={activeWatchlistId}
                onChange={(event) => setActiveWatchlistId(event.target.value)}
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none transition focus:border-primary"
                aria-label="Select watchlist"
              >
                {watchlists.map((watchlistItem) => (
                  <option key={watchlistItem.id} value={watchlistItem.id}>
                    {watchlistItem.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground transition hover:bg-secondary/50"
                onClick={handleCreateWatchlist}
              >
                New
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleDeleteActiveWatchlist}
                disabled={watchlists.length <= 1}
              >
                Delete
              </button>
            </div>
          </div>

          {error && <p className="border-b border-border/60 px-3.5 py-2 text-xs text-red-500">{error}</p>}

          <div className="et-scrollbar max-h-[50vh] overflow-y-auto px-2.5 py-2">
            {watchlist.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                No stocks in watchlist.
              </div>
            ) : (
              <div className="space-y-2">
                {watchlist.map((stock, idx) => {
                  const tickerPrice = prices[stock.ticker];
                  const tickerChange = changes[stock.ticker];
                  const hasTickerChange = typeof tickerChange === 'number' && Number.isFinite(tickerChange);

                  return (
                    <div
                      key={stock.ticker + idx}
                      className="rounded-lg border border-border/70 bg-card/60 px-2.5 py-2 transition-colors hover:border-border hover:bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-[58px] items-center rounded-md bg-secondary/50 px-1.5 py-0.5 text-xs font-semibold text-foreground">
                          {stock.ticker}
                        </span>
                        <span className="ml-auto text-right font-mono text-xs text-foreground">
                          {loading ? (
                            <span className="text-muted-foreground">...</span>
                          ) : tickerPrice !== undefined ? (
                            <>
                              {tickerPrice}
                              {hasTickerChange && (
                                <span
                                  className={
                                    tickerChange > 0
                                      ? 'ml-2 font-medium text-emerald-600 dark:text-emerald-400'
                                      : tickerChange < 0
                                        ? 'ml-2 font-medium text-red-500'
                                        : 'ml-2 text-muted-foreground'
                                  }
                                >
                                  {tickerChange > 0 ? '+' : ''}
                                  {tickerChange.toFixed(2)}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">...</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="et-module-action et-module-action-danger h-7 w-7"
                          title={`Delete ${stock.ticker}`}
                          aria-label={`Delete ${stock.ticker}`}
                          onClick={() => {
                            setWatchlists((currentWatchlists) =>
                              currentWatchlists.map((watchlistItem) =>
                                watchlistItem.id === activeWatchlistId
                                  ? {
                                      ...watchlistItem,
                                      items: watchlistItem.items.filter((_, itemIndex) => itemIndex !== idx),
                                    }
                                  : watchlistItem,
                              ),
                            );
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {daySeries[stock.ticker] ? (
                        <div className="mt-2 rounded-md bg-secondary/30 px-2 py-1">
                          <DaySparkline series={daySeries[stock.ticker]} />
                        </div>
                      ) : loading ? (
                        <div className="mt-2 h-6 animate-pulse rounded-md bg-secondary/35" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/70 bg-card/50 px-3.5 pb-3 pt-2.5">
            {showAdd ? (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAddStock();
                }}
              >
                <input
                  type="text"
                  placeholder="Ticker"
                  className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs uppercase text-foreground outline-none transition focus:border-primary"
                  value={newTicker}
                  onChange={(e) => {
                    setNewTicker(normalizeTickerInput(e.target.value));
                    if (inputError) setInputError(null);
                  }}
                  autoFocus
                />
                {inputError && <p className="text-xs text-red-500">{inputError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-md border border-border bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-90"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-secondary/50"
                    onClick={() => {
                      setShowAdd(false);
                      setNewTicker('');
                      setInputError(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="w-full rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                onClick={() => {
                  setInputError(null);
                  setShowAdd(true);
                }}
              >
                Add stock
              </button>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
