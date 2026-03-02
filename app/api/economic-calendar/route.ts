import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable/economic-calendar';

type ImpactLevel = 'High' | 'Medium' | 'Low' | 'Holiday' | 'Non-Economic' | 'Unknown';

type CalendarEvent = {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: ImpactLevel;
  forecast: string;
  previous: string;
  url: string;
  timestamp: number | null;
};

type CachedCalendarPayload = {
  fetchedAt: string;
  source: string;
  events: CalendarEvent[];
};

const globalCalendarCache = globalThis as typeof globalThis & {
  __economicCalendarCache?: CachedCalendarPayload;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toPositiveInt(rawValue: string | null, fallback: number, max: number): number {
  const parsed = Number(rawValue ?? '');
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const cloned = new Date(date);
  cloned.setDate(cloned.getDate() + days);
  return cloned;
}

function shouldKeepByImpact(eventImpact: ImpactLevel, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'high') return eventImpact === 'High';
  if (filter === 'medium') return eventImpact === 'Medium';
  if (filter === 'low') return eventImpact === 'Low';
  if (filter === 'medhigh') return eventImpact === 'Medium' || eventImpact === 'High';
  return true;
}

function shouldKeepByRange(timestamp: number | null, range: string): boolean {
  if (range === 'all' || timestamp === null) return true;
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (range === 'today') return timestamp >= startOfToday.getTime();
  if (range === '24h') return timestamp >= now && timestamp <= now + 24 * 60 * 60 * 1000;
  if (range === 'week') return timestamp >= now && timestamp <= now + 7 * 24 * 60 * 60 * 1000;
  return true;
}

function parseImpact(value: unknown): ImpactLevel {
  if (typeof value === 'number') {
    if (value >= 3) return 'High';
    if (value === 2) return 'Medium';
    if (value === 1) return 'Low';
  }
  const raw = normalizeText(String(value ?? '')).toLowerCase();
  if (raw.includes('high') || raw === '3') return 'High';
  if (raw.includes('medium') || raw.includes('med') || raw === '2') return 'Medium';
  if (raw.includes('low') || raw === '1') return 'Low';
  if (raw.includes('holiday')) return 'Holiday';
  if (raw.includes('non-economic')) return 'Non-Economic';
  return 'Unknown';
}

function toCountryToken(item: any): string {
  const currency = normalizeText(String(item?.currency ?? item?.Currency ?? '')).toUpperCase();
  if (currency && currency.length <= 8 && /^[A-Z]+$/.test(currency)) return currency;
  return normalizeText(String(item?.country ?? item?.Country ?? '')).toUpperCase() || 'N/A';
}

function parseTimestamp(dateValue: string): number | null {
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function parseFmpEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) throw new Error('Invalid FMP payload');
  const events = raw
    .map((item: any): CalendarEvent => {
      const dateRaw = normalizeText(String(item?.date ?? item?.Date ?? ''));
      const timestamp = dateRaw ? parseTimestamp(dateRaw) : null;
      const title =
        normalizeText(
          String(item?.event ?? item?.Event ?? item?.indicator ?? item?.Indicator ?? ''),
        ) || 'Economic Event';

      return {
        title,
        country: toCountryToken(item),
        date: timestamp ? new Date(timestamp).toISOString().slice(0, 10) : dateRaw || '-',
        time: timestamp
          ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'N/A',
        impact: parseImpact(item?.impact ?? item?.Impact),
        forecast:
          normalizeText(String(item?.estimate ?? item?.forecast ?? item?.Forecast ?? '-')) || '-',
        previous: normalizeText(String(item?.previous ?? item?.Previous ?? '-')) || '-',
        url: normalizeText(String(item?.url ?? item?.URL ?? '')),
        timestamp,
      };
    })
    .filter((event) => event.title && event.country);

  if (events.length === 0) throw new Error('FMP returned no events');
  return events;
}

function buildFmpRange(rangeFilter: string): { from: string; to: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (rangeFilter === 'today') return { from: toDateOnly(now), to: toDateOnly(now) };
  if (rangeFilter === '24h') return { from: toDateOnly(now), to: toDateOnly(addDays(now, 1)) };
  if (rangeFilter === 'week') return { from: toDateOnly(now), to: toDateOnly(addDays(now, 7)) };
  return { from: toDateOnly(addDays(now, -7)), to: toDateOnly(addDays(now, 30)) };
}

async function fetchFmpEvents(
  rangeFilter: string,
): Promise<{ source: string; events: CalendarEvent[] }> {
  const apiKey = normalizeText(process.env.FMP_API_KEY || '');
  if (!apiKey) throw new Error('FMP_API_KEY is missing');

  const { from, to } = buildFmpRange(rangeFilter);
  const url = `${FMP_BASE_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime Economic Calendar/1.0)',
      Accept: 'application/json,text/plain,*/*',
    },
  });
  const text = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('FMP response was not valid JSON');
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed['Error Message']) {
    throw new Error(String(parsed['Error Message']));
  }

  if (!response.ok) {
    throw new Error(`FMP HTTP ${response.status}`);
  }

  return { source: 'fmp', events: parseFmpEvents(parsed) };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = toPositiveInt(searchParams.get('limit'), 100, 300);
    const impactFilter = (searchParams.get('impact') || 'medhigh').toLowerCase();
    const rangeFilter = (searchParams.get('range') || 'week').toLowerCase();
    const countryFilter = new Set(
      (searchParams.get('countries') || '')
        .split(',')
        .map((country) => normalizeText(country).toUpperCase())
        .filter(Boolean),
    );

    let source = 'fmp';
    let fetchedAt = new Date().toISOString();
    let stale = false;
    let events: CalendarEvent[] = [];

    try {
      const live = await fetchFmpEvents(rangeFilter);
      source = live.source;
      events = live.events;
      globalCalendarCache.__economicCalendarCache = {
        fetchedAt,
        source,
        events,
      };
    } catch (fetchError) {
      const cached = globalCalendarCache.__economicCalendarCache;
      const hasFmpCache =
        Boolean(cached) &&
        cached!.events.length > 0 &&
        typeof cached!.source === 'string' &&
        cached!.source.startsWith('fmp');
      if (!hasFmpCache) {
        return NextResponse.json(
          {
            source: 'unavailable',
            fetchedAt: new Date().toISOString(),
            stale: true,
            total: 0,
            events: [],
            error: fetchError instanceof Error ? fetchError.message : 'Failed to fetch FMP feed',
          },
          { status: 200, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      stale = true;
      fetchedAt = cached!.fetchedAt;
      source = cached!.source || 'fmp-cache';
      events = cached!.events;
    }

    const filtered = events
      .filter((event) => (countryFilter.size > 0 ? countryFilter.has(event.country) : true))
      .filter((event) => shouldKeepByImpact(event.impact, impactFilter))
      .filter((event) => shouldKeepByRange(event.timestamp, rangeFilter))
      .sort((a, b) => {
        if (a.timestamp === null && b.timestamp === null) return a.title.localeCompare(b.title);
        if (a.timestamp === null) return 1;
        if (b.timestamp === null) return -1;
        return a.timestamp - b.timestamp;
      })
      .slice(0, limit);

    return NextResponse.json(
      {
        source,
        fetchedAt,
        stale,
        total: filtered.length,
        events: filtered,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        source: 'unavailable',
        fetchedAt: new Date().toISOString(),
        stale: true,
        total: 0,
        events: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
