import { alignMarketCloses } from './market-observations';

export type AssetSnapshot = {
  price: number | null; changePercent: number | null; currency: string | null;
  week52High: number | null; week52Low: number | null;
  observedAt: number | null; retrievedAt: string;
  points: {date: number; price: number}[];
};

function finite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseAssetSnapshot(payload: unknown, retrievedAt: string): AssetSnapshot {
  const root = payload as {chart?: {result?: {meta?: Record<string, unknown>; timestamp?: unknown; indicators?: {quote?: {close?: unknown}[]}}[]}};
  const result = root?.chart?.result?.[0];
  if (!result?.meta) throw new Error('Missing asset data');
  const meta = result.meta;
  const series = alignMarketCloses(result.timestamp, result.indicators?.quote?.[0]?.close);
  const points = series.timestamps.map((stamp, index) => ({date: stamp * 1000, price: series.prices[index]}))
    .sort((left, right) => left.date - right.date)
    .filter((point, index, all) => index === 0 || point.date !== all[index - 1].date);
  const price = finite(meta.regularMarketPrice);
  const observedAt = finite(meta.regularMarketTime);
  const previous = finite(meta.previousClose);
  const last = points.at(-1);
  const aligned = observedAt !== null && last && new Date(last.date).toISOString().slice(0, 10) === new Date(observedAt * 1000).toISOString().slice(0, 10);
  const previousClose = previous ?? (aligned ? points.at(-2)?.price ?? null : null);
  return {
    price, currency: typeof meta.currency === 'string' && /^[A-Z]{3}$/.test(meta.currency) ? meta.currency : null,
    changePercent: price !== null && previousClose !== null && previousClose > 0 ? (price / previousClose - 1) * 100 : null,
    week52High: finite(meta.fiftyTwoWeekHigh), week52Low: finite(meta.fiftyTwoWeekLow),
    observedAt, retrievedAt, points,
  };
}
