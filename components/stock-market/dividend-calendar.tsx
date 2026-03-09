'use client';

import { CalendarX, ChevronLeft, ChevronRight, Filter, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

const STORAGE_KEY = 'dividendCalendarData:v4';

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const [dividendData, setDividendData] = useState<Record<string, DividendCalendarItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    ticker: '',
    minYield: '',
    market: '',
    exchange: '',
    instrumentType: '',
    currency: '',
  });
  const didAutoAlignWeekRef = useRef(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const selectedDate = weekDates[selectedDayIdx];
  const selectedKey = toLocalDateKey(selectedDate);
  const items = dividendData[selectedKey] || [];
  const allItems = Object.values(dividendData).flat();

  const fetchDividends = async (forceRefresh = false) => {
    const shouldForceRefresh = forceRefresh === true;
    setLoading(true);
    try {
      const endpoint = shouldForceRefresh ? '/api/dividends?refresh=1' : '/api/dividends';
      const response = await fetch(endpoint);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          data && typeof data === 'object' && 'error' in data
            ? String((data as Record<string, unknown>).error || '')
            : '';
        throw new Error(detail || 'Failed to load dividend calendar');
      }
      if (!data || typeof data !== 'object' || Array.isArray(data) || 'error' in data) {
        throw new Error('Invalid dividend calendar payload');
      }
      setDividendData(data as Record<string, DividendCalendarItem[]>);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setError('');
    } catch (fetchError) {
      const message =
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : 'Failed to load dividend calendar';
      setError(message);
      // Keep existing on-screen data if refresh fails.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setDividendData(parsed as Record<string, DividendCalendarItem[]>);
        }
      } catch {
        // Ignore invalid cache and fetch fresh data below.
      }
    }
    fetchDividends(false);
  }, []);

  useEffect(() => {
    if (didAutoAlignWeekRef.current) return;
    const availableDateKeys = Object.keys(dividendData)
      .filter((key) => Array.isArray(dividendData[key]) && dividendData[key].length > 0)
      .sort();
    if (availableDateKeys.length === 0) return;

    const initialWeekHasData = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + idx);
      return toLocalDateKey(date);
    }).some((dateKey) => Array.isArray(dividendData[dateKey]) && dividendData[dateKey].length > 0);

    if (!initialWeekHasData) {
      const firstDate = new Date(`${availableDateKeys[0]}T00:00:00`);
      if (!Number.isNaN(firstDate.getTime())) {
        setWeekStart(toWeekStart(firstDate));
        setSelectedDayIdx((firstDate.getDay() + 6) % 7);
      }
    }

    didAutoAlignWeekRef.current = true;
  }, [dividendData, weekStart]);

  useEffect(() => {
    const selectedDate = new Date(weekStart);
    selectedDate.setDate(weekStart.getDate() + selectedDayIdx);
    const selectedDateKey = toLocalDateKey(selectedDate);
    if (Array.isArray(dividendData[selectedDateKey]) && dividendData[selectedDateKey].length > 0) return;

    for (let idx = 0; idx < 7; idx += 1) {
      const weekDate = new Date(weekStart);
      weekDate.setDate(weekStart.getDate() + idx);
      const weekDateKey = toLocalDateKey(weekDate);
      if (Array.isArray(dividendData[weekDateKey]) && dividendData[weekDateKey].length > 0) {
        if (idx !== selectedDayIdx) setSelectedDayIdx(idx);
        return;
      }
    }
  }, [dividendData, weekStart, selectedDayIdx]);

  const minYield = Number(filters.minYield);
  const hasMinYield = filters.minYield.trim() !== '' && Number.isFinite(minYield);

  const marketOptions = [...new Set(allItems.map((item) => String(item.market || '').trim()).filter(Boolean))]
    .sort();
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
    if (filters.ticker && !item.symbol.toLowerCase().includes(filters.ticker.toLowerCase())) return false;
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

  return (
    <div className="flex h-full min-h-0 flex-col px-1 pb-1 sm:px-2 sm:pb-2">
      <div className="mb-3 flex items-center justify-between pr-16 sm:mb-4 sm:pr-20">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">Dividend Calendar</h2>
      </div>

      <div className="mb-2 flex items-center justify-center gap-2 text-center">
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
          Calendar Week {getISOWeek(selectedDate)}
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

      <div className="mb-4 overflow-x-auto pb-1">
        <div className="mx-auto flex w-max gap-2 px-1 sm:gap-3">
          {weekDates.map((date, idx) => {
            const isSelected = selectedDayIdx === idx;
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex min-w-[42px] flex-col items-center justify-center rounded-md border px-2 py-1.5 text-sm font-semibold transition-all duration-150 sm:min-w-[46px] ${
                  isSelected
                    ? 'scale-[1.02] border-white text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)]'
                    : 'border-border text-foreground hover:bg-muted/40'
                }`}
              >
                <span className="text-base font-bold">{date.getDate()}</span>
                <span className="mt-0.5 text-[11px] font-medium">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
            onClick={() => fetchDividends(true)}
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
          {filteredItems.length} entries
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

      {error ? (
        <div className="mb-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="flex min-h-[80px] flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
          <CalendarX className="mb-1 h-5 w-5" />
          <span className="block text-center">No dividend ex-dates scheduled.</span>
        </div>
      ) : (
        <div className="et-scrollbar min-h-[260px] flex-1 space-y-3 overflow-y-auto pr-1 sm:min-h-[360px] sm:pr-2 lg:min-h-0">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.symbol}-${item.exDate}-${idx}`}
              className="w-full rounded-lg border border-border px-3 py-3 transition-shadow duration-200 hover:shadow-md sm:px-4 sm:py-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-lg font-bold tracking-wide text-foreground sm:text-xl">
                  {item.symbol}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{item.company}</p>
              {[
                item.exchange,
                item.instrumentType,
                item.currency,
                item.market,
              ].some((value) => value && String(value).trim().length > 0) && (
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
