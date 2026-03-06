'use client';

import { CalendarX, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CustomCalendar as Calendar } from '@/components/ui/calendar';
import marketHours from '@/lib/exchangeinfo.js';

interface MarketHoliday {
  id: string;
  name: string;
  date: string;
  markets: string[];
  regions: string[];
  type: 'full' | 'early';
  earlyCloseTime?: string;
}

function toISODateString(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalISODate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`);
}

function formatLongDate(isoDate: string) {
  return parseLocalISODate(isoDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HolidayCalendar() {
  const todayISO = useMemo(() => toISODateString(new Date()), []);
  const todayDate = useMemo(() => parseLocalISODate(todayISO), [todayISO]);
  const [selected, setSelected] = useState<string | undefined>(todayISO);
  const [activeStartDate, setActiveStartDate] = useState<Date>(todayDate);
  const [marketFilter, setMarketFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  const holidays = useMemo(() => {
    const mergedByHoliday = new Map<string, MarketHoliday>();

    Object.entries(marketHours as Record<string, any>).forEach(([market, info]) => {
      if (!info?.holidays) return;
      const region = typeof info.region === 'string' ? info.region : 'Global';

      Object.entries(info.holidays as Record<string, any>).forEach(([date, details]) => {
        const name = String(details?.reason || 'Market Holiday');
        const type: 'full' | 'early' = details?.closeEarly ? 'early' : 'full';
        const earlyCloseTime =
          typeof details?.earlyCloseTime === 'string' ? details.earlyCloseTime : undefined;
        const key = `${date}__${name}__${type}__${earlyCloseTime || ''}`;
        const existing = mergedByHoliday.get(key);

        if (existing) {
          if (!existing.markets.includes(market)) existing.markets.push(market);
          if (!existing.regions.includes(region)) existing.regions.push(region);
          return;
        }

        mergedByHoliday.set(key, {
          id: key,
          name,
          date,
          markets: [market],
          regions: [region],
          type,
          earlyCloseTime,
        });
      });
    });

    return Array.from(mergedByHoliday.values())
      .map((holiday) => ({
        ...holiday,
        markets: [...holiday.markets].sort((a, b) => a.localeCompare(b)),
        regions: [...holiday.regions].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  }, []);

  const marketOptions = useMemo(() => {
    const allMarkets = new Set<string>();
    holidays.forEach((holiday) => {
      holiday.markets.forEach((market) => allMarkets.add(market));
    });
    return ['ALL', ...Array.from(allMarkets).sort((a, b) => a.localeCompare(b))];
  }, [holidays]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredByMarketAndQuery = useMemo(() => {
    return holidays.filter((holiday) => {
      if (marketFilter !== 'ALL' && !holiday.markets.includes(marketFilter)) return false;
      if (!normalizedQuery) return true;
      const haystack = `${holiday.name} ${holiday.markets.join(' ')} ${holiday.regions.join(' ')}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [holidays, marketFilter, normalizedQuery]);

  const holidaysByDate = useMemo(() => {
    const grouped = new Map<string, MarketHoliday[]>();
    filteredByMarketAndQuery.forEach((holiday) => {
      const existing = grouped.get(holiday.date);
      if (existing) existing.push(holiday);
      else grouped.set(holiday.date, [holiday]);
    });
    return grouped;
  }, [filteredByMarketAndQuery]);

  const selectedDateHolidays = useMemo(() => {
    if (!selected) return [];
    return holidaysByDate.get(selected) || [];
  }, [holidaysByDate, selected]);

  const filteredMarketsCount = useMemo(() => {
    const marketSet = new Set<string>();
    filteredByMarketAndQuery.forEach((holiday) => {
      holiday.markets.forEach((market) => marketSet.add(market));
    });
    return marketSet.size;
  }, [filteredByMarketAndQuery]);

  return (
    <div className="et-scrollbar flex h-full min-h-0 flex-col overflow-y-auto px-1 pb-1 sm:px-2 sm:pb-2">
      <h2 className="mb-3 pr-16 text-base font-semibold text-foreground sm:mb-4 sm:pr-20">
        Holiday Calendar
      </h2>

      <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-md border border-border/70 bg-card/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Holidays</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{filteredByMarketAndQuery.length}</div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Markets</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{filteredMarketsCount}</div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Selected Day</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{selectedDateHolidays.length}</div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search holiday, market, region..."
            className="h-9 w-full rounded-md border border-border bg-background px-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <select
          value={marketFilter}
          onChange={(event) => setMarketFilter(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          {marketOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'ALL' ? 'All markets' : option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:min-h-0 sm:flex-1 sm:grid-rows-[auto_minmax(0,1fr)]">
        <div className="rounded-lg border border-border/70 bg-background/50 p-2 sm:p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Calendar</span>
            <button
              type="button"
              onClick={() => {
                setSelected(todayISO);
                setActiveStartDate(todayDate);
              }}
              className="rounded-md border border-border px-2 py-1 text-xs text-foreground transition hover:bg-muted/60"
            >
              Today
            </button>
          </div>
          <div className="w-full overflow-x-auto pb-1">
            <div className="mx-auto w-fit">
              <Calendar
                activeStartDate={activeStartDate}
                value={selected ? parseLocalISODate(selected) : undefined}
                onActiveStartDateChange={({ activeStartDate: nextStartDate }) => {
                  if (nextStartDate) setActiveStartDate(nextStartDate);
                }}
                onChange={(value) => {
                  if (Array.isArray(value)) return;
                  setSelected(value ? toISODateString(value) : undefined);
                }}
                tileClassName={({ date }) =>
                  holidaysByDate.has(toISODateString(date))
                    ? 'et-holiday-tile react-calendar__month-view__days__day--weekend'
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-[180px] flex-1 flex-col rounded-lg border border-border/70 bg-background/50 p-3 sm:min-h-0">
          <div className="mb-2">
            <div className="text-xs text-muted-foreground">Selected date</div>
            <div className="text-sm font-semibold text-foreground">
              {selected ? formatLongDate(selected) : 'No date selected'}
            </div>
          </div>

          <div className="et-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedDateHolidays.length > 0 ? (
              <div className="space-y-2">
                {selectedDateHolidays.map((holiday) => (
                  <div key={holiday.id} className="rounded-md border border-border/70 bg-card/40 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">{holiday.name}</div>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                          holiday.type === 'early'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-border bg-background text-muted-foreground'
                        }`}
                      >
                        {holiday.type === 'early' ? 'Early Close' : 'Closed'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{holiday.markets.join(', ')}</div>
                    {holiday.earlyCloseTime && (
                      <div className="mt-1 text-xs text-amber-300">Closes at {holiday.earlyCloseTime}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[72px] items-center gap-2 text-sm text-muted-foreground">
                <CalendarX className="h-4 w-4" />
                <span>No holidays match this date/filter.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
