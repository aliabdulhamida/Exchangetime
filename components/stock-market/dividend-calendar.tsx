'use client';

import { CalendarX, ChevronLeft, ChevronRight, Filter, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CalendarDateJump, CalendarWeekStrip, ToolEmptyState } from '@/components/exchangetime/tool-ui';
import { useCalendarFeed } from '@/components/exchangetime/use-calendar-feed';
import { calendarEmptyMessage, localCalendarKey as toLocalDateKey } from '@/lib/calendar-view';

type DividendCalendarItem = {
  symbol: string;
  company: string;
  exDate: string;
  forwardYieldPct: number | null;
  source: 'upcoming_exdates';
  market: string;
  exchange: string;
  instrumentType: string;
  currency: string;
  declarationDate: string;
  recordDate: string;
  paymentDate: string;
};

function toWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function formatYield(yieldPct: number | null): string {
  if (yieldPct === null || !Number.isFinite(yieldPct)) return '–';
  return `${yieldPct.toFixed(2)}%`;
}

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() === 0 ? 7 : d.getUTCDay()));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function DividendCalendar() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState<Date>(() => toWeekStart(today));
  const [selectedDayIdx, setSelectedDayIdx] = useState((today.getDay() + 6) % 7);
  const {
    data: dividendData,
    loading: loading,
    notice,
    retrieved,
    refresh,
  } = useCalendarFeed<DividendCalendarItem>('/api/dividends');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    ticker: '',
    minYield: '',
    market: '',
    exchange: '',
    instrumentType: '',
    currency: '',
  });

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const selectedDate = weekDates[selectedDayIdx];
  const selectedKey = toLocalDateKey(selectedDate);
  const items = dividendData[selectedKey] || [];
  const allItems = Object.values(dividendData).flat();

  const minYield = Number(filters.minYield);
  const hasMinYield = filters.minYield.trim() !== '' && Number.isFinite(minYield);

  const marketOptions = [
    ...new Set(allItems.map((item) => String(item.market || '').trim()).filter(Boolean)),
  ].sort();
  const exchangeOptions = [
    ...new Set(allItems.map((item) => String(item.exchange || '').trim()).filter(Boolean)),
  ].sort();
  const instrumentTypeOptions = [
    ...new Set(allItems.map((item) => String(item.instrumentType || '').trim()).filter(Boolean)),
  ].sort();
  const currencyOptions = [
    ...new Set(allItems.map((item) => String(item.currency || '').trim()).filter(Boolean)),
  ].sort();

  const filteredItems = items.filter((item) => {
    if (filters.ticker && !item.symbol.toLowerCase().includes(filters.ticker.trim().toLowerCase()))
      return false;
    if (hasMinYield) {
      if (item.forwardYieldPct === null) return false;
      if (item.forwardYieldPct < minYield) return false;
    }
    if (filters.market && item.market !== filters.market) return false;
    if (filters.exchange && item.exchange !== filters.exchange) return false;
    if (filters.instrumentType && item.instrumentType !== filters.instrumentType) return false;
    if (filters.currency && item.currency !== filters.currency) return false;
    return true;
  });

  const empty = calendarEmptyMessage(loading, notice, Object.hasOwn(dividendData, selectedKey), items.length);
  return (
    <div className="calendar-workspace flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between pr-16 sm:mb-4 sm:pr-20">
        <p className="workspace-source" role="status">
          Source: Nasdaq · Calendar feed ·{' '}
          {retrieved
            ? 'Retrieved ' + new Date(retrieved).toLocaleString()
            : 'Retrieval time unavailable'}
          {notice && ' · ' + notice}
        </p>
      </div>

      <div className="calendar-period mb-2 flex items-center justify-center gap-2 text-center">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label="Previous week"
          onClick={() =>
            setWeekStart((prev) => {
              const next = new Date(prev);
              next.setDate(prev.getDate() - 7);
              return next;
            })
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          Week {getISOWeek(selectedDate)} · {selectedDate.toLocaleDateString('en-GB', {month: 'short', year: 'numeric'})}
        </h3>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label="Next week"
          onClick={() =>
            setWeekStart((prev) => {
              const next = new Date(prev);
              next.setDate(prev.getDate() + 7);
              return next;
            })
          }
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <CalendarDateJump date={selectedDate} onSelect={date => {setWeekStart(toWeekStart(date)); setSelectedDayIdx((date.getDay() + 6) % 7);}} />
      <CalendarWeekStrip dates={weekDates} selected={selectedDayIdx} onSelect={setSelectedDayIdx} />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent transition-all duration-150 hover:bg-muted/40"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="Filter dividend calendar"
          >
            <Filter className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={refresh}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            title={loading ? 'Loading dividend data...' : 'Reload dividend data'}
            aria-label="Reload dividend data"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {filterOpen && (
            <div className="animate-fade-in absolute left-0 top-full z-20 mt-2 w-[min(92vw,300px)] rounded-lg border border-border bg-card p-4 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <div className="text-base font-semibold text-foreground">Filters</div>
                <button
                  className="ml-auto rounded p-1 hover:bg-muted"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  className="h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
                  value={filters.ticker}
                  onChange={(e) => setFilters((f) => ({ ...f, ticker: e.target.value }))}
                  placeholder="Ticker"
                />
                <input
                  type="number"
                  className="h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
                  value={filters.minYield}
                  onChange={(e) => setFilters((f) => ({ ...f, minYield: e.target.value }))}
                  placeholder="Min yield %"
                />
                <select
                  className="h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
                  value={filters.market}
                  onChange={(e) => setFilters((f) => ({ ...f, market: e.target.value }))}
                >
                  <option value="">Market (All)</option>
                  {marketOptions.map((market) => (
                    <option key={market} value={market}>
                      {market.toUpperCase()}
                    </option>
                  ))}
                </select>
                <select
                  className="h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
                  value={filters.exchange}
                  onChange={(e) => setFilters((f) => ({ ...f, exchange: e.target.value }))}
                >
                  <option value="">Exchange (All)</option>
                  {exchangeOptions.map((exchange) => (
                    <option key={exchange} value={exchange}>
                      {exchange}
                    </option>
                  ))}
                </select>
                <select
                  className="h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
                  value={filters.instrumentType}
                  onChange={(e) => setFilters((f) => ({ ...f, instrumentType: e.target.value }))}
                >
                  <option value="">Security Type (All)</option>
                  {instrumentTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  className="h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
                  value={filters.currency}
                  onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="">Currency (All)</option>
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-between gap-2">
                <button
                  className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted/40"
                  onClick={() =>
                    setFilters({
                      ticker: '',
                      minYield: '',
                      market: '',
                      exchange: '',
                      instrumentType: '',
                      currency: '',
                    })
                  }
                >
                  <X className="h-3 w-3" /> Reset
                </button>
                <button
                  className="rounded border border-white bg-white px-2 py-1 text-xs text-black"
                  onClick={() => setFilterOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-foreground">
          {filteredItems.length} of {items.length} entries
        </span>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease;
        }
      `}</style>

      {filteredItems.length === 0 ? (
        <ToolEmptyState
          icon={<CalendarX size={25} strokeWidth={1.5} />}
          title={empty.title}
          description={empty.description}
          action={items.length ? <button type="button" className="terminal-button" onClick={() =>
            setFilters({ticker: '', minYield: '', market: '', exchange: '', instrumentType: '', currency: ''})}>Clear filters</button>
            : notice && !loading ? <button type="button" className="terminal-button" onClick={refresh}>Retry calendar</button> : undefined}
        />
      ) : (
        <div className="et-scrollbar min-h-[260px] flex-1 space-y-3 overflow-y-auto pr-1 sm:min-h-[360px] sm:pr-2 lg:min-h-0">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.symbol}-${item.exDate}-${idx}`}
              className="w-full rounded-lg border border-border px-3 py-3 transition-shadow duration-200 hover:shadow-md sm:px-4 sm:py-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-lg font-bold tracking-wide text-foreground sm:text-xl">
                  <Link
                    href={'/dashboard?view=StockAnalysis&symbol=' + encodeURIComponent(item.symbol)}
                  >
                    {item.symbol} ↗
                  </Link>
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{item.company}</p>
              {[item.exchange, item.instrumentType, item.currency, item.market].some(
                (value) => value && String(value).trim().length > 0,
              ) && (
                <p className="mb-3 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  {[item.exchange, item.instrumentType, item.currency, item.market]
                    .filter((value) => value && String(value).trim().length > 0)
                    .join(' • ')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground">Ex-Date</span>
                  <span className="text-sm font-semibold text-foreground">{item.exDate}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground">Forward Yield</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatYield(item.forwardYieldPct)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
