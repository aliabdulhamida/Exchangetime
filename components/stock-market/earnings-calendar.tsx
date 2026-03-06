'use client';

import { CalendarX, Menu, Filter, Clock, BarChart2, X, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  const today = new Date();
  // Ermittle Wochenstart (Montag)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const [selectedDayIdx, setSelectedDayIdx] = useState((today.getDay() + 6) % 7);
  const selectedDate = weekDates[selectedDayIdx];
  const [earningsData, setEarningsData] = useState<Record<string, any[]>>({});
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // Fetch earnings data from API and store in localStorage
  const fetchEarnings = async () => {
    setLoadingEarnings(true);
    try {
      const res = await fetch('/api/earnings-calendar');
      const data = await res.json();
      setEarningsData(data);
      localStorage.setItem('earningsData', JSON.stringify(data));
    } catch {
      setEarningsData({});
    } finally {
      setLoadingEarnings(false);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('earningsData');
    if (cached) {
      try {
        setEarningsData(JSON.parse(cached));
      } catch {
        fetchEarnings();
      }
    } else {
      fetchEarnings();
    }
  }, []);

  const selectedKey = toLocalDateKey(weekDates[selectedDayIdx]);
  let items = earningsData[selectedKey] || [];

  // Filter menu state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    marketCap: '',
    ticker: '',
    epsForecast: '',
  });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Filter logic
  // Improved market cap filter: supports keywords and numeric ranges
  function parseMarketCapToNumber(val: any): number | null {
    if (!val) return null;
    const str = val.toString().replace(/,/g, '').toLowerCase();
    const match = str.match(/([\d.]+)\s*(b|m|k)?/);
    if (!match) return null;
    let num = parseFloat(match[1]);
    let unit = match[2];
    if (unit === 'b') num *= 1e9;
    else if (unit === 'm') num *= 1e6;
    else if (unit === 'k') num *= 1e3;
    return num;
  }

  function marketCapMatches(itemMarketCap: any, filter: string) {
    if (!itemMarketCap) return false;
    const capStr = itemMarketCap.toString().toLowerCase();
    const filterStr = filter.trim().toLowerCase();
    if (!filterStr) return true;
    const capNum = parseMarketCapToNumber(itemMarketCap);
    // Selector logic
    if (filterStr === 'small') return capNum !== null && capNum < 1e9;
    if (filterStr === 'mid') return capNum !== null && capNum >= 1e9 && capNum < 1e10;
    if (filterStr === 'large') return capNum !== null && capNum >= 1e10;
    // Numeric matching (e.g. 1B, 100M)
    const numMatch = filterStr.match(/([\d,.]+)\s*(b|m|k)?/);
    if (numMatch) {
      let num = parseFloat(numMatch[1].replace(/,/g, ''));
      let unit = numMatch[2];
      if (unit === 'b') num *= 1e9;
      else if (unit === 'm') num *= 1e6;
      else if (unit === 'k') num *= 1e3;
      if (capNum !== null) {
        // Accept if within 10% range
        return Math.abs(capNum - num) < num * 0.1;
      }
    }
    // Fallback: substring match
    return capStr.includes(filterStr);
  }

  function epsForecastMatches(itemEPS: any, filter: string) {
    if (itemEPS === undefined || itemEPS === null || itemEPS === '') return false;
    let val: number | null = null;
    if (typeof itemEPS === 'number') {
      val = itemEPS;
    } else if (typeof itemEPS === 'string') {
      let cleaned = itemEPS.trim();
      // Handle bracketed negative values e.g. (0.12) => -0.12
      const bracketMatch = cleaned.match(/^\(([^)]+)\)$/);
      if (bracketMatch) {
        val = -parseFloat(bracketMatch[1].replace(/[^0-9.-]/g, ''));
      } else {
        cleaned = cleaned.replace(/[^0-9.-]/g, '');
        val = cleaned ? parseFloat(cleaned) : null;
      }
    }
    const filterStr = filter.trim().toLowerCase();
    if (!filterStr) return true;
    if (filterStr === 'negative') return val !== null && !isNaN(val) && val < 0;
    if (filterStr === '0-1') return val !== null && !isNaN(val) && val >= 0 && val < 1;
    if (filterStr === '1-3') return val !== null && !isNaN(val) && val >= 1 && val < 3;
    if (filterStr === '>3') return val !== null && !isNaN(val) && val >= 3;
    // fallback: substring match
    const epsStr = itemEPS.toString().toLowerCase();
    return epsStr.includes(filterStr);
  }

  const filteredItems = items.filter((item: any) => {
    // Pre Market / After Market filter
    if (filters.marketCap) {
      const hour = (item.hour || '').toLowerCase();
      if (filters.marketCap === 'bmo' && hour !== 'bmo') return false;
      if (filters.marketCap === 'amc' && hour !== 'amc') return false;
    }
    if (
      filters.ticker &&
      (!item.symbol || !item.symbol.toLowerCase().includes(filters.ticker.toLowerCase()))
    )
      return false;
    if (filters.epsForecast && !epsForecastMatches(item.epsEstimate, filters.epsForecast))
      return false;
    // Nasdaq calendar data does not include revenue estimates for every symbol.
    // Keep rows visible as long as timing + EPS estimate exist.
    const hasHour = !!item.hour;
    const hasEpsEstimate =
      item.epsEstimate !== undefined && item.epsEstimate !== null && item.epsEstimate !== '';
    if (!(hasHour && hasEpsEstimate)) return false;
    return true;
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

      <div className="mb-2 text-center">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          Calendar Week {getISOWeek(selectedDate)}
        </h3>
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
              onClick={fetchEarnings}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              title={loadingEarnings ? 'Loading earnings data...' : 'Reload earnings data'}
              aria-label="Reload earnings data"
              disabled={loadingEarnings}
            >
              <RefreshCw className={`h-4 w-4 ${loadingEarnings ? 'animate-spin' : ''}`} />
            </button>
            {filterOpen && (
              <div className="animate-fade-in absolute left-0 top-full z-20 mt-2 w-[min(92vw,260px)] rounded-lg border border-border bg-card p-4 shadow-lg">
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
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none ${filters.marketCap === 'bmo' ? 'border-white bg-white text-black' : 'border-border bg-transparent text-foreground hover:bg-muted/40'}`}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            marketCap: f.marketCap === 'bmo' ? '' : 'bmo',
                          }))
                        }
                        aria-pressed={filters.marketCap === 'bmo'}
                      >
                        Pre Market
                      </button>
                      <button
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none ${filters.marketCap === 'amc' ? 'border-white bg-white text-black' : 'border-border bg-transparent text-foreground hover:bg-muted/40'}`}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            marketCap: f.marketCap === 'amc' ? '' : 'amc',
                          }))
                        }
                        aria-pressed={filters.marketCap === 'amc'}
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
                </div>
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted/40"
                    onClick={() => setFilters({ marketCap: '', ticker: '', epsForecast: '' })}
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
                </div>
                <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
