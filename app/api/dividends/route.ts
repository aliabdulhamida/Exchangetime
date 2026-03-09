import { NextResponse } from 'next/server';

type DividendCalendarItem = {
  symbol: string;
  company: string;
  exDate: string;
  forwardYieldPct: number | null;
  source: 'upcoming_exdates';
  market: string;
  exchange: string;
  instrumentType: string;
  currency: string;
  declarationDate: string;
  recordDate: string;
  paymentDate: string;
};

type NasdaqDividendRow = {
  symbol?: unknown;
  companyName?: unknown;
  dividend_Ex_Date?: unknown;
  payment_Date?: unknown;
  record_Date?: unknown;
  announcement_Date?: unknown;
};

type CachedDividendPayload = {
  fetchedAt: number;
  cacheKey: string;
  data: Record<string, DividendCalendarItem[]>;
};

type DividendRuntimeState = {
  providerBackoffUntil: number;
  providerErrorLogged: boolean;
  inFlightByCacheKey: Map<string, Promise<Record<string, DividendCalendarItem[]>>>;
};

const NASDAQ_API_BASE = 'https://api.nasdaq.com';
const REQUEST_TIMEOUT_MS = 12000;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const PROVIDER_BACKOFF_MS = 10 * 60 * 1000; // 10 minutes
const LOOKBACK_DAYS = 7;
const LOOKAHEAD_DAYS = 30;
const REQUEST_CONCURRENCY = 5;
const DEFAULT_MARKET = 'america';

const globalDividendCache = globalThis as typeof globalThis & {
  __dividendCalendarCache?: CachedDividendPayload;
  __dividendCalendarRuntime?: DividendRuntimeState;
};

function getRuntimeState(): DividendRuntimeState {
  if (!globalDividendCache.__dividendCalendarRuntime) {
    globalDividendCache.__dividendCalendarRuntime = {
      providerBackoffUntil: 0,
      providerErrorLogged: false,
      inFlightByCacheKey: new Map(),
    };
  }
  return globalDividendCache.__dividendCalendarRuntime;
}

function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(base: Date, offsetDays: number): Date {
  const shifted = new Date(base);
  shifted.setUTCDate(base.getUTCDate() + offsetDays);
  return shifted;
}

function buildDateWindow() {
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fromDate = shiftDate(anchor, -LOOKBACK_DAYS);
  const toDate = shiftDate(anchor, LOOKAHEAD_DAYS);

  const keys: string[] = [];
  for (let offset = -LOOKBACK_DAYS; offset <= LOOKAHEAD_DAYS; offset += 1) {
    keys.push(toDateKey(shiftDate(anchor, offset)));
  }

  return {
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
    keys,
  };
}

function buildEmptyCalendar(dateKeys: string[]): Record<string, DividendCalendarItem[]> {
  const mapped: Record<string, DividendCalendarItem[]> = {};
  for (const key of dateKeys) mapped[key] = [];
  return mapped;
}

function normalizeSymbol(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizeDateKey(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return toDateKey(new Date(Math.trunc(value) * 1000));
  }

  const text = String(value || '').trim();
  if (!text) return null;

  if (/^\d{10}$/.test(text)) {
    return toDateKey(new Date(Number(text) * 1000));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const month = String(Number(slash[1])).padStart(2, '0');
    const day = String(Number(slash[2])).padStart(2, '0');
    const year = slash[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

function extractErrorStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object' || !('status' in err)) return null;
  const rawStatus = (err as { status?: unknown }).status;
  if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) return rawStatus;
  const coerced = Number(rawStatus);
  return Number.isFinite(coerced) ? coerced : null;
}

function isWeekendDateKey(dateKey: string): boolean {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNasdaqRowsForDate(dateKey: string): Promise<NasdaqDividendRow[]> {
  const url = `${NASDAQ_API_BASE}/api/calendar/dividends?date=${encodeURIComponent(dateKey)}`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      referer: 'https://www.nasdaq.com/market-activity/dividends',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as Record<string, unknown>).message || '')
        : 'Failed to fetch Nasdaq dividend calendar';
    const err = new Error(message || 'Failed to fetch Nasdaq dividend calendar') as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  const rows = (data as any)?.data?.calendar?.rows;
  return Array.isArray(rows) ? (rows as NasdaqDividendRow[]) : [];
}

function toCalendarItem(row: NasdaqDividendRow): DividendCalendarItem | null {
  const symbol = normalizeSymbol(row.symbol);
  const exDate = normalizeDateKey(row.dividend_Ex_Date);
  if (!symbol || !exDate) return null;

  const company = String(row.companyName || symbol).trim() || symbol;
  const declarationDate = normalizeDateKey(row.announcement_Date) ?? '';
  const recordDate = normalizeDateKey(row.record_Date) ?? '';
  const paymentDate = normalizeDateKey(row.payment_Date) ?? '';

  return {
    symbol,
    company,
    exDate,
    forwardYieldPct: null,
    source: 'upcoming_exdates',
    market: DEFAULT_MARKET,
    exchange: '',
    instrumentType: 'stock',
    currency: 'USD',
    declarationDate,
    recordDate,
    paymentDate,
  };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const poolSize = Math.max(1, Math.min(concurrency, items.length));
  let index = 0;
  const runners = Array.from({ length: poolSize }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function fetchNormalizedPayloadWithDedupe(
  cacheKey: string,
  dateKeys: string[],
): Promise<Record<string, DividendCalendarItem[]>> {
  const runtime = getRuntimeState();
  const inFlight = runtime.inFlightByCacheKey.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const mapped = buildEmptyCalendar(dateKeys);
    const allowedDateKeys = new Set(dateKeys);
    const fetchableDateKeys = dateKeys.filter((dateKey) => !isWeekendDateKey(dateKey));

    let firstError: unknown = null;
    let failedRequests = 0;

    await runWithConcurrency(fetchableDateKeys, REQUEST_CONCURRENCY, async (dateKey) => {
      try {
        const rows = await fetchNasdaqRowsForDate(dateKey);
        for (const row of rows) {
          const item = toCalendarItem(row);
          if (!item) continue;
          if (!allowedDateKeys.has(item.exDate)) continue;
          mapped[item.exDate].push(item);
        }
      } catch (err) {
        failedRequests += 1;
        if (!firstError) firstError = err;
      }
    });

    if (firstError && failedRequests > Math.max(2, Math.floor(fetchableDateKeys.length * 0.35))) {
      throw firstError;
    }

    for (const key of Object.keys(mapped)) {
      mapped[key].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return mapped;
  })();

  runtime.inFlightByCacheKey.set(cacheKey, request);
  try {
    return await request;
  } finally {
    runtime.inFlightByCacheKey.delete(cacheKey);
  }
}

export async function GET(request: Request) {
  const runtime = getRuntimeState();
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  const market = (url.searchParams.get('market') || DEFAULT_MARKET).trim() || DEFAULT_MARKET;
  const { from, to, keys } = buildDateWindow();
  const cacheKey = `${from}|${to}|${market}`;

  const now = Date.now();
  const cached = globalDividendCache.__dividendCalendarCache;
  if (!forceRefresh && cached && cached.cacheKey === cacheKey && now - cached.fetchedAt < CACHE_DURATION_MS) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=1800' },
    });
  }

  if (runtime.providerBackoffUntil > now) {
    if (cached && cached.cacheKey === cacheKey && Object.keys(cached.data).length > 0) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=1800',
          'X-Provider-Stale': '1',
        },
      });
    }

    return NextResponse.json(buildEmptyCalendar(keys), {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=1800',
        'X-Provider-Stale': '1',
      },
    });
  }

  try {
    const normalized = await fetchNormalizedPayloadWithDedupe(cacheKey, keys);
    runtime.providerBackoffUntil = 0;
    runtime.providerErrorLogged = false;

    globalDividendCache.__dividendCalendarCache = {
      fetchedAt: now,
      cacheKey,
      data: normalized,
    };

    return NextResponse.json(normalized, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=1800' },
    });
  } catch (err) {
    const status = extractErrorStatus(err);
    const isTimeout = err && typeof err === 'object' && 'name' in err && err.name === 'AbortError';
    const transientError =
      isTimeout || status === 429 || status === 403 || (status !== null && status >= 500);

    if (transientError) {
      runtime.providerBackoffUntil = now + PROVIDER_BACKOFF_MS;
    }

    if (!runtime.providerErrorLogged) {
      console.warn('[api/dividends] Nasdaq dividend provider failed; serving stale/empty data.', {
        status,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      runtime.providerErrorLogged = true;
    }

    if (cached && cached.cacheKey === cacheKey && Object.keys(cached.data).length > 0) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=1800',
          'X-Provider-Stale': '1',
        },
      });
    }

    return NextResponse.json(buildEmptyCalendar(keys), {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=1800',
        'X-Provider-Stale': '1',
      },
    });
  }
}

