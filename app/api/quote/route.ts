import { NextRequest, NextResponse } from 'next/server';

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const FX_SYMBOL_PATTERN = /^[A-Z]{6}=X$/;
const ALLOWED_INTERVALS = new Set([
  '1m',
  '2m',
  '5m',
  '15m',
  '30m',
  '60m',
  '90m',
  '1h',
  '1d',
  '5d',
  '1wk',
  '1mo',
  '3mo',
]);
const ALLOWED_RANGES = new Set([
  '1d',
  '5d',
  '1mo',
  '3mo',
  '6mo',
  '1y',
  '2y',
  '5y',
  '10y',
  'ytd',
  'max',
]);
const ALLOWED_EVENTS = new Set(['div', 'split', 'div,splits', 'capitalGain', 'history']);

function normalizeSymbol(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return null;
  if (!SYMBOL_PATTERN.test(normalized) && !FX_SYMBOL_PATTERN.test(normalized)) return null;
  return normalized;
}

function normalizeUnixParam(raw: string): string {
  if (!raw) return '';
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return String(Math.floor(parsed));
}

function normalizeBooleanParam(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return 'true';
  if (normalized === 'false' || normalized === '0') return 'false';
  return '';
}

function parseJsonSafely(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toFiniteNumber(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof value.raw === 'number' && Number.isFinite(value.raw)) {
    return value.raw;
  }
  return null;
}

function toNullableString(value: any): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (!value || typeof value !== 'object') return null;

  const longFmt = typeof value.longFmt === 'string' ? value.longFmt.trim() : '';
  if (longFmt) return longFmt;

  const fmt = typeof value.fmt === 'string' ? value.fmt.trim() : '';
  if (fmt) return fmt;

  const raw = typeof value.raw === 'string' ? value.raw.trim() : '';
  if (raw) return raw;

  return null;
}

function normalizeYieldToPercent(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.abs(value) < 1 ? value * 100 : value;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = normalizeSymbol(url.searchParams.get('symbol') || '');
    if (!symbol) return NextResponse.json({ error: 'Missing or invalid symbol' }, { status: 400 });

    // Server-side Yahoo proxy to avoid brittle browser CORS proxies.
    const fetchWithHeaders = (u: string) =>
      fetch(u, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://finance.yahoo.com/',
        },
      });

    const urlParams = new URLSearchParams(url.search);
    const wantChart = urlParams.get('chart') === '1' || urlParams.get('chart') === 'true';

    if (wantChart) {
      const chartParams = new URLSearchParams();
      const intervalRaw = (urlParams.get('interval') || '').trim().toLowerCase();
      const interval = ALLOWED_INTERVALS.has(intervalRaw) ? intervalRaw : '1d';
      const rangeRaw = (urlParams.get('range') || '').trim().toLowerCase();
      const range = ALLOWED_RANGES.has(rangeRaw) ? rangeRaw : '7d';
      const period1 = normalizeUnixParam((urlParams.get('period1') || '').trim());
      const period2 = normalizeUnixParam((urlParams.get('period2') || '').trim());
      const includePrePost = normalizeBooleanParam((urlParams.get('includePrePost') || '').trim());
      const eventsRaw = (urlParams.get('events') || '').trim();
      const events = ALLOWED_EVENTS.has(eventsRaw) ? eventsRaw : '';

      chartParams.set('interval', interval);
      if (period1) chartParams.set('period1', period1);
      if (period2) chartParams.set('period2', period2);
      if (!period1 && !period2) chartParams.set('range', range);
      if (includePrePost) chartParams.set('includePrePost', includePrePost);
      if (events) chartParams.set('events', events);

      const cUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${chartParams.toString()}`;
      const cres = await fetchWithHeaders(cUrl);
      const text = await cres.text();
      const j = parseJsonSafely(text);

      if (!cres.ok) {
        return NextResponse.json(
          {
            error: 'Chart endpoint failed',
            status: cres.status,
            details: j?.finance?.error?.description || text.slice(0, 250),
          },
          { status: 502 },
        );
      }

      const result = j?.chart?.result?.[0];
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const timestamps = result?.timestamp || [];
      const currency = result?.meta?.currency ?? null;

      // Preserve Yahoo response shape while adding normalized helpers for existing callers.
      return NextResponse.json({
        ...(j || {}),
        series: closes,
        timestamps,
        currency,
        source: 'chart',
      });
    }

    const cUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetchWithHeaders(cUrl);
    const text = await res.text();
    const j = parseJsonSafely(text);

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Quote endpoint failed',
          status: res.status,
          details: j?.finance?.error?.description || text.slice(0, 250),
        },
        { status: 502 },
      );
    }

    const result = j?.chart?.result?.[0];
    const meta = result?.meta || {};
    const closes: number[] = (result?.indicators?.quote?.[0]?.close || []).filter(
      (v: any) => typeof v === 'number' && Number.isFinite(v),
    );
    const latestClose = closes.length ? closes[closes.length - 1] : null;
    let quoteResult: any = null;
    let summaryResult: any = null;

    try {
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
      const quoteRes = await fetchWithHeaders(quoteUrl);
      const quoteText = await quoteRes.text();
      const quoteJson = parseJsonSafely(quoteText);
      if (quoteRes.ok) {
        quoteResult = quoteJson?.quoteResponse?.result?.[0] || null;
      }
    } catch {}

    try {
      const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,assetProfile,summaryDetail,defaultKeyStatistics,financialData`;
      const summaryRes = await fetchWithHeaders(summaryUrl);
      const summaryText = await summaryRes.text();
      const summaryJson = parseJsonSafely(summaryText);
      if (summaryRes.ok) {
        summaryResult = summaryJson?.quoteSummary?.result?.[0] || null;
      }
    } catch {}

    const summaryProfile = summaryResult?.summaryProfile || summaryResult?.assetProfile || {};
    const summaryDetail = summaryResult?.summaryDetail || {};
    const defaultKeyStats = summaryResult?.defaultKeyStatistics || {};
    const financialData = summaryResult?.financialData || {};

    const price =
      toFiniteNumber(meta?.regularMarketPrice) ??
      toFiniteNumber(quoteResult?.regularMarketPrice) ??
      latestClose ??
      null;
    const previousClose =
      toFiniteNumber(meta?.previousClose) ??
      toFiniteNumber(quoteResult?.regularMarketPreviousClose) ??
      (closes.length > 1 ? closes[closes.length - 2] : null);
    const currency =
      toNullableString(meta?.currency) || toNullableString(quoteResult?.currency) || null;

    if (typeof price === 'number' && Number.isFinite(price)) {
      return NextResponse.json({
        price,
        previousClose,
        currency,
        symbol,
        source: 'chart',
        meta,
        company: {
          shortName: toNullableString(quoteResult?.shortName),
          longName: toNullableString(quoteResult?.longName),
          quoteType: toNullableString(quoteResult?.quoteType) || toNullableString(meta?.instrumentType),
          exchange:
            toNullableString(quoteResult?.fullExchangeName) ||
            toNullableString(quoteResult?.exchange) ||
            toNullableString(meta?.exchangeName),
          sector: toNullableString(summaryProfile?.sector),
          industry: toNullableString(summaryProfile?.industry),
          country: toNullableString(summaryProfile?.country),
          website: toNullableString(summaryProfile?.website),
          businessSummary: toNullableString(summaryProfile?.longBusinessSummary),
        },
        metrics: {
          marketCap:
            toFiniteNumber(quoteResult?.marketCap) ??
            toFiniteNumber(summaryDetail?.marketCap) ??
            toFiniteNumber(defaultKeyStats?.marketCap),
          dayHigh:
            toFiniteNumber(quoteResult?.regularMarketDayHigh) ??
            toFiniteNumber(summaryDetail?.dayHigh),
          dayLow:
            toFiniteNumber(quoteResult?.regularMarketDayLow) ??
            toFiniteNumber(summaryDetail?.dayLow),
          fiftyTwoWeekHigh:
            toFiniteNumber(quoteResult?.fiftyTwoWeekHigh) ??
            toFiniteNumber(summaryDetail?.fiftyTwoWeekHigh),
          fiftyTwoWeekLow:
            toFiniteNumber(quoteResult?.fiftyTwoWeekLow) ??
            toFiniteNumber(summaryDetail?.fiftyTwoWeekLow),
          trailingPE:
            toFiniteNumber(quoteResult?.trailingPE) ??
            toFiniteNumber(summaryDetail?.trailingPE) ??
            toFiniteNumber(defaultKeyStats?.trailingPE),
          forwardPE:
            toFiniteNumber(quoteResult?.forwardPE) ??
            toFiniteNumber(summaryDetail?.forwardPE) ??
            toFiniteNumber(defaultKeyStats?.forwardPE),
          epsTrailingTwelveMonths:
            toFiniteNumber(quoteResult?.epsTrailingTwelveMonths) ??
            toFiniteNumber(defaultKeyStats?.trailingEps),
          beta:
            toFiniteNumber(quoteResult?.beta) ??
            toFiniteNumber(defaultKeyStats?.beta) ??
            toFiniteNumber(financialData?.beta),
          volume:
            toFiniteNumber(quoteResult?.regularMarketVolume) ??
            toFiniteNumber(summaryDetail?.volume),
          averageVolume:
            toFiniteNumber(quoteResult?.averageDailyVolume3Month) ??
            toFiniteNumber(summaryDetail?.averageVolume),
          dividendRate:
            toFiniteNumber(quoteResult?.dividendRate) ??
            toFiniteNumber(summaryDetail?.dividendRate),
          dividendYieldPct: normalizeYieldToPercent(
            toFiniteNumber(quoteResult?.dividendYield) ??
              toFiniteNumber(summaryDetail?.dividendYield),
          ),
        },
      });
    }
    return NextResponse.json({ error: 'Price not available from Yahoo chart endpoint' }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
