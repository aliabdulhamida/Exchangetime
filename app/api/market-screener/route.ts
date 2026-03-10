import { NextRequest, NextResponse } from 'next/server';

import { fetchYahooJson, toFiniteNumber, toNullableString } from '@/lib/server/yahoo-finance';

export const dynamic = 'force-dynamic';

const DEFAULT_COUNT = 25;
const MAX_COUNT = 50;
const MAX_START = 500;

type ScreenerBaseKey = 'gainers' | 'losers' | 'mostActive';
type ScreenerKey = ScreenerBaseKey | 'movers';

type ScreenerRow = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  exchange: string | null;
  currency: string | null;
  regularMarketTime: number | null;
};

type ScreenerList = {
  title: string;
  description: string;
  asOf: number | null;
  rows: ScreenerRow[];
};

const SCREENER_CONFIGS: Array<{
  key: ScreenerBaseKey;
  scrId: string;
  fallbackTitle: string;
  fallbackDescription: string;
}> = [
  {
    key: 'gainers',
    scrId: 'day_gainers',
    fallbackTitle: 'Top Gainers',
    fallbackDescription: 'Largest percentage gainers during the current trading session.',
  },
  {
    key: 'losers',
    scrId: 'day_losers',
    fallbackTitle: 'Top Losers',
    fallbackDescription: 'Largest percentage decliners during the current trading session.',
  },
  {
    key: 'mostActive',
    scrId: 'most_actives',
    fallbackTitle: 'Most Active',
    fallbackDescription: 'Most traded stocks ranked by current session volume.',
  },
];

function parseCompactNumber(value: string): number | null {
  const cleaned = value
    .replace(/[$,%\s]/g, '')
    .replace(/,/g, '')
    .trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)([KMBT])?$/i);
  if (!match) {
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;

  const suffix = String(match[2] || '').toUpperCase();
  if (suffix === 'K') return base * 1_000;
  if (suffix === 'M') return base * 1_000_000;
  if (suffix === 'B') return base * 1_000_000_000;
  if (suffix === 'T') return base * 1_000_000_000_000;
  return base;
}

function toNumeric(value: unknown): number | null {
  const direct = toFiniteNumber(value);
  if (direct !== null) return direct;

  if (typeof value === 'string') {
    return parseCompactNumber(value);
  }

  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return (
    toFiniteNumber(record.raw) ??
    parseCompactNumber(String(record.longFmt || '')) ??
    parseCompactNumber(String(record.fmt || '')) ??
    null
  );
}

function normalizeCount(raw: string | null): number {
  if (!raw) return DEFAULT_COUNT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_COUNT;
  const rounded = Math.floor(parsed);
  if (rounded <= 0) return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, rounded);
}

function normalizeStart(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.floor(parsed);
  if (rounded < 0) return 0;
  return Math.min(MAX_START, rounded);
}

function normalizeScreenerRow(raw: any): ScreenerRow | null {
  const symbol = toNullableString(raw?.symbol)?.toUpperCase();
  if (!symbol) return null;

  const name =
    toNullableString(raw?.longName) ||
    toNullableString(raw?.shortName) ||
    toNullableString(raw?.displayName) ||
    symbol;

  const regularMarketTimeRaw = toNumeric(raw?.regularMarketTime);

  return {
    symbol,
    name,
    price: toNumeric(raw?.regularMarketPrice),
    change: toNumeric(raw?.regularMarketChange),
    changePercent: toNumeric(raw?.regularMarketChangePercent),
    volume: toNumeric(raw?.regularMarketVolume),
    averageVolume:
      toNumeric(raw?.averageDailyVolume3Month) ?? toNumeric(raw?.averageDailyVolume10Day),
    marketCap: toNumeric(raw?.marketCap),
    exchange: toNullableString(raw?.fullExchangeName) || toNullableString(raw?.exchange),
    currency: toNullableString(raw?.currency),
    regularMarketTime:
      regularMarketTimeRaw !== null && Number.isFinite(regularMarketTimeRaw)
        ? Math.floor(regularMarketTimeRaw)
        : null,
  };
}

function buildScreenerUrl(scrId: string, count: number, start: number): string {
  const params = new URLSearchParams({
    formatted: 'true',
    lang: 'en-US',
    region: 'US',
    scrIds: scrId,
    count: String(count),
    start: String(start),
  });
  return `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?${params.toString()}`;
}

function sortRows(key: ScreenerBaseKey, rows: ScreenerRow[]): ScreenerRow[] {
  const copy = [...rows];
  if (key === 'gainers') {
    return copy.sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  }
  if (key === 'losers') {
    return copy.sort((a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity));
  }
  return copy.sort((a, b) => (b.volume ?? -Infinity) - (a.volume ?? -Infinity));
}

function buildMovers(lists: Record<ScreenerBaseKey, ScreenerList>, count: number): ScreenerList {
  const bySymbol = new Map<string, ScreenerRow>();
  for (const key of ['gainers', 'losers', 'mostActive'] as const) {
    for (const row of lists[key].rows) {
      const existing = bySymbol.get(row.symbol);
      if (!existing) {
        bySymbol.set(row.symbol, row);
        continue;
      }
      const nextAbs = Math.abs(row.changePercent ?? 0);
      const prevAbs = Math.abs(existing.changePercent ?? 0);
      if (nextAbs > prevAbs) {
        bySymbol.set(row.symbol, row);
      }
    }
  }

  const rows = Array.from(bySymbol.values())
    .filter((row) => row.changePercent !== null)
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, count);

  const asOf = rows.reduce<number | null>((max, row) => {
    if (!row.regularMarketTime) return max;
    if (max === null || row.regularMarketTime > max) return row.regularMarketTime;
    return max;
  }, null);

  return {
    title: 'Top Movers',
    description: 'Largest absolute percentage moves across gainers, losers, and active stocks.',
    asOf,
    rows,
  };
}

async function fetchList(
  config: (typeof SCREENER_CONFIGS)[number],
  count: number,
  start: number,
): Promise<ScreenerList> {
  const result = await fetchYahooJson(buildScreenerUrl(config.scrId, count, start));
  if (!result.ok) {
    const message =
      result.json?.finance?.error?.description ||
      result.json?.finance?.error?.code ||
      result.text.slice(0, 200) ||
      'Unknown Yahoo screener error';
    throw new Error(`${config.scrId}: ${message}`);
  }

  const screener = result.json?.finance?.result?.[0];
  const title = toNullableString(screener?.title) || config.fallbackTitle;
  const description = toNullableString(screener?.description) || config.fallbackDescription;
  const quotes = Array.isArray(screener?.quotes) ? screener.quotes : [];

  const rows = sortRows(
    config.key,
    quotes
      .map((quote: unknown) => normalizeScreenerRow(quote))
      .filter((quote: ScreenerRow | null): quote is ScreenerRow => quote !== null),
  );

  const asOf = rows.reduce<number | null>((max, row) => {
    if (!row.regularMarketTime) return max;
    if (max === null || row.regularMarketTime > max) return row.regularMarketTime;
    return max;
  }, null);

  return {
    title,
    description,
    asOf,
    rows,
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const count = normalizeCount(url.searchParams.get('count'));
    const start = normalizeStart(url.searchParams.get('start'));

    const entries = await Promise.all(
      SCREENER_CONFIGS.map(
        async (config) => [config.key, await fetchList(config, count, start)] as const,
      ),
    );

    const lists = Object.fromEntries(entries) as Record<ScreenerBaseKey, ScreenerList>;
    const movers = buildMovers(lists, count);

    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        source: 'yahoo',
        lists: {
          gainers: lists.gainers,
          losers: lists.losers,
          movers,
          mostActive: lists.mostActive,
        } as Record<ScreenerKey, ScreenerList>,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch market screener data',
        details: String(error?.message ?? error),
      },
      { status: 502 },
    );
  }
}
