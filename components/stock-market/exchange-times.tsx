'use client';

import { ExternalLink, Heart } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { exchangeSession, type ExchangeSchedule } from '@/lib/exchange-session';
import marketHours, { exchangeInfo } from '@/lib/exchangeinfo.js';

const exchanges = Object.entries(marketHours) as [
  string,
  ExchangeSchedule & { city: string; region: string },
][];
const regions = [...new Set(exchanges.map(([, schedule]) => schedule.region))].sort();
const favoritesKey = 'et.exchange-favorites.v1';

export default function ExchangeTimes() {
  const [filter, setFilter] = useState('');
  const [region, setRegion] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoExchange, setInfoExchange] = useState<string | null>(null);
  const { theme } = useTheme();
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
      if (Array.isArray(stored))
        setFavorites(stored.filter((name) => Object.hasOwn(marketHours, name)));
    } catch {}
    function update() {
      if (document.visibilityState === 'visible') setNow(new Date());
    }
    document.addEventListener('visibilitychange', update);
    const interval = window.setInterval(update, 15000);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  function toggle(name: string) {
    const next = favorites.includes(name)
      ? favorites.filter((item) => item !== name)
      : [...favorites, name];
    setFavorites(next);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(next));
      setNotice('');
    } catch {
      setNotice('Favorites changed for this session only.');
    }
  }
  const visible = exchanges.filter(
    ([name, schedule]) =>
      (!region || region === schedule.region) &&
      (!onlyFavorites || favorites.includes(name)) &&
      (name + ' ' + schedule.city).toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <section className="exchange-hours-workspace">
      <div className="exchange-toolbar">
        <input
          type="search"
          className="terminal-input"
          aria-label="Search exchanges"
          placeholder="Exchange or city"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          className="terminal-input"
          aria-label="Exchange region"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        >
          <option value="">All regions</option>
          {regions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          type="button"
          className="terminal-button"
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((value) => !value)}
        >
          <Heart size={15} aria-hidden fill={onlyFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
      </div>
      <header className="exchange-ledger-heading">
        <h2>{onlyFavorites ? 'Favorite exchanges' : 'Exchange sessions'}</h2>
        <span>{visible.length} · Local times</span>
      </header>
      {notice && <p role="status">{notice}</p>}
      {!visible.length && (
        <p className="terminal-empty">
          {onlyFavorites && !favorites.length
            ? 'Save an exchange with the heart button.'
            : 'No matching exchanges.'}
        </p>
      )}
      <ul className="exchange-ledger">
        {visible.map(([name, schedule]) => {
          const session = exchangeSession(schedule, now);
          return (
            <li key={name}>
              <button
                type="button"
                className="exchange-identity"
                onClick={() => {
                  setInfoExchange(name);
                  setInfoOpen(true);
                }}
              >
                <strong>{name}</strong>
                <span>{schedule.city}</span>
              </button>
              <div className="exchange-clock">
                <strong>{session.localTime}</strong>
                <span>{session.hours}</span>
              </div>
              <div className="exchange-status">
                <strong data-open={session.status === 'Open'}>{session.status}</strong>
                <span>{session.next || 'Check exchange calendar'}</span>
              </div>
              <button
                type="button"
                className="terminal-icon"
                aria-pressed={favorites.includes(name)}
                aria-label={'Favorite ' + name}
                onClick={() => toggle(name)}
              >
                <Heart size={16} fill={favorites.includes(name) ? 'currentColor' : 'none'} />
              </button>
            </li>
          );
        })}
      </ul>
      <details className="data-details">
        <summary>Schedule details</summary>
        <p>
          Exchange-local clocks and regular sessions use the bundled holiday calendar, not a live
          trading-status feed. Unplanned closures are not included.
        </p>
      </details>
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
    </section>
  );
}
