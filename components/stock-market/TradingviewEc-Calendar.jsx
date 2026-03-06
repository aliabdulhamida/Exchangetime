import React, { memo, useEffect, useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';

const REGION_PRESETS = {
  global: { label: 'Global', countries: '' },
  us: { label: 'US Focus', countries: 'USD,CAD,MXN' },
  europe: { label: 'Europe Focus', countries: 'EUR,GBP,CHF,SEK,NOK' },
  asia: { label: 'Asia Focus', countries: 'JPY,CNY,AUD,NZD,SGD,HKD,INR' },
};

const IMPACT_PRESETS = {
  medhigh: 'Medium + High',
  high: 'High only',
  all: 'All events',
};

const RANGE_PRESETS = {
  week: 'Next 7 days',
  '24h': 'Next 24h',
  today: 'Today',
  all: 'All in feed',
};

function impactClass(impact) {
  if (impact === 'High')
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
  if (impact === 'Medium')
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  if (impact === 'Low') return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

function formatSourceDate(dateString, timeString) {
  const dateMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!dateMatch) return `${dateString} ${timeString}`.trim();
  const [, month, day, year] = dateMatch;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  const humanDate = parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${humanDate} • ${timeString}`;
}

function TradingviewEcCalendar() {
  const [region, setRegion] = useState('global');
  const [impact, setImpact] = useState('high');
  const [range, setRange] = useState('week');
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [fetchedAt, setFetchedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchCalendar = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          impact,
          range,
          limit: '140',
        });
        const countries = REGION_PRESETS[region]?.countries ?? '';
        if (countries) params.set('countries', countries);

        const response = await fetch(`/api/economic-calendar?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          const detail = payload?.error ? `: ${payload.error}` : '';
          throw new Error(`Calendar request failed (${response.status})${detail}`);
        }
        if (!active) return;
        if (payload?.error && (!Array.isArray(payload.events) || payload.events.length === 0)) {
          setError(String(payload.error));
        }
        setEvents(Array.isArray(payload.events) ? payload.events : []);
        setFetchedAt(payload.fetchedAt || '');
      } catch (fetchError) {
        if (!active || fetchError?.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load calendar');
        setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCalendar();
    return () => {
      active = false;
      controller.abort();
    };
  }, [impact, range, region, reloadKey]);

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return events;
    return events.filter((event) => {
      const haystack = `${event.title} ${event.country} ${event.impact}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [events, query]);
  const activeFilterCount =
    (region !== 'global' ? 1 : 0) +
    (impact !== 'high' ? 1 : 0) +
    (range !== 'week' ? 1 : 0) +
    (query.trim().length > 0 ? 1 : 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>{loading ? 'Loading events...' : `${visibleEvents.length} events`}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-[11px] font-medium text-foreground transition hover:bg-muted"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded bg-muted px-1 py-0 text-[10px]">{activeFilterCount}</span>
            )}
          </button>
          <span>{fetchedAt ? `Updated ${new Date(fetchedAt).toLocaleTimeString()}` : 'Live feed'}</span>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            disabled={loading}
            className="h-7 rounded border border-border bg-background px-2 text-[11px] font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reload
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="rounded-md border border-border/70 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Event Filters
            </span>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRegion('global');
                    setImpact('high');
                    setRange('week');
                    setQuery('');
                  }}
                  className="h-7 rounded border border-border bg-background px-2 text-[11px] font-medium text-foreground transition hover:bg-muted"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-foreground transition hover:bg-muted"
                aria-label="Close filters"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Region</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              >
                {Object.entries(REGION_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Impact</span>
              <select
                value={impact}
                onChange={(event) => setImpact(event.target.value)}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              >
                {Object.entries(IMPACT_PRESETS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Range</span>
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              >
                {Object.entries(RANGE_PRESETS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
                placeholder="Event, country..."
              />
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="et-scrollbar min-h-[260px] flex-1 overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-border/70 bg-background/60 pr-1 [webkit-overflow-scrolling:touch] sm:min-h-[360px] lg:min-h-0">
        {visibleEvents.length === 0 && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No events found.
          </div>
        ) : (
          <div className="space-y-2 p-2 sm:p-3">
            {visibleEvents.map((event, index) => (
              <div
                key={`${event.url}-${index}`}
                className="rounded-lg border border-border/70 bg-card/40 p-3 sm:p-4"
              >
                <div className="sm:grid sm:grid-cols-[1fr_13rem] sm:items-start sm:gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold tracking-wide text-foreground/90">
                        {event.country}
                      </span>
                      <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
                      <span>{formatSourceDate(event.date, event.time)}</span>
                    </div>
                    <div
                      className={`mt-2 inline-flex w-fit items-center rounded border px-2 py-0.5 text-[11px] font-medium ${impactClass(event.impact)}`}
                    >
                      {event.impact}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:w-[13rem]">
                    <div
                      className="col-span-2 rounded-md border border-border/70 bg-background/60 px-2.5 py-2"
                    >
                      <p className="text-sm leading-5 text-foreground">{event.title}</p>
                    </div>
                    <div className="rounded-md border border-border/70 bg-background/60 px-2.5 py-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Forecast
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {event.forecast || '-'}
                      </div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-background/60 px-2.5 py-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Previous
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {event.previous || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default memo(TradingviewEcCalendar);
