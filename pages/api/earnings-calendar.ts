import type { NextApiRequest, NextApiResponse } from 'next';

type EarningsCalendarItem = {
  symbol: string;
  company: string;
  hour: 'bmo' | 'amc' | '';
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  marketCap: string;
  fiscalQuarterEnding: string;
  lastYearReportDate: string;
  lastYearEPS: number | null;
  numberOfEstimates: number | null;
  currency: string;
  market: string;
  instrumentType: string;
  exchange: string;
};

type EarningsHubCalendarRow = {
  symbol?: unknown;
  assetName?: unknown;
  earningsDate?: unknown;
  earningsDateTime?: unknown;
  earningsTime?: unknown;
  period?: unknown;
  periodYear?: unknown;
  epsEstimate?: unknown;
  eps?: unknown;
  epsPrior?: unknown;
  revenueEstimate?: unknown;
  revenue?: unknown;
  marketCap?: unknown;
};

const EARNINGS_HUB_API_BASE = 'https://api.savvytrader.com';
const REQUEST_TIMEOUT_MS = 12000;
const LOOKBACK_DAYS = 7;
const LOOKAHEAD_DAYS = 30;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const PROVIDER_BACKOFF_MS = 10 * 60 * 1000; // 10 minutes

let cachedData: Record<string, EarningsCalendarItem[]> = {};
let lastFetch = 0;
let providerBackoffUntil = 0;
let providerErrorLogged = false;

function extractErrorStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object' || !('status' in err)) return null;
  const rawStatus = (err as { status?: unknown }).status;
  if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) return rawStatus;
  const coerced = Number(rawStatus);
  return Number.isFinite(coerced) ? coerced : null;
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

function getDateWindow() {
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

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let text = String(value).trim();
  if (!text) return null;

  const bracketedNegative = text.match(/^\((.*)\)$/);
  const isNegative = bracketedNegative !== null;
  if (bracketedNegative) text = bracketedNegative[1];

  text = text.replace(/[^0-9.-]/g, '');
  if (!text || text === '-' || text === '.' || text === '-.') return null;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return isNegative ? -Math.abs(parsed) : parsed;
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

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

function parseEventTimestamp(row: EarningsHubCalendarRow): number | null {
  const fromDateTime = String(row.earningsDateTime || '').trim();
  if (fromDateTime) {
    const parsed = new Date(fromDateTime);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  const date = String(row.earningsDate || '').trim();
  if (!date) return null;
  const time = String(row.earningsTime || '').trim() || '00:00:00';
  const parsed = new Date(`${date}T${time}Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

function mapHour(row: EarningsHubCalendarRow): 'bmo' | 'amc' | '' {
  const timeText = String(row.earningsTime || '').trim();
  const hourFromTime = Number(timeText.split(':')[0]);
  if (Number.isFinite(hourFromTime)) {
    if (hourFromTime >= 16) return 'amc';
    if (hourFromTime < 12) return 'bmo';
    return '';
  }

  const eventTs = parseEventTimestamp(row);
  if (eventTs === null) return '';
  const date = new Date(eventTs);
  const hourText = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return '';
  if (hour >= 16) return 'amc';
  if (hour < 12) return 'bmo';
  return '';
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

async function fetchEarningsHubRows(from: string, to: string): Promise<unknown> {
  const url = `${EARNINGS_HUB_API_BASE}/pricing/assets/earnings/calendar?start=${encodeURIComponent(
    from,
  )}&end=${encodeURIComponent(to)}`;

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const bodyText = await response.text();
  let body: unknown = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as Record<string, unknown>).message || '')
        : 'Failed to fetch earnings provider';
    const err = new Error(message || 'Failed to fetch earnings provider') as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  return body;
}

function normalizeEarningsRows(
  payload: unknown,
  dateKeys: string[],
): Record<string, EarningsCalendarItem[]> {
  const mapped: Record<string, EarningsCalendarItem[]> = {};
  for (const key of dateKeys) mapped[key] = [];
  const allowedDateKeys = new Set(dateKeys);

  const rows = Array.isArray(payload) ? (payload as EarningsHubCalendarRow[]) : [];

  for (const row of rows) {
    const reportDateKey = normalizeDateKey(row.earningsDate ?? row.earningsDateTime);
    if (!reportDateKey || !allowedDateKeys.has(reportDateKey)) continue;

    const symbol = normalizeSymbol(row.symbol);
    if (!symbol) continue;

    const company = String(row.assetName || symbol).trim() || symbol;
    const eventTs = parseEventTimestamp(row);
    const isFutureReport = eventTs !== null && eventTs > Date.now();
    const period = String(row.period || '').trim();
    const periodYear = parseNumeric(row.periodYear);
    const fiscalQuarterEnding = period && periodYear !== null ? `${period} ${periodYear}` : '';

    mapped[reportDateKey].push({
      symbol,
      company,
      hour: mapHour(row),
      epsEstimate: parseNumeric(row.epsEstimate),
      epsActual: isFutureReport ? null : parseNumeric(row.eps),
      revenueEstimate: parseNumeric(row.revenueEstimate),
      revenueActual: isFutureReport ? null : parseNumeric(row.revenue),
      marketCap: String(parseNumeric(row.marketCap) ?? ''),
      fiscalQuarterEnding,
      lastYearReportDate: '',
      lastYearEPS: parseNumeric(row.epsPrior),
      numberOfEstimates: null,
      currency: 'USD',
      market: 'america',
      instrumentType: 'stock',
      exchange: '',
    });
  }

  for (const key of Object.keys(mapped)) {
    mapped[key].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  return mapped;
}

function buildEmptyCalendar(dateKeys: string[]): Record<string, EarningsCalendarItem[]> {
  const mapped: Record<string, EarningsCalendarItem[]> = {};
  for (const key of dateKeys) mapped[key] = [];
  return mapped;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const now = Date.now();
  const refreshQuery = req.query.refresh;
  const forceRefresh =
    refreshQuery === '1' || (Array.isArray(refreshQuery) && refreshQuery.includes('1'));

  const { from, to, keys } = getDateWindow();

  if (!forceRefresh && now - lastFetch < CACHE_DURATION && Object.keys(cachedData).length > 0) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json(cachedData);
    return;
  }

  if (providerBackoffUntil > now) {
    if (Object.keys(cachedData).length > 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=1800');
      res.setHeader('X-Provider-Stale', '1');
      res.status(200).json(cachedData);
      return;
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=1800');
    res.setHeader('X-Provider-Stale', '1');
    res.status(200).json(buildEmptyCalendar(keys));
    return;
  }

  try {
    const payload = await fetchEarningsHubRows(from, to);
    const data = normalizeEarningsRows(payload, keys);

    providerBackoffUntil = 0;
    providerErrorLogged = false;
    cachedData = data;
    lastFetch = now;

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json(data);
  } catch (err) {
    const status = extractErrorStatus(err);
    const isTimeout = err && typeof err === 'object' && 'name' in err && err.name === 'AbortError';
    const providerClientError = status !== null && status >= 400 && status < 500;
    const shouldBackoff = providerClientError || isTimeout;

    if (shouldBackoff) {
      providerBackoffUntil = now + PROVIDER_BACKOFF_MS;
      if (!providerErrorLogged) {
        console.warn('[api/earnings-calendar] EarningsHub provider degraded; serving stale/empty data.');
        providerErrorLogged = true;
      }
    } else {
      console.error('Earnings calendar API error:', err);
    }

    if (Object.keys(cachedData).length > 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=1800');
      res.setHeader('X-Provider-Stale', '1');
      res.status(200).json(cachedData);
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=1800');
    if (providerClientError || isTimeout) {
      res.setHeader('X-Provider-Stale', '1');
      res.status(200).json(buildEmptyCalendar(keys));
      return;
    }

    res.status(status ?? 500).json({
      error: 'Failed to fetch earnings calendar',
    });
  }
}
