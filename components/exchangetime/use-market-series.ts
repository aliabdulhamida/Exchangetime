'use client';

import { useEffect, useState } from 'react';

export type MarketSeries = {
  prices: number[];
  timestamps: number[];
  observedAt: number;
  fetchedAt: number;
  currency: string | null;
};
type Entry = { data?: MarketSeries; error?: string };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry>>();
const TTL = 180_000;

async function load(symbol: string): Promise<Entry> {
  const previous = cache.get(symbol);
  if (previous?.data && Date.now() - previous.data.fetchedAt < TTL && !previous.error)
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
      const closes: unknown[] = result?.indicators?.quote?.[0]?.close || [];
      const prices: number[] = [];
      const timestamps: number[] = [];
      closes.forEach((price, index) => {
        const stamp = result?.timestamp?.[index];
        if (
          typeof price === 'number' &&
          Number.isFinite(price) &&
          price > 0 &&
          Number.isFinite(stamp)
        ) {
          prices.push(price);
          timestamps.push(stamp * 1000);
        }
      });
      if (!prices.length) throw new Error('No observations');
      entry = {
        data: {
          prices,
          timestamps,
          observedAt: result.meta?.regularMarketTime
            ? result.meta.regularMarketTime * 1000
            : timestamps[timestamps.length - 1],
          fetchedAt: Date.now(),
          currency: result.meta?.currency || null,
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
  useEffect(() => {
    let active = true;
    const requested = key.split('|').filter(Boolean);
    requested.forEach((symbol) => {
      const cached = cache.get(symbol);
      if (cached) setEntries((current) => ({ ...current, [symbol]: cached }));
      void load(symbol).then((entry) => {
        if (active) setEntries((current) => ({ ...current, [symbol]: entry }));
      });
    });
    return () => {
      active = false;
    };
  }, [key, revision]);
  function refresh() {
    key.split('|').forEach((symbol) => {
      const entry = cache.get(symbol);
      if (entry?.data) entry.data.fetchedAt = 0;
    });
    setRevision((value) => value + 1);
  }
  return { entries, refresh };
}

export function seriesChange(series: MarketSeries | undefined, sessions = 1): number | null {
  if (!series || series.prices.length <= sessions) return null;
  const last = series.prices[series.prices.length - 1];
  const base = series.prices[series.prices.length - 1 - sessions];
  return (last / base - 1) * 100;
}

export function signedPercent(value: number | null) {
  return value === null ? '—' : (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}
