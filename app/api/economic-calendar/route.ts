import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable/economic-calendar';
const FOREX_FACTORY_WEEK_XML_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
const INVESTING_CALENDAR_URL = 'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData';

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

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function stripHtml(value: string): string {
  return normalizeText(decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')));
}

function extractForexFactoryField(block: string, field: string): string {
  const cdata = block.match(new RegExp(`<${field}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${field}>`, 'i'));
  if (cdata && typeof cdata[1] === 'string') return normalizeText(decodeXmlEntities(cdata[1]));

  const plain = block.match(new RegExp(`<${field}>\\s*([\\s\\S]*?)\\s*<\\/${field}>`, 'i'));
  if (plain && typeof plain[1] === 'string') return normalizeText(decodeXmlEntities(plain[1]));

  const selfClosing = block.match(new RegExp(`<${field}\\s*/>`, 'i'));
  if (selfClosing) return '';

  return '';
}

function parseForexFactoryDateTime(dateRaw: string, timeRaw: string): number | null {
  const dateMatch = dateRaw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!dateMatch) return null;

  const [, mm, dd, yyyy] = dateMatch;
  const lowerTime = normalizeText(timeRaw).toLowerCase();
  const timeMatch = lowerTime.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (!timeMatch) {
    const dateOnly = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly.getTime();
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd), hour, minute, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function parseInvestingDateTime(raw: string): number | null {
  const match = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, yyyy, mm, dd, hh, min, sec] = match;
  const parsed = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(sec),
    0,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function parseInvestingTimeOnDay(dayTimestamp: number | null, timeRaw: string): number | null {
  if (dayTimestamp === null) return null;
  const lower = normalizeText(timeRaw).toLowerCase();
  if (!lower || lower === 'all day' || lower === 'tentative') return dayTimestamp;

  const twentyFourHour = lower.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const base = new Date(dayTimestamp);
    base.setHours(Number(twentyFourHour[1]), Number(twentyFourHour[2]), 0, 0);
    return base.getTime();
  }

  const twelveHour = lower.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!twelveHour) return dayTimestamp;

  let hour = Number(twelveHour[1]);
  const minute = Number(twelveHour[2]);
  const meridiem = twelveHour[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  const base = new Date(dayTimestamp);
  base.setHours(hour, minute, 0, 0);
  return base.getTime();
}

function parseForexFactoryEventsFromXml(xml: string): CalendarEvent[] {
  const eventMatches = xml.match(/<event>[\s\S]*?<\/event>/gi) || [];
  const events = eventMatches
    .map((block): CalendarEvent => {
      const title = extractForexFactoryField(block, 'title') || 'Economic Event';
      const country = extractForexFactoryField(block, 'country').toUpperCase() || 'N/A';
      const dateRaw = extractForexFactoryField(block, 'date');
      const timeRaw = extractForexFactoryField(block, 'time') || 'N/A';
      const timestamp = parseForexFactoryDateTime(dateRaw, timeRaw);

      return {
        title,
        country,
        date: timestamp ? new Date(timestamp).toISOString().slice(0, 10) : dateRaw || '-',
        time: timestamp
          ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : timeRaw || 'N/A',
        impact: parseImpact(extractForexFactoryField(block, 'impact')),
        forecast: extractForexFactoryField(block, 'forecast') || '-',
        previous: extractForexFactoryField(block, 'previous') || '-',
        url: extractForexFactoryField(block, 'url'),
        timestamp,
      };
    })
    .filter((event) => event.title && event.country);

  if (events.length === 0) throw new Error('ForexFactory returned no events');
  return events;
}

function parseInvestingEventsFromHtml(html: string): CalendarEvent[] {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  let currentDayTimestamp: number | null = null;
  const events: CalendarEvent[] = [];

  for (const row of rows) {
    const dayMatch = row.match(/id="theDay(\d+)"/i);
    if (dayMatch) {
      const daySeconds = Number(dayMatch[1]);
      currentDayTimestamp = Number.isFinite(daySeconds) ? daySeconds * 1000 : null;
      continue;
    }

    if (!/id="eventRowId_/i.test(row)) continue;

    const dateTimeRaw = row.match(/data-event-datetime="([^"]+)"/i)?.[1] || '';
    const timeRaw = stripHtml(
      row.match(/<td[^>]*class="first left(?: time js-time)?"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '',
    );
    const timestamp =
      parseInvestingDateTime(dateTimeRaw) || parseInvestingTimeOnDay(currentDayTimestamp, timeRaw);

    const countryCode =
      row.match(/<td[^>]*class="[^"]*flagCur[^"]*"[^>]*>[\s\S]*?<\/span>\s*([A-Z]{3})\s*<\/td>/i)?.[1] || '';
    const countryTitle =
      row.match(/<td[^>]*class="[^"]*flagCur[^"]*"[^>]*>[\s\S]*?<span[^>]*title="([^"]+)"/i)?.[1] || '';
    const country = normalizeText(countryCode || countryTitle).toUpperCase() || 'N/A';

    let impact: ImpactLevel = 'Unknown';
    if (/holiday/i.test(row)) impact = 'Holiday';
    else if (/data-img_key="bull3"|high volatility expected/i.test(row)) impact = 'High';
    else if (/data-img_key="bull2"|medium volatility expected/i.test(row)) impact = 'Medium';
    else if (/data-img_key="bull1"|low volatility expected/i.test(row)) impact = 'Low';

    const title = stripHtml(
      row.match(/<td[^>]*class="[^"]*\bleft\s+event\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '',
    ) || 'Economic Event';
    const forecast = stripHtml(row.match(/id="eventForecast_[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '') || '-';
    const previous = stripHtml(row.match(/id="eventPrevious_[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '') || '-';
    const href = row.match(/<a[^>]*href="([^"]+)"/i)?.[1] || '';
    const url = href ? (href.startsWith('http') ? href : `https://www.investing.com${href}`) : '';

    events.push({
      title,
      country,
      date:
        timestamp !== null
          ? new Date(timestamp).toISOString().slice(0, 10)
          : currentDayTimestamp !== null
            ? new Date(currentDayTimestamp).toISOString().slice(0, 10)
            : '-',
      time: timestamp !== null ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : timeRaw || 'N/A',
      impact,
      forecast,
      previous,
      url,
      timestamp,
    });
  }

  if (events.length === 0) throw new Error('Investing returned no events');
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

async function fetchForexFactoryEvents(): Promise<{ source: string; events: CalendarEvent[] }> {
  const response = await fetch(FOREX_FACTORY_WEEK_XML_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime Economic Calendar/1.0)',
      Accept: 'application/xml,text/xml,application/json,text/plain,*/*',
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`ForexFactory HTTP ${response.status}`);
  }

  return { source: 'forexfactory', events: parseForexFactoryEventsFromXml(text) };
}

async function fetchInvestingEvents(rangeFilter: string): Promise<{ source: string; events: CalendarEvent[] }> {
  const { from, to } = buildFmpRange(rangeFilter);
  const params = new URLSearchParams({
    timeZone: '55',
    timeFilter: 'timeRemain',
    currentTab: 'custom',
    submitFilters: '1',
    dateFrom: from,
    dateTo: to,
    limit_from: '0',
  });

  const response = await fetch(INVESTING_CALENDAR_URL, {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime Economic Calendar/1.0)',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json,text/plain,*/*',
    },
    body: params.toString(),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Investing HTTP ${response.status}`);

  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Investing response was not valid JSON');
  }

  const html = typeof payload?.data === 'string' ? payload.data : '';
  return { source: 'investing', events: parseInvestingEventsFromHtml(html) };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = toPositiveInt(searchParams.get('limit'), 100, 300);
    const impactFilter = (searchParams.get('impact') || 'high').toLowerCase();
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
    } catch (fmpError) {
      try {
        const fallback = await fetchInvestingEvents(rangeFilter);
        source = fallback.source;
        events = fallback.events;
        globalCalendarCache.__economicCalendarCache = {
          fetchedAt,
          source,
          events,
        };
      } catch (investingError) {
        try {
          const fallback = await fetchForexFactoryEvents();
          source = fallback.source;
          events = fallback.events;
          globalCalendarCache.__economicCalendarCache = {
            fetchedAt,
            source,
            events,
          };
        } catch (fallbackError) {
          const cached = globalCalendarCache.__economicCalendarCache;
          const hasCache = Boolean(cached) && cached!.events.length > 0;
          if (!hasCache) {
            const fmpMessage = fmpError instanceof Error ? fmpError.message : 'FMP fetch failed';
            const investingMessage =
              investingError instanceof Error ? investingError.message : 'Investing fetch failed';
            const fallbackMessage =
              fallbackError instanceof Error ? fallbackError.message : 'Fallback fetch failed';
            return NextResponse.json(
              {
                source: 'unavailable',
                fetchedAt: new Date().toISOString(),
                stale: true,
                total: 0,
                events: [],
                error: `Failed to fetch calendar feed (FMP: ${fmpMessage}; investing: ${investingMessage}; fallback: ${fallbackMessage})`,
              },
              { status: 200, headers: { 'Cache-Control': 'no-store' } },
            );
          }
          stale = true;
          fetchedAt = cached!.fetchedAt;
          source = cached!.source || 'cache';
          events = cached!.events;
        }
      }
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
