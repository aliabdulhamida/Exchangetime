import { ChevronRight, Pencil, RotateCw, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import TuneInRadioButton from './tunein-radio-button';
import { fetchStockData as fetchStockDataPortfolio } from '../stock-market/portfolio-tracker';
import TradingViewNews from '../stock-market/TradingViewNews';

const FearGreedIndex = dynamic(() => import('@/components/stock-market/fear-greed-index'), {
  ssr: false,
});

const triggerClass =
  'et-nav-pill inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs font-semibold sm:px-3';

export default function TopNav() {
  const [watchlist, setWatchlist] = useState<{ ticker: string }[]>(() => {
    if (typeof window === 'undefined') {
      return [{ ticker: 'AAPL' }, { ticker: 'MSFT' }, { ticker: 'TSLA' }];
    }

    try {
      const raw = window.localStorage.getItem('et_watchlist');
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === 'object' && typeof item.ticker === 'string')
        ) {
          return parsed;
        }
      }
    } catch {}

    return [{ ticker: 'AAPL' }, { ticker: 'MSFT' }, { ticker: 'TSLA' }];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [watchlistTitle, setWatchlistTitle] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('et_watchlist_title');
      if (stored && typeof stored === 'string') return stored;
    }
    return 'Watchlist';
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [prices, setPrices] = useState<{ [ticker: string]: string }>({});
  const [changes, setChanges] = useState<{ [ticker: string]: number | null }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results: { [ticker: string]: string } = {};
    const changesResult: { [ticker: string]: number | null } = {};

    await Promise.all(
      watchlist.map(async (stock) => {
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
      }),
    );

    setPrices(results);
    setChanges(changesResult);
    setLoading(false);
  }, [watchlist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('et_watchlist', JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('et_watchlist_title', watchlistTitle);
    } catch {}
  }, [watchlistTitle]);

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

  const handleAddStock = () => {
    if (!newTicker.trim()) return;
    setWatchlist([...watchlist, { ticker: newTicker.trim().toUpperCase() }]);
    setNewTicker('');
    setShowAdd(false);
  };

  return (
    <>
      <nav className="flex h-full items-center justify-between gap-3 px-3 sm:px-5 lg:pl-[17rem]">
        <div className="et-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pl-12 lg:pl-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`${triggerClass} mr-1`}>
                <span>Watchlist</span>
                <ChevronRight size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="et-dropdown-panel min-w-[250px] max-w-[92vw] p-0"
            >
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-1">
                    {editingTitle ? (
                      <input
                        type="text"
                        className="w-full min-w-[90px] border-b border-border/80 bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                        value={watchlistTitle}
                        onChange={(e) => setWatchlistTitle(e.target.value)}
                        onBlur={() => setEditingTitle(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingTitle(false);
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span
                          className="truncate text-sm font-semibold text-foreground"
                          title="Watchlist title"
                        >
                          {watchlistTitle}
                        </span>
                        <button
                          type="button"
                          className="et-module-action h-7 w-7"
                          title="Edit watchlist title"
                          aria-label="Edit watchlist title"
                          onClick={() => setEditingTitle(true)}
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

                {error && <span className="text-xs text-red-500">{error}</span>}

                {watchlist.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                    No stocks in watchlist.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {watchlist.map((stock, idx) => (
                      <div key={stock.ticker + idx} className="rounded-lg hover:bg-secondary/60">
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <button
                            className="et-module-action et-module-action-danger h-7 w-7"
                            title={`Delete ${stock.ticker}`}
                            aria-label={`Delete ${stock.ticker}`}
                            onClick={() => {
                              setWatchlist(watchlist.filter((_, i) => i !== idx));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <span className="text-sm font-semibold">{stock.ticker}</span>
                          <div className="flex-1" />
                          <span className="flex min-w-[72px] flex-col items-end text-right font-mono text-xs text-foreground">
                            {loading ? (
                              <span className="text-muted-foreground">...</span>
                            ) : prices[stock.ticker] !== undefined ? (
                              <>
                                {prices[stock.ticker]}
                                {changes[stock.ticker] !== undefined &&
                                changes[stock.ticker] !== null &&
                                !isNaN(changes[stock.ticker] as number) ? (
                                  <span
                                    className={
                                      changes[stock.ticker]! > 0
                                        ? 'text-foreground'
                                        : changes[stock.ticker]! < 0
                                          ? 'text-red-500'
                                          : 'text-muted-foreground'
                                    }
                                  >
                                    {changes[stock.ticker]! > 0 ? '+' : ''}
                                    {changes[stock.ticker]!.toFixed(2)}%
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-muted-foreground">...</span>
                            )}
                          </span>
                        </div>
                        <div className="mx-2 h-px bg-border/70" />
                      </div>
                    ))}
                  </div>
                )}

                {showAdd ? (
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Ticker"
                      className="w-full rounded-lg border border-border/90 bg-card px-2.5 py-1.5 text-xs uppercase text-foreground outline-none transition focus:border-primary"
                      value={newTicker.toUpperCase()}
                      onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-border bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-90"
                        onClick={handleAddStock}
                      >
                        Add
                      </button>
                      <button
                        className="rounded-lg border border-border/90 bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                        onClick={() => {
                          setShowAdd(false);
                          setNewTicker('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="mt-1 inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                    onClick={() => setShowAdd(true)}
                  >
                    <span>+</span> Add stock
                  </button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={triggerClass}>
                <span>News</span>
                <ChevronRight size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="et-dropdown-panel min-w-[240px] max-w-[95vw] p-2 sm:max-w-xl md:max-w-2xl"
            >
              <div className="h-[350px] w-full overflow-hidden rounded-xl sm:h-[500px]">
                <TradingViewNews />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-full border border-border bg-card px-2 py-0.5">
            <FearGreedIndex />
          </div>
        </div>
      </nav>
      <TuneInRadioButton />
    </>
  );
}
