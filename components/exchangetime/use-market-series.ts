'use client';

import { useEffect, useRef, useState } from 'react';

import { alignMarketCloses } from '@/lib/market-observations';

export type MarketSeries = {
  prices: number[];
  timestamps: number[];
  observedAt: number;
  fetchedAt: number;
  currency: string | null;
  name: string;
  instrumentType: string | null;
  exchange: string | null;
};
type Entry = { data?: MarketSeries; error?: string };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry>>();
const TTL = 180_000;

async function load(symbol: string, force = false): Promise<Entry> {
  const previous = cache.get(symbol);
  if (!force && previous?.data && Date.now() - previous.data.fetchedAt < TTL && !previous.error)
    return previous;
  if (pending.has(symbol)) return pending.get(symbol)!;
  const request = (async () => {
    let entry: Entry;
    try {
      const response = await fetch(
        '/api/quote?chart=1&range=3mo&interval=1d&symbol=' + encodeURIComponent(symbol),
        { signal: AbortSignal.timeout(20000) },
      );
      if (!response.ok) throw new Error('Provider unavailable');
      const payload = await response.json();
      const result = payload.chart?.result?.[0];
      const { prices, timestamps: seconds } = alignMarketCloses(result?.timestamp, result?.indicators?.quote?.[0]?.close);
      const timestamps = seconds.map(stamp => stamp * 1000);
      if (!prices.length) throw new Error('No observations');
      entry = {
        data: {
          prices,
          timestamps,
          observedAt: timestamps[timestamps.length - 1],
          fetchedAt: Date.now(),
          currency: result.meta?.currency || null,
          name: result.meta?.longName || result.meta?.shortName || symbol,
          instrumentType: result.meta?.instrumentType ?? null,
          exchange: result.meta?.fullExchangeName || result.meta?.exchangeName || null,
        },
      };
    } catch {
      entry = { data: previous?.data, error: 'Latest request failed' };
    }
    cache.set(symbol, entry);
    pending.delete(symbol);
    return entry;
  })();
  pending.set(symbol, request);
  return request;
}

export function useMarketSeries(symbols: string[]) {
  const key = symbols.join('|');
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [revision, setRevision] = useState(0);
  const previousRevision = useRef(0);
  useEffect(() => {
    let refreshedAt = Date.now();
    function revalidate() {
      if (document.visibilityState !== 'visible' || Date.now() - refreshedAt < TTL) return;
      refreshedAt = Date.now();
      setRevision(value => value + 1);
    }
    const interval = window.setInterval(revalidate, TTL);
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const requested = key.split('|').filter(Boolean);
    const force = previousRevision.current !== revision;
    previousRevision.current = revision;
    requested.forEach((symbol) => {
      const cached = cache.get(symbol);
      if (cached) setEntries((current) => ({ ...current, [symbol]: cached }));
      void load(symbol, force).then((entry) => {
        if (active) setEntries((current) => ({ ...current, [symbol]: entry }));
      });
    });
    return () => {
      active = false;
    };
  }, [key, revision]);
  function refresh() {
    setRevision((value) => value + 1);
  }
  return { entries, refresh };
}

export function seriesChange(series: MarketSeries | undefined, sessions = 1): number | null {
  if (!series || series.prices.length <= sessions) return null;
  const last = series.prices[series.prices.length - 1];
  const base = series.prices[series.prices.length - 1 - sessions];
  return base > 0 ? (last / base - 1) * 100 : null;
}

export function signedPercent(value: number | null) {
  return value === null ? '—' : (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}
