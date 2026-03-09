'use client';

import { CalendarX, Menu, Filter, Clock, BarChart2, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

type EarningsCalendarItem = {
  symbol: string;
  company: string;
  hour: 'bmo' | 'amc' | '';
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  marketCap: string;
  fiscalQuarterEnding: string;
  lastYearReportDate: string;
  lastYearEPS: number | null;
  numberOfEstimates: number | null;
  currency: string;
  market: string;
  instrumentType: string;
  exchange: string;
};

const STORAGE_KEY = 'earningsData:v3';

function sanitizePlaceholderMetrics(
  data: Record<string, EarningsCalendarItem[]>,
): Record<string, EarningsCalendarItem[]> {
  const next: Record<string, EarningsCalendarItem[]> = {};
  for (const [dateKey, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) {
      next[dateKey] = [];
      continue;
    }
    next[dateKey] = rows.map((row) => {
      if (!row || typeof row !== 'object') return row;
      const epsEstimate = (row as EarningsCalendarItem).epsEstimate;
      const epsActual = (row as EarningsCalendarItem).epsActual;
      const revenueEstimate = (row as EarningsCalendarItem).revenueEstimate;
      const revenueActual = (row as EarningsCalendarItem).revenueActual;
      const isMissingEpsActual =
        epsActual === null || epsActual === undefined || String(epsActual).trim() === '';
      const isMissingRevenueEstimate =
        revenueEstimate === null || revenueEstimate === undefined || String(revenueEstimate).trim() === '';
      const isMissingRevenueActual =
        revenueActual === null || revenueActual === undefined || String(revenueActual).trim() === '';
      if (
        epsEstimate === 0 &&
        isMissingEpsActual &&
        isMissingRevenueEstimate &&
        isMissingRevenueActual
      ) {
        return { ...row, epsEstimate: null };
      }
      return row;
    });
  }
  return next;
}

export default function EarningsCalendar() {
  // Helper to determine border color for earnings card
  function getBorderColor(item: any) {
    const hasActuals =
      item.epsActual !== undefined &&
      item.epsActual !== null &&
      item.epsActual !== '' &&
      item.revenueActual !== undefined &&
      item.revenueActual !== null &&
      item.revenueActual !== '';
    if (hasActuals) {
      const epsActual = parseFloat(item.epsActual);
      const epsEstimate = parseFloat(item.epsEstimate);
      const revActual = parseFloat(item.revenueActual);
      const revEstimate = parseFloat(item.revenueEstimate);
      if (!isNaN(epsActual) && !isNaN(epsEstimate) && !isNaN(revActual) && !isNaN(revEstimate)) {
        if (epsActual >= epsEstimate && revActual >= revEstimate) {
          return 'border-green-500';
        } else if (epsActual < epsEstimate && revActual < revEstimate) {
          return 'border-red-500';
        }
      }
    }
    return 'border-border';
  }
  // Helper to format EPS to 2 decimal places
  function formatEPS(num: number | null | undefined): string {
    if (num === null || num === undefined || isNaN(Number(num))) return '–';
    return Number(num).toFixed(2);
  }
  // Helper to format hour
  function formatHour(hour: string | null | undefined): string {
    if (!hour) return '–';
    const h = hour.toLowerCase();
    if (h === 'amc') return 'After Market';
    if (h === 'bmo') return 'Pre Market';
    return hour;
  }
  // Helper to format large numbers with K/M/B
  function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined || isNaN(Number(num))) return '–';
    num = Number(num);
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
  }
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

  const today = new Date();
  const [weekStart, setWeekStart] = useState<Date>(() => toWeekStart(today));
  const [selectedDayIdx, setSelectedDayIdx] = useState((today.getDay() + 6) % 7);
  const didAutoAlignWeekRef = useRef(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const selectedDate = weekDates[selectedDayIdx];
  const [earningsData, setEarningsData] = useState<Record<string, EarningsCalendarItem[]>>({});
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // Fetch earnings data from API and store in localStorage
  const fetchEarnings = useCallback(async (forceRefresh = false) => {
    const shouldForceRefresh = forceRefresh === true;
    setLoadingEarnings(true);
    try {
      const res = await fetch(
        shouldForceRefresh ? '/api/earnings-calendar?refresh=1' : '/api/earnings-calendar',
      );
      if (!res.ok) throw new Error('Failed to load earnings calendar');
      const data = await res.json();
      if (!data || typeof data !== 'object' || Array.isArray(data) || 'error' in data) {
        throw new Error('Invalid earnings calendar payload');
      }
      const sanitizedData = sanitizePlaceholderMetrics(
        data as Record<string, EarningsCalendarItem[]>,
      );
      setEarningsData(sanitizedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedData));
    } catch {
      // Keep existing on-screen data if refresh fails.
    } finally {
      setLoadingEarnings(false);
    }
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const sanitized = sanitizePlaceholderMetrics(
            parsed as Record<string, EarningsCalendarItem[]>,
          );
          setEarningsData(sanitized);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        }
      } catch {
        // Ignore invalid cache and fetch fresh data below.
      }
    }
    fetchEarnings(false);
  }, [fetchEarnings]);

  useEffect(() => {
    if (didAutoAlignWeekRef.current) return;
    if (!earningsData || typeof earningsData !== 'object') return;

    const availableDateKeys = Object.keys(earningsData)
      .filter((key) => Array.isArray(earningsData[key]) && earningsData[key].length > 0)
      .sort();
    if (availableDateKeys.length === 0) return;

    const initialWeekHasData = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + idx);
      return toLocalDateKey(date);
    }).some((dateKey) => Array.isArray(earningsData[dateKey]) && earningsData[dateKey].length > 0);

    if (!initialWeekHasData) {
      const firstDate = new Date(`${availableDateKeys[0]}T00:00:00`);
      if (!Number.isNaN(firstDate.getTime())) {
        setWeekStart(toWeekStart(firstDate));
        setSelectedDayIdx((firstDate.getDay() + 6) % 7);
      }
    }

    didAutoAlignWeekRef.current = true;
  }, [earningsData, weekStart]);

  const selectedKey = toLocalDateKey(weekDates[selectedDayIdx]);
  const items = earningsData[selectedKey] || [];
  const allItems = Object.values(earningsData).flat();

  // Filter menu state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    ticker: '',
    session: '',
    epsForecast: '',
    market: '',
    exchange: '',
    instrumentType: '',
    reportState: '',
  });

  const marketOptions = [...new Set(allItems.map((item) => String(item.market || '').trim()).filter(Boolean))]
    .sort();
  const exchangeOptions = [...new Set(allItems.map((item) => String(item.exchange || '').trim()).filter(Boolean))]
    .sort();
  const instrumentTypeOptions = [
    ...new Set(allItems.map((item) => String(item.instrumentType || '').trim()).filter(Boolean)),
  ].sort();

  function epsForecastMatches(itemEPS: number | null, filter: string) {
    if (itemEPS === undefined || itemEPS === null || Number.isNaN(itemEPS)) return false;
    const filterStr = filter.trim().toLowerCase();
    if (!filterStr) return true;
    if (filterStr === 'negative') return itemEPS < 0;
    if (filterStr === '0-1') return itemEPS >= 0 && itemEPS < 1;
    if (filterStr === '1-3') return itemEPS >= 1 && itemEPS < 3;
    if (filterStr === '>3') return itemEPS >= 3;
    return true;
  }

  function reportStateMatches(item: EarningsCalendarItem, state: string) {
    const hasEpsActual = item.epsActual !== null && item.epsActual !== undefined;
    const hasRevActual = item.revenueActual !== null && item.revenueActual !== undefined;
    const hasAnyActual = hasEpsActual || hasRevActual;

    if (!state) return true;
    if (state === 'scheduled') return !hasAnyActual;
    if (state === 'reported') return hasAnyActual;

    const hasComparableEps =
      item.epsEstimate !== null && item.epsEstimate !== undefined && hasEpsActual;
    const hasComparableRev =
      item.revenueEstimate !== null && item.revenueEstimate !== undefined && hasRevActual;
    if (!hasComparableEps || !hasComparableRev) return false;

    const epsBeat = (item.epsActual as number) >= (item.epsEstimate as number);
    const revBeat = (item.revenueActual as number) >= (item.revenueEstimate as number);
    if (state === 'beat') return epsBeat && revBeat;
    if (state === 'miss') return !epsBeat && !revBeat;
    return true;
  }

  const filteredItems = items.filter((item) => {
    if (filters.ticker && !item.symbol.toLowerCase().includes(filters.ticker.toLowerCase())) return false;
    if (filters.session && item.hour !== filters.session) return false;
    if (filters.epsForecast && !epsForecastMatches(item.epsEstimate, filters.epsForecast)) return false;
    if (filters.market && item.market !== filters.market) return false;
    if (filters.exchange && item.exchange !== filters.exchange) return false;
    if (filters.instrumentType && item.instrumentType !== filters.instrumentType) return false;
    if (filters.reportState && !reportStateMatches(item, filters.reportState)) return false;
    return Boolean(item.symbol);
  });

  function getISOWeek(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() === 0 ? 7 : d.getUTCDay()));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-1 pb-1 sm:px-2 sm:pb-2">
      <div className="mb-3 flex items-center justify-between pr-16 sm:mb-4 sm:pr-20">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">Earnings Calendar</h2>
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
                className={`flex min-w-[42px] flex-col items-center justify-center rounded-md border px-2 py-1.5 text-sm font-semibold transition-all duration-150 sm:min-w-[46px]
                    ${isSelected ? 'scale-[1.02] border-white text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)]' : 'border-border text-foreground hover:bg-muted/40'}`}
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

      <div className="flex min-h-0 flex-1 flex-col space-y-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent transition-all duration-150 hover:bg-muted/40"
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter key metrics"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={() => fetchEarnings(true)}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              title={loadingEarnings ? 'Loading earnings data...' : 'Reload earnings data'}
              aria-label="Reload earnings data"
              disabled={loadingEarnings}
            >
              <RefreshCw className={`h-4 w-4 ${loadingEarnings ? 'animate-spin' : ''}`} />
            </button>
            {filterOpen && (
              <div className="animate-fade-in absolute left-0 top-full z-20 mt-2 w-[min(92vw,300px)] rounded-lg border border-border bg-card p-4 shadow-lg">
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                  <Filter className="h-4 w-4 text-foreground" />
                  <button
                    className="ml-auto rounded p-1 hover:bg-muted"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      className="h-8 flex-1 rounded border border-border bg-transparent px-2 text-xs"
                      value={filters.ticker}
                      onChange={(e) => setFilters((f) => ({ ...f, ticker: e.target.value }))}
                      placeholder="Ticker"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none ${filters.session === 'bmo' ? 'border-white bg-white text-black' : 'border-border bg-transparent text-foreground hover:bg-muted/40'}`}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            session: f.session === 'bmo' ? '' : 'bmo',
                          }))
                        }
                        aria-pressed={filters.session === 'bmo'}
                      >
                        Pre Market
                      </button>
                      <button
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none ${filters.session === 'amc' ? 'border-white bg-white text-black' : 'border-border bg-transparent text-foreground hover:bg-muted/40'}`}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            session: f.session === 'amc' ? '' : 'amc',
                          }))
                        }
                        aria-pressed={filters.session === 'amc'}
                      >
                        After Market
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="h-8 flex-1 rounded border border-border bg-transparent px-2 text-xs"
                      value={filters.epsForecast}
                      onChange={(e) => setFilters((f) => ({ ...f, epsForecast: e.target.value }))}
                    >
                      <option value="">EPS Estimate (All)</option>
                      <option value="negative">Negative</option>
                      <option value="0-1">0 to 1</option>
                      <option value="1-3">1 to 3</option>
                      <option value=">3">Above 3</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="h-8 flex-1 rounded border border-border bg-transparent px-2 text-xs"
                      value={filters.reportState}
                      onChange={(e) => setFilters((f) => ({ ...f, reportState: e.target.value }))}
                    >
                      <option value="">Report State (All)</option>
                      <option value="scheduled">Scheduled (No Actuals)</option>
                      <option value="reported">Reported (Has Actuals)</option>
                      <option value="beat">Beat (EPS + Revenue)</option>
                      <option value="miss">Miss (EPS + Revenue)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="h-8 flex-1 rounded border border-border bg-transparent px-2 text-xs"
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
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="h-8 flex-1 rounded border border-border bg-transparent px-2 text-xs"
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
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="h-8 flex-1 rounded border border-border bg-transparent px-2 text-xs"
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
                  </div>
                </div>
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted/40"
                    onClick={() =>
                      setFilters({
                        ticker: '',
                        session: '',
                        epsForecast: '',
                        market: '',
                        exchange: '',
                        instrumentType: '',
                        reportState: '',
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

          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-foreground"
            title="Number of companies reporting"
          >
            {filteredItems.length} reporting
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
          <div className="flex min-h-[80px] flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
            <CalendarX className="mb-1 h-5 w-5" />
            <span className="block text-center">No earnings scheduled.</span>
          </div>
        ) : (
          <div className="et-scrollbar min-h-[260px] flex-1 space-y-3 overflow-y-auto pr-1 sm:min-h-[360px] sm:pr-2 lg:min-h-0">
            {filteredItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className={`w-full rounded-lg border ${getBorderColor(item)} px-3 py-3 transition-shadow duration-200 hover:shadow-md sm:px-4 sm:py-4`}
                style={{ height: 'auto' }}
              >
                {(() => {
                  const hasEpsDetails =
                    (item.epsEstimate !== undefined && item.epsEstimate !== null && item.epsEstimate !== '') ||
                    (item.epsActual !== undefined && item.epsActual !== null && item.epsActual !== '');
                  const hasRevenueDetails =
                    (item.revenueEstimate !== undefined &&
                      item.revenueEstimate !== null &&
                      item.revenueEstimate !== '') ||
                    (item.revenueActual !== undefined &&
                      item.revenueActual !== null &&
                      item.revenueActual !== '');
                  const hasFinancialDetails = hasEpsDetails || hasRevenueDetails;

                  return (
                    <>
                <div className="mb-2 flex flex-col items-center">
                  <span className="text-xl font-bold leading-tight tracking-wide text-foreground sm:text-2xl">
                    {item.symbol || '–'}
                  </span>
                  {(() => {
                    const hourLabel = formatHour(item.hour);
                    if (hourLabel === 'After Market' || hourLabel === 'Pre Market') {
                      return (
                        <span className="mt-1 text-xs font-semibold leading-tight text-muted-foreground sm:text-sm">
                          {hourLabel}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {[item.exchange, item.instrumentType, item.market, item.currency]
                    .filter((value) => value && String(value).trim().length > 0).length > 0 && (
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                      {[item.exchange, item.instrumentType, item.market, item.currency]
                        .filter((value) => value && String(value).trim().length > 0)
                        .join(' • ')}
                    </span>
                  )}
                </div>
                {hasFinancialDetails ? (
                  <div className={`grid w-full gap-3 sm:gap-4 ${hasEpsDetails && hasRevenueDetails ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {hasEpsDetails && (
                      <div className="flex flex-col items-center">
                        <span className="mb-1 text-xs font-semibold text-muted-foreground">
                          EPS Estimate
                        </span>
                        <span className="mb-2 text-base font-bold text-foreground">
                          {formatEPS(item.epsEstimate)}
                        </span>
                        <span className="mb-1 text-xs font-semibold text-muted-foreground">
                          EPS Actual
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {formatEPS(item.epsActual)}
                        </span>
                      </div>
                    )}
                    {hasRevenueDetails && (
                      <div className="flex flex-col items-center">
                        <span className="mb-1 text-xs font-semibold text-muted-foreground">
                          Revenue Estimate
                        </span>
                        <span className="mb-2 text-base font-bold text-foreground">
                          {formatNumber(item.revenueEstimate)}
                        </span>
                        <span className="mb-1 text-xs font-semibold text-muted-foreground">
                          Revenue Actual
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {formatNumber(item.revenueActual)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
                    EPS and revenue figures are not available from this earnings feed.
                  </div>
                )}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
