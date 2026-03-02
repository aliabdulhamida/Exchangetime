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
};

const NASDAQ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.nasdaq.com/',
};

const LOOKBACK_DAYS = 7;
const LOOKAHEAD_DAYS = 14;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

let cachedData: Record<string, EarningsCalendarItem[]> = {};
let lastFetch = 0;

function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(): string[] {
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const keys: string[] = [];

  for (let offset = -LOOKBACK_DAYS; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const current = new Date(anchor);
    current.setUTCDate(anchor.getUTCDate() + offset);
    keys.push(toDateKey(current));
  }

  return keys;
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

function mapTimeSlot(value: unknown): 'bmo' | 'amc' | '' {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('pre-market')) return 'bmo';
  if (normalized.includes('after-hours')) return 'amc';
  return '';
}

function normalizeRow(row: any): EarningsCalendarItem | null {
  const symbol = String(row?.symbol || '')
    .trim()
    .toUpperCase();
  if (!symbol) return null;

  return {
    symbol,
    company: String(row?.name || symbol),
    hour: mapTimeSlot(row?.time),
    epsEstimate: parseNumeric(row?.epsForecast),
    epsActual: null,
    revenueEstimate: null,
    revenueActual: null,
    marketCap: String(row?.marketCap || ''),
    fiscalQuarterEnding: String(row?.fiscalQuarterEnding || ''),
    lastYearReportDate: String(row?.lastYearRptDt || ''),
    lastYearEPS: parseNumeric(row?.lastYearEPS),
    numberOfEstimates: parseNumeric(row?.noOfEsts),
  };
}

async function fetchNasdaqJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, {
      headers: NASDAQ_HEADERS,
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function fetchEarningsCalendar(): Promise<Record<string, EarningsCalendarItem[]>> {
  const dateKeys = getDateRange();
  const results = await Promise.all(
    dateKeys.map(async (dateKey) => {
      const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateKey}`;
      const payload = await fetchNasdaqJson(url);
      const rows = Array.isArray(payload?.data?.rows) ? payload.data.rows : [];
      const normalizedRows = rows
        .map((row: any) => normalizeRow(row))
        .filter((item: EarningsCalendarItem | null): item is EarningsCalendarItem => item !== null);

      return [dateKey, normalizedRows] as const;
    }),
  );

  const mapped: Record<string, EarningsCalendarItem[]> = {};
  for (const [key, rows] of results) {
    mapped[key] = rows;
  }
  return mapped;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const now = Date.now();
  if (now - lastFetch < CACHE_DURATION && Object.keys(cachedData).length > 0) {
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=21600');
    res.status(200).json(cachedData);
    return;
  }

  try {
    const data = await fetchEarningsCalendar();
    cachedData = data;
    lastFetch = now;
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=21600');
    res.status(200).json(data);
  } catch (err) {
    console.error('Earnings calendar API error:', err);
    res.status(500).json({ error: 'Failed to fetch earnings calendar' });
  }
}
