'use client';

import { ChevronDown, Heart, ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import marketHours, { exchangeInfo } from '@/lib/exchangeinfo.js';

type Exchange = {
  name: string;
  city: string;
  country: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  nextEvent: string;
  localTime?: string;
};

export default function ExchangeTimes() {
  const [filter, setFilter] = useState('');
  const { theme } = useTheme();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoExchange, setInfoExchange] = useState<string | null>(null);
  // Mapping marketHours to Exchange[]

  function getExchangesFromMarketHours(): Exchange[] {
    return Object.entries(marketHours).map(([key, value]: [string, any]) => {
      // Fallbacks für open/close (z.B. Tokio hat open1/close1)
      const openTime = value.open || value.open1 || '';
      const closeTime = value.close || value.close1 || '';
      // Fallback für country
      const country = value.country || value.region || '';
      return {
        name: key,
        city: value.city || '',
        country,
        timezone: value.timezone || '',
        openTime,
        closeTime,
        isOpen: false,
        nextEvent: '',
        localTime: getLocalTimeString(value.timezone || ''),
      };
    });
  }

  const [exchanges, setExchanges] = useState<Exchange[]>(getExchangesFromMarketHours());

  // Regionen extrahieren
  const regions = Array.from(
    new Set(Object.values(marketHours).map((ex: any) => ex.region || 'Other')),
  );
  regions.sort();
  regions.unshift('All');

  function isOpen(exchange: Exchange) {
    const now = new Date();
    // Hole die aktuelle Zeit in der Zeitzone der Börse
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: exchange.timezone }));
    const day = localNow.getDay(); // 0 = Sonntag, 6 = Samstag
    // Standard: Börsen sind am Samstag und Sonntag geschlossen
    if (day === 0 || day === 6) return false;
    // Feiertage prüfen
    const exInfo = (marketHours as any)[exchange.name];
    const holidays = exInfo?.holidays || {};
    const dateStr = localNow.toISOString().slice(0, 10); // YYYY-MM-DD
    if (holidays[dateStr]) {
      // Wenn geschlossen (closeEarly: false), dann nie offen
      if (!holidays[dateStr].closeEarly) return false;
    }
    // Öffnungs- und Schließzeiten ggf. für verkürzten Tag anpassen
    let openTime = exchange.openTime;
    let closeTime = exchange.closeTime;
    if (holidays[dateStr] && holidays[dateStr].closeEarly && holidays[dateStr].earlyCloseTime) {
      closeTime = holidays[dateStr].earlyCloseTime;
    }
    const [openHour, openMinute] = openTime.split(':');
    const [closeHour, closeMinute] = closeTime.split(':');
    const open = new Date(localNow);
    const close = new Date(localNow);
    open.setHours(Number(openHour), Number(openMinute), 0, 0);
    close.setHours(Number(closeHour), Number(closeMinute), 0, 0);
    return localNow >= open && localNow <= close;
  }

  function getLocalTimeString(timezone: string) {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
  }

  useEffect(() => {
    const updateExchangeStatus = () => {
      setExchanges((prev) =>
        prev.map((exchange) => ({
          ...exchange,
          isOpen: isOpen(exchange),
          localTime: getLocalTimeString(exchange.timezone),
        })),
      );
    };
    updateExchangeStatus(); // Initiales Update
    const interval = setInterval(updateExchangeStatus, 1000); // Jede Sekunde für aktuelle Uhrzeit
    return () => clearInterval(interval);
  }, []);

  // Favoriten-Logik
  function toggleFavorite(name: string) {
    setFavorites((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  // Filter- und Sortierlogik
  let filtered = exchanges.filter(
    (ex) =>
      (selectedRegion === 'All' ||
        ((marketHours as any)[ex.name]?.region || 'Other') === selectedRegion) &&
      (ex.name.toLowerCase().includes(filter.toLowerCase()) ||
        ex.city.toLowerCase().includes(filter.toLowerCase())),
  );
  let sorted = filtered;
  if (showOnlyFavorites) {
    sorted = sorted.filter((ex) => favorites.includes(ex.name));
  }

  return (
    <div className="pt-0">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-foreground">
        Exchange Times
      </h2>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2 w-full">
          <input
            type="text"
            placeholder="Search for exchange or city..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded border border-border bg-black px-2 py-1 text-sm text-foreground sm:max-w-xs"
          />
          <button
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            className="ml-2 rounded border border-transparent p-1 transition hover:border-border focus:outline-none"
            title={showOnlyFavorites ? 'Show all exchanges' : 'Show only favorites'}
            type="button"
          >
            <Heart
              size={22}
              className={
                showOnlyFavorites
                  ? theme === 'dark'
                    ? 'text-white fill-white'
                    : 'text-black fill-black'
                  : theme === 'dark'
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground'
              }
              fill={showOnlyFavorites ? 'currentColor' : 'none'}
            />
          </button>
        </div>
        <div className="mt-2 flex w-full flex-col gap-1 sm:mt-0 sm:w-auto sm:min-w-[150px]">
          <label
            htmlFor="region-select"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Region
          </label>
          <div className="relative">
            <select
              id="region-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="et-tool-select h-9 min-w-[150px] text-sm"
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <ChevronDown className="et-tool-select-caret h-4 w-4" />
          </div>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto pr-1 sm:pr-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {sorted.map((exchange) => {
            // Zeit bis zum nächsten Event berechnen, unter Berücksichtigung von Wochenenden und Feiertagen
            const now = new Date();
            const exInfo = (marketHours as any)[exchange.name];
            const holidays = exInfo?.holidays || {};
            let localNow = new Date(now.toLocaleString('en-US', { timeZone: exchange.timezone }));
            let day = localNow.getDay(); // 0 = Sonntag, 6 = Samstag
            let dateStr = localNow.toISOString().slice(0, 10);
            let openTime = exchange.openTime;
            let closeTime = exchange.closeTime;
            // Feiertag heute?
            if (holidays[dateStr]) {
              if (!holidays[dateStr].closeEarly) {
                // Komplett geschlossen, nächste Öffnung suchen
                let nextOpen = new Date(localNow);
                let addDays = 1;
                while (true) {
                  nextOpen.setDate(nextOpen.getDate() + addDays);
                  let nextDay = nextOpen.getDay();
                  let nextDateStr = nextOpen.toISOString().slice(0, 10);
                  if (
                    nextDay !== 0 &&
                    nextDay !== 6 &&
                    (!holidays[nextDateStr] || holidays[nextDateStr].closeEarly)
                  ) {
                    break;
                  }
                  addDays = 1;
                }
                openTime = exchange.openTime;
                if (
                  holidays[nextOpen.toISOString().slice(0, 10)]?.closeEarly &&
                  holidays[nextOpen.toISOString().slice(0, 10)]?.earlyCloseTime
                ) {
                  closeTime = holidays[nextOpen.toISOString().slice(0, 10)].earlyCloseTime;
                } else {
                  closeTime = exchange.closeTime;
                }
                const open = new Date(nextOpen);
                const [openHour, openMinute] = openTime.split(':').map(Number);
                open.setHours(openHour, openMinute, 0, 0);
                let timeLeft = (open.getTime() - localNow.getTime()) / 1000;
                let timeLeftLabel = 'Opens in:';
                let progress = 0;
                let hours = Math.floor(timeLeft / 3600);
                let minutes = Math.floor((timeLeft % 3600) / 60);
                let currentTime = exchange.localTime || '';
                return (
                  <div
                    key={exchange.name}
                    onClick={() => toggleFavorite(exchange.name)}
                    className={`relative mx-auto flex w-full max-w-sm cursor-pointer flex-col items-center rounded-xl border px-4 py-4 transition-all duration-200 sm:px-5 sm:py-5
                        ${
                          favorites.includes(exchange.name)
                            ? 'border-foreground'
                            : 'border-border hover:border-foreground/60'
                        }
                        bg-card
                      `}
                  >
                    <div className="pointer-events-none absolute top-2 left-3 select-none text-[11px] font-semibold text-muted-foreground">
                      {exchange.city}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 items-center select-none pointer-events-none">
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
                        CLOSED
                      </span>
                    </div>
                    <div className="h-5" />
                    <div className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-widest text-foreground">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoExchange(exchange.name);
                          setInfoOpen(true);
                        }}
                        className="underline decoration-dotted underline-offset-4 hover:decoration-solid focus:outline-none"
                        aria-label={`More info about ${exchange.name}`}
                      >
                        {exchange.name}
                      </button>
                    </div>
                    <div className="mb-2 text-[10px] text-muted-foreground">
                      Open:{' '}
                      <span className="font-bold text-foreground">{openTime}</span>{' '}
                      - Close:{' '}
                      <span className="font-bold text-foreground">
                        {closeTime}
                      </span>
                    </div>
                    <div className="mb-2 text-base font-mono font-bold tracking-widest text-muted-foreground">
                      {currentTime}
                    </div>
                    <div className="mb-1 flex w-full justify-between text-[11px] text-muted-foreground">
                      <span>{timeLeftLabel}</span>
                      <span className="font-bold text-foreground">
                        {hours > 0 ? `${hours}h ` : ''}
                        {minutes}m
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-500"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      ></div>
                    </div>
                    {/* Hinweistext entfernt */}
                  </div>
                );
              }
              // Verkürzter Tag: closeTime anpassen
              if (holidays[dateStr].closeEarly && holidays[dateStr].earlyCloseTime) {
                closeTime = holidays[dateStr].earlyCloseTime;
              }
            }
            // Wochenende prüfen
            if (day === 0 || day === 6) {
              // Nächste Öffnung am nächsten Werktag, der kein Feiertag ist
              let nextOpen = new Date(localNow);
              let addDays = 1;
              while (true) {
                nextOpen.setDate(nextOpen.getDate() + addDays);
                let nextDay = nextOpen.getDay();
                let nextDateStr = nextOpen.toISOString().slice(0, 10);
                if (
                  nextDay !== 0 &&
                  nextDay !== 6 &&
                  (!holidays[nextDateStr] || holidays[nextDateStr].closeEarly)
                ) {
                  break;
                }
                addDays = 1;
              }
              openTime = exchange.openTime;
              if (
                holidays[nextOpen.toISOString().slice(0, 10)]?.closeEarly &&
                holidays[nextOpen.toISOString().slice(0, 10)]?.earlyCloseTime
              ) {
                closeTime = holidays[nextOpen.toISOString().slice(0, 10)].earlyCloseTime;
              } else {
                closeTime = exchange.closeTime;
              }
              const open = new Date(nextOpen);
              const [openHour, openMinute] = openTime.split(':').map(Number);
              open.setHours(openHour, openMinute, 0, 0);
              let timeLeft = (open.getTime() - localNow.getTime()) / 1000;
              let timeLeftLabel = 'Opens in:';
              let progress = 0;
              let hours = Math.floor(timeLeft / 3600);
              let minutes = Math.floor((timeLeft % 3600) / 60);
              let currentTime = exchange.localTime || '';
              return (
                <div
                  key={exchange.name}
                  onClick={() => toggleFavorite(exchange.name)}
                  className={`relative mx-auto flex w-full max-w-sm cursor-pointer flex-col items-center rounded-xl border px-4 py-4 transition-all duration-200 sm:px-5 sm:py-5
	                      ${
                          favorites.includes(exchange.name)
                            ? 'border-foreground'
                            : 'border-border hover:border-foreground/60'
                        }
                      bg-card
                    `}
                >
                  <div className="pointer-events-none absolute top-2 left-3 select-none text-[11px] font-semibold text-muted-foreground">
                    {exchange.city}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 items-center select-none pointer-events-none">
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
                      CLOSED
                    </span>
                  </div>
                  <div className="h-5" />
                  <div className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-widest text-foreground">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoExchange(exchange.name);
                        setInfoOpen(true);
                      }}
                      className="underline decoration-dotted underline-offset-4 hover:decoration-solid focus:outline-none"
                      aria-label={`More info about ${exchange.name}`}
                    >
                      {exchange.name}
                    </button>
                  </div>
                  <div className="mb-2 text-[10px] text-muted-foreground">
                    Open:{' '}
                    <span className="font-bold text-foreground">{openTime}</span> -
                    Close:{' '}
                    <span className="font-bold text-foreground">{closeTime}</span>
                  </div>
                  <div className="mb-2 text-base font-mono font-bold tracking-widest text-muted-foreground">
                    {currentTime}
                  </div>
                  <div className="mb-1 flex w-full justify-between text-[11px] text-muted-foreground">
                    <span>{timeLeftLabel}</span>
                    <span className="font-bold text-foreground">
                      {hours > 0 ? `${hours}h ` : ''}
                      {minutes}m
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-500"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    ></div>
                  </div>
                  {/* Hinweistext entfernt */}
                </div>
              );
            }
            // Regulärer Tag, ggf. verkürzt
            if (
              holidays[dateStr] &&
              holidays[dateStr].closeEarly &&
              holidays[dateStr].earlyCloseTime
            ) {
              closeTime = holidays[dateStr].earlyCloseTime;
            }
            const [openHour, openMinute] = openTime.split(':').map(Number);
            const [closeHour, closeMinute] = closeTime.split(':').map(Number);
            const open = new Date(localNow);
            open.setHours(openHour, openMinute, 0, 0);
            const close = new Date(localNow);
            close.setHours(closeHour, closeMinute, 0, 0);
            let timeLeft = 0;
            let timeLeftLabel = '';
            let progress = 0;
            if (exchange.isOpen) {
              timeLeft = (close.getTime() - localNow.getTime()) / 1000;
              timeLeftLabel = 'Time Left:';
              progress =
                1 - (close.getTime() - localNow.getTime()) / (close.getTime() - open.getTime());
            } else if (localNow < open) {
              timeLeft = (open.getTime() - localNow.getTime()) / 1000;
              timeLeftLabel = 'Opens in:';
              progress = 0;
            } else {
              // Nach Börsenschluss, nächste Öffnung suchen
              let nextOpen = new Date(open);
              let addDays = 1;
              while (true) {
                nextOpen.setDate(nextOpen.getDate() + addDays);
                let nextDay = nextOpen.getDay();
                let nextDateStr = nextOpen.toISOString().slice(0, 10);
                if (
                  nextDay !== 0 &&
                  nextDay !== 6 &&
                  (!holidays[nextDateStr] || holidays[nextDateStr].closeEarly)
                ) {
                  break;
                }
                addDays = 1;
              }
              openTime = exchange.openTime;
              if (
                holidays[nextOpen.toISOString().slice(0, 10)]?.closeEarly &&
                holidays[nextOpen.toISOString().slice(0, 10)]?.earlyCloseTime
              ) {
                closeTime = holidays[nextOpen.toISOString().slice(0, 10)].earlyCloseTime;
              } else {
                closeTime = exchange.closeTime;
              }
              const openNext = new Date(nextOpen);
              const [openHourNext, openMinuteNext] = openTime.split(':').map(Number);
              openNext.setHours(openHourNext, openMinuteNext, 0, 0);
              timeLeft = (openNext.getTime() - localNow.getTime()) / 1000;
              timeLeftLabel = 'Opens in:';
              progress = 0;
            }
            let hours = Math.floor(timeLeft / 3600);
            let minutes = Math.floor((timeLeft % 3600) / 60);
            let currentTime = exchange.localTime || '';
            return (
              <div
                key={exchange.name}
                onClick={() => toggleFavorite(exchange.name)}
                className={`relative mx-auto flex w-full max-w-sm cursor-pointer flex-col items-center rounded-xl border px-4 py-4 transition-all duration-200 sm:px-5 sm:py-5
	                    ${
                        favorites.includes(exchange.name)
                          ? 'border-foreground'
                          : 'border-border hover:border-foreground/60'
                      }
                    bg-card
                  `}
              >
                <div className="pointer-events-none absolute top-2 left-3 select-none text-[11px] font-semibold text-muted-foreground">
                  {exchange.city}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 items-center select-none pointer-events-none">
                  {exchange.isOpen ? (
                    <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">
                      OPEN
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
                      CLOSED
                    </span>
                  )}
                </div>
                <div className="h-5" />
                <div className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-widest text-foreground">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoExchange(exchange.name);
                      setInfoOpen(true);
                    }}
                    className="underline decoration-dotted underline-offset-4 hover:decoration-solid focus:outline-none"
                    aria-label={`More info about ${exchange.name}`}
                  >
                    {exchange.name}
                  </button>
                </div>
                <div className="mb-2 text-[10px] text-muted-foreground">
                  Open:{' '}
                  <span className="font-bold text-foreground">
                    {exchange.openTime}
                  </span>{' '}
                  - Close:{' '}
                  <span className="font-bold text-foreground">
                    {exchange.closeTime}
                  </span>
                </div>
                <div className="mb-2 text-base font-mono font-bold tracking-widest text-muted-foreground">
                  {currentTime}
                </div>
                <div className="mb-1 flex w-full justify-between text-[11px] text-muted-foreground">
                  <span>{timeLeftLabel}</span>
                  <span className="font-bold text-foreground">
                    {hours > 0 ? `${hours}h ` : ''}
                    {minutes}m
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-500"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Info Modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {(infoExchange && (exchangeInfo as any)[infoExchange]?.name) || infoExchange}
            </DialogTitle>
            <DialogDescription>
              {(infoExchange && (exchangeInfo as any)[infoExchange]?.location) || ''}
            </DialogDescription>
          </DialogHeader>
          {infoExchange ? (
            <div className="space-y-3 text-sm leading-6">
              <p className="text-muted-foreground">
                {(exchangeInfo as any)[infoExchange]?.description || 'No description available.'}
              </p>
              {/* Map */}
              {(() => {
                const coords =
                  (infoExchange && (exchangeInfo as any)[infoExchange]?.coords) ||
                  (null as null | { lat: number; lng: number });
                if (!coords) return null;
                const { lat, lng } = coords;
                // Build a small bbox around the point to reduce context and clutter
                const dLng = 0.02;
                const dLat = 0.01;
                const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - dLng}%2C${lat - dLat}%2C${lng + dLng}%2C${lat + dLat}&layer=mapnik&marker=${lat}%2C${lng}`;
                return (
                  <div className="relative rounded-md overflow-hidden border bg-black/70">
                    <iframe
                      title={`Map of ${infoExchange}`}
                      src={src}
                      className="w-full h-56"
                      style={
                        theme === 'dark'
                          ? {
                              filter:
                                'invert(0.92) hue-rotate(180deg) brightness(0.85) contrast(1.0) saturate(0) opacity(0.9)',
                            }
                          : {
                              filter: 'grayscale(1) brightness(1.05) contrast(0.9) opacity(0.95)',
                            }
                      }
                      loading="lazy"
                    />
                  </div>
                );
              })()}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    ['Founded', 'founded'],
                    ['Trading hours', 'tradingHours'],
                    ['Major indices', 'majorIndices'],
                    ['Listed companies', 'listedCompanies'],
                    ['Market cap', 'marketCap'],
                    ['Regulatory body', 'regulatoryBody'],
                  ] as const
                ).map(([label, key]) => {
                  const val = (exchangeInfo as any)[infoExchange]?.[key];
                  if (!val) return null;
                  return (
                    <li key={key} className="flex flex-col">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-foreground">{val}</span>
                    </li>
                  );
                })}
              </ul>
              {Boolean((exchangeInfo as any)[infoExchange]?.website) && (
                <a
                  href={(exchangeInfo as any)[infoExchange].website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex mt-1 items-center gap-1 rounded-sm border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label={`Open ${String((exchangeInfo as any)[infoExchange]?.name || 'exchange')} website in a new tab`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Visit website
                </a>
              )}
              {/* Holidays */}
              {(() => {
                const mh = (marketHours as any)[infoExchange];
                type HolidayInfo = {
                  reason?: string;
                  closeEarly?: boolean;
                  earlyCloseTime?: string;
                };
                const holidaysObj: Record<string, HolidayInfo> = (mh?.holidays || {}) as Record<
                  string,
                  HolidayInfo
                >;
                const entries = Object.entries(holidaysObj).sort(([a], [b]) => a.localeCompare(b));
                if (!entries.length) return null;
                const years = Array.from(new Set(entries.map(([d]) => d.slice(0, 4))));
                return (
                  <div className="mt-3">
                    <div className="mb-1 flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold">Holidays</h3>
                      <span className="text-xs text-muted-foreground">{years.join(', ')}</span>
                    </div>
                    <ul className="max-h-48 overflow-auto pr-1 divide-y divide-border rounded-md border">
                      {entries.map(([date, info]) => {
                        const tag = info.closeEarly
                          ? `Early close${info.earlyCloseTime ? ` ${info.earlyCloseTime}` : ''}`
                          : 'Closed';
                        const isEarly = Boolean(info.closeEarly);
                        return (
                          <li
                            key={date}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{info.reason || 'Holiday'}</div>
                              <div className="text-xs text-muted-foreground">{date}</div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${
                                isEarly
                                  ? 'bg-secondary text-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {tag}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
