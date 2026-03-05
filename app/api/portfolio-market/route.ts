import { NextRequest, NextResponse } from 'next/server';

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const FX_PAIR_PATTERN = /^[A-Z]{6}(=X)?$/;
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

function normalizeSymbol(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return null;
  if (FX_PAIR_PATTERN.test(normalized)) return normalized.replace('=X', '');
  if (SYMBOL_PATTERN.test(normalized)) return normalized;
  return null;
}

function normalizeUnixParam(raw: string): string {
  if (!raw) return '';
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return String(Math.floor(parsed));
}

function toIsoDateFromUnix(unixSeconds: string): string {
  const unix = Number(unixSeconds);
  if (!Number.isFinite(unix) || unix <= 0) return '';
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function rangeToFromDate(range: string): string {
  const now = new Date();
  const from = new Date(now);
  switch (range) {
    case '1d':
      from.setDate(now.getDate() - 1);
      break;
    case '5d':
      from.setDate(now.getDate() - 5);
      break;
    case '1mo':
      from.setMonth(now.getMonth() - 1);
      break;
    case '3mo':
      from.setMonth(now.getMonth() - 3);
      break;
    case '6mo':
      from.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      from.setFullYear(now.getFullYear() - 1);
      break;
    case '2y':
      from.setFullYear(now.getFullYear() - 2);
      break;
    case '5y':
      from.setFullYear(now.getFullYear() - 5);
      break;
    case '10y':
      from.setFullYear(now.getFullYear() - 10);
      break;
    case 'ytd':
      from.setMonth(0, 1);
      break;
    case 'max':
      return '1970-01-01';
    default:
      from.setDate(now.getDate() - 30);
      break;
  }
  return from.toISOString().slice(0, 10);
}

function isoDateToUnixStart(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { response, parsed, text };
}

async function fetchCurrency(symbol: string, apiKey: string): Promise<string | null> {
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const { response, parsed } = await fetchJson(url);
  if (!response.ok || !Array.isArray(parsed) || !parsed.length) return null;
  const currency = parsed[0]?.currency;
  if (typeof currency !== 'string' || !currency.trim()) return null;
  return currency.trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = String(process.env.FMP_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'FMP_API_KEY is missing' }, { status: 500 });
    }

    const url = new URL(req.url);
    const symbol = normalizeSymbol(url.searchParams.get('symbol') || '');
    if (!symbol) {
      return NextResponse.json({ error: 'Missing or invalid symbol' }, { status: 400 });
    }

    const wantChart =
      url.searchParams.get('chart') === '1' || url.searchParams.get('chart') === 'true';

    const isFx = /^[A-Z]{6}$/.test(symbol);
    const targetCurrency = isFx ? symbol.slice(3) : null;

    if (wantChart) {
      const interval = (url.searchParams.get('interval') || '1d').toLowerCase();
      if (interval !== '1d') {
        return NextResponse.json(
          { error: 'Only interval=1d is supported for portfolio-market endpoint' },
          { status: 400 },
        );
      }

      const period1 = normalizeUnixParam((url.searchParams.get('period1') || '').trim());
      const period2 = normalizeUnixParam((url.searchParams.get('period2') || '').trim());
      const rangeRaw = (url.searchParams.get('range') || '').trim().toLowerCase();
      const range = ALLOWED_RANGES.has(rangeRaw) ? rangeRaw : '1y';

      const fromDate = period1 ? toIsoDateFromUnix(period1) : rangeToFromDate(range);
      const toDate = period2
        ? toIsoDateFromUnix(period2)
        : new Date().toISOString().slice(0, 10);

      const historicalUrl = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(fromDate || '1970-01-01')}&to=${encodeURIComponent(toDate)}&apikey=${encodeURIComponent(apiKey)}`;
      const { response, parsed, text } = await fetchJson(historicalUrl);
      if (!response.ok || !Array.isArray(parsed)) {
        return NextResponse.json(
          {
            error: 'Historical endpoint failed',
            status: response.status,
            details:
              parsed?.['Error Message'] ||
              parsed?.error ||
              parsed?.message ||
              text.slice(0, 250),
          },
          { status: 502 },
        );
      }

      const sorted = parsed
        .filter((row: any) => typeof row?.date === 'string' && Number.isFinite(Number(row?.close)))
        .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

      const timestamps = sorted.map((row: any) => isoDateToUnixStart(row.date));
      const closes = sorted.map((row: any) => Number(row.close));
      const regularMarketTime = timestamps.length
        ? timestamps[timestamps.length - 1]
        : Math.floor(Date.now() / 1000);

      let currency: string | null = targetCurrency;
      if (!currency && !isFx) {
        currency = await fetchCurrency(symbol, apiKey);
      }

      const result: any = {
        timestamp: timestamps,
        indicators: { quote: [{ close: closes }] },
        meta: {
          regularMarketTime,
          exchangeTimezoneName: 'UTC',
          currency,
          symbol,
        },
      };

      const eventsRaw = (url.searchParams.get('events') || '').trim().toLowerCase();
      if (eventsRaw.includes('div') && !isFx) {
        const dividendsUrl = `https://financialmodelingprep.com/stable/dividends?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(fromDate || '1970-01-01')}&to=${encodeURIComponent(toDate)}&apikey=${encodeURIComponent(apiKey)}`;
        const dividendFetch = await fetchJson(dividendsUrl);
        if (dividendFetch.response.ok && Array.isArray(dividendFetch.parsed)) {
          const dividendsObj: Record<string, { date: number; amount: number }> = {};
          dividendFetch.parsed.forEach((row: any) => {
            const iso = typeof row?.date === 'string' ? row.date : '';
            if (!iso) return;
            const ts = isoDateToUnixStart(iso);
            const amount = Number(row?.dividend ?? row?.adjDividend ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) return;
            dividendsObj[String(ts)] = { date: ts, amount };
          });
          if (Object.keys(dividendsObj).length > 0) {
            result.events = { dividends: dividendsObj };
          }
        }
      }

      return NextResponse.json({
        chart: { result: [result], error: null },
        series: closes,
        timestamps,
        currency,
        source: 'fmp',
      });
    }

    const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
    const { response, parsed, text } = await fetchJson(quoteUrl);
    if (!response.ok || !Array.isArray(parsed) || !parsed.length) {
      return NextResponse.json(
        {
          error: 'Quote endpoint failed',
          status: response.status,
          details:
            parsed?.['Error Message'] ||
            parsed?.error ||
            parsed?.message ||
            text.slice(0, 250),
        },
        { status: 502 },
      );
    }

    const quote = parsed[0];
    const price = Number(quote?.price);
    const previousClose = Number(quote?.previousClose);
    if (!Number.isFinite(price)) {
      return NextResponse.json({ error: 'Price not available from FMP quote endpoint' }, { status: 502 });
    }

    const currency = targetCurrency || (await fetchCurrency(symbol, apiKey));

    return NextResponse.json({
      price,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      currency,
      symbol,
      source: 'fmp',
      meta: quote,
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
}
