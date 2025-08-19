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
    return 'border-gray-200 dark:border-neutral-800';
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
  const today = new Date();
  // Ermittle Wochenstart (Sonntag)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const [selectedDayIdx, setSelectedDayIdx] = useState(today.getDay());
  const selectedDate = weekDates[selectedDayIdx];
  const key = selectedDate.toISOString().split('T')[0];
  const [earningsData, setEarningsData] = useState<Record<string, any[]>>({});

  // Fetch earnings data from API and store in localStorage
  const fetchEarnings = () => {
    fetch('/api/earnings-calendar')
      .then((res) => res.json())
      .then((data) => {
        setEarningsData(data);
        localStorage.setItem('earningsData', JSON.stringify(data));
      })
      .catch(() => setEarningsData({}));
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

  // Shift data by one day down: show previous day's data for each day
  // Shift data by one day down: show next day's data for each day
  const nextDayIdx = (selectedDayIdx + 1) % 7;
  const nextDate = weekDates[nextDayIdx];
  const nextKey = nextDate.toISOString().split('T')[0];
  let items = earningsData[nextKey] || [];

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
    // Show company only if hour, epsEstimate, and revenueEstimate are all present (not null/undefined/empty)
    const hasHour = !!item.hour;
    const hasEpsEstimate =
      item.epsEstimate !== undefined && item.epsEstimate !== null && item.epsEstimate !== '';
    const hasRevenueEstimate =
      item.revenueEstimate !== undefined &&
      item.revenueEstimate !== null &&
      item.revenueEstimate !== '';
    if (!(hasHour && hasEpsEstimate && hasRevenueEstimate)) return false;
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
    <div className="rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Earnings Calendar
        </h2>
      </div>
      {/* Calendar Week centered above Day Selector */}
      <div className="w-full flex items-center mb-3 relative" style={{ minHeight: '32px' }}>
        <div className="flex-1 flex justify-center">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg text-center">
            Calendar Week {getISOWeek(selectedDate)}
          </h3>
        </div>
      </div>
      {/* Day Selector */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 flex justify-center py-2">
          <div className="flex gap-4 min-w-max px-2 justify-center">
            {weekDates.map((date, idx) => {
              const isSelected = selectedDayIdx === idx;
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`flex flex-col items-center justify-center min-w-[44px] px-2 py-1.5 rounded-md border transition-all duration-150
                      ${isSelected ? 'text-black dark:text-white border-gray-900 dark:border-white shadow-lg scale-105' : 'text-black dark:text-white border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#232329]'}
                      font-semibold text-sm`}
                  style={{ boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.12)' : undefined }}
                >
                  <span className="text-base font-bold">{date.getDate()}</span>
                  <span className="text-[11px] font-medium mt-0.5">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Earnings List für ausgewählten Tag */}
      <div className="pl-4">
        {/* Filter hamburger menu and company count above cards section */}
        <div className="flex items-center justify-between -mt-2 mb-2">
          {/* Hamburger menu and reload button */}
          <div className="relative flex items-center gap-2">
            <button
              className="flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-black transition-all duration-150 shadow-sm"
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter key metrics"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-white" />
            </button>
            <button
              onClick={fetchEarnings}
              className="h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-teal-600 transition-colors"
              title="Reload earnings data"
              aria-label="Reload earnings data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {filterOpen && (
              <div className="absolute left-0 mt-2 z-10 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[240px] animate-fade-in">
                <div className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                  <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <button
                    className="ml-auto p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#232329] text-xs"
                      value={filters.ticker}
                      onChange={(e) => setFilters((f) => ({ ...f, ticker: e.target.value }))}
                      placeholder="Ticker"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors duration-150 focus:outline-none ${filters.marketCap === 'bmo' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-[#232329] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
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
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors duration-150 focus:outline-none ${filters.marketCap === 'amc' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-[#232329] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
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
                    <BarChart2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <select
                      className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#232329] text-xs"
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
                <div className="flex justify-between mt-4 gap-2">
                  <button
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setFilters({ marketCap: '', ticker: '', epsForecast: '' })}
                  >
                    <X className="w-3 h-3" /> Reset
                  </button>
                  <button
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700"
                    onClick={() => setFilterOpen(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Company count */}
          <span
            className="text-gray-900 dark:text-white text-xs font-bold rounded-full px-2 py-0.5"
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
        {/* Datum entfernt */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60px] text-sm text-gray-400">
            <CalendarX className="w-5 h-5 mb-1" />
            <span className="block text-center">No earnings scheduled.</span>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-3 px-4 md:px-8 rounded-lg scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {filteredItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className={`border ${getBorderColor(item)} rounded-lg px-4 py-4 flex flex-col items-center justify-center shadow hover:shadow-md transition-shadow duration-200 min-h-[120px] md:min-h-[150px] w-full`}
                style={{ height: 'auto' }}
              >
                {/* Symbol and Market Time */}
                <div className="flex flex-col items-center w-full mb-2">
                  <span className="text-2xl font-extrabold text-white tracking-wide leading-tight">
                    {item.symbol || '–'}
                  </span>
                  {(() => {
                    const hourLabel = formatHour(item.hour);
                    if (hourLabel === 'After Market' || hourLabel === 'Pre Market') {
                      return (
                        <span className="text-white text-sm font-semibold leading-tight mt-1">
                          {hourLabel}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                {/* ...removed quarter and year display... */}
                {/* EPS and Revenue Info */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-700 dark:text-neutral-400 text-xs font-bold mb-1">
                      EPS Estimate
                    </span>
                    <span className="text-black dark:text-white font-extrabold text-base mb-2">
                      {formatEPS(item.epsEstimate)}
                    </span>
                    <span className="text-gray-700 dark:text-neutral-400 text-xs font-bold mb-1">
                      EPS Actual
                    </span>
                    <span className="text-black dark:text-white font-extrabold text-base">
                      {formatEPS(item.epsActual)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-700 dark:text-neutral-400 text-xs font-bold mb-1">
                      Revenue Estimate
                    </span>
                    <span className="text-black dark:text-white font-extrabold text-base mb-2">
                      {formatNumber(item.revenueEstimate)}
                    </span>
                    <span className="text-gray-700 dark:text-neutral-400 text-xs font-bold mb-1">
                      Revenue Actual
                    </span>
                    <span className="text-black dark:text-white font-extrabold text-base">
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
