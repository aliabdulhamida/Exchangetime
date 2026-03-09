import {
  fetchYahooQuoteSnapshot,
  normalizeYahooSymbol,
  toFiniteNumber,
  toNullableString,
} from '../../lib/server/yahoo-finance';

const DEFAULT_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const TWELVE_DATA_API_KEY = String(process.env.TWELVE_DATA_API_KEY || '').trim();
const MASSIVE_API_KEY = String(process.env.MASSIVE_API_KEY || '').trim();
const dcfCache = new Map();

function parseSymbol(raw) {
  const normalized = normalizeYahooSymbol(raw, {
    allowFxPair: false,
    allowFxWithSuffix: false,
  });
  return normalized || null;
}

function toNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const parsed = Number(v.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTwelveDataQuote(symbol) {
  if (!TWELVE_DATA_API_KEY) return null;
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  if (!payload || payload.status === 'error') return null;
  return payload;
}

async function fetchMassivePrevClose(symbol) {
  if (!MASSIVE_API_KEY) return null;
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${encodeURIComponent(MASSIVE_API_KEY)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  if (!payload || payload.status === 'ERROR') return null;
  const row = Array.isArray(payload?.results) ? payload.results[0] : null;
  return toNum(row?.c);
}

async function fetchMassiveTickerDetails(symbol) {
  if (!MASSIVE_API_KEY) return null;
  const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${encodeURIComponent(MASSIVE_API_KEY)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  if (!payload || payload.status === 'ERROR') return null;
  return payload?.results || null;
}

async function fetchFmpDcf(symbol, apiKey) {
  if (!apiKey) return null;

  const url = `https://financialmodelingprep.com/stable/discounted-cash-flow?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;

  return {
    ...(row || { symbol, dcf: null }),
    source: 'fmp',
  };
}

async function fetchLegacyPriceFallback(symbol) {
  const quote = await fetchTwelveDataQuote(symbol).catch(() => null);
  if (quote) {
    return {
      symbol,
      dcf: null,
      price: toNum(quote?.close ?? quote?.price),
      currency: quote?.currency || null,
      source: 'twelvedata',
    };
  }

  const [massivePrice, massiveDetails] = await Promise.all([
    fetchMassivePrevClose(symbol).catch(() => null),
    fetchMassiveTickerDetails(symbol).catch(() => null),
  ]);
  if (massivePrice !== null || massiveDetails) {
    return {
      symbol,
      dcf: null,
      price: massivePrice,
      currency:
        toNullableString(massiveDetails?.currency_name) ||
        toNullableString(massiveDetails?.currency_symbol) ||
        null,
      source: 'massive',
    };
  }

  return null;
}

function readCachedDcf(symbol) {
  const cached = dcfCache.get(symbol);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.data;
}

function writeCachedDcf(symbol, data) {
  dcfCache.set(symbol, { fetchedAt: Date.now(), data });
}

function buildUnavailableDcf(symbol, reason = 'upstream_unavailable') {
  return {
    symbol,
    dcf: null,
    price: null,
    currency: null,
    source: 'unavailable',
    unavailableReason: reason,
  };
}

function buildYahooDcfPayload(symbol, snapshot) {
  return {
    symbol,
    dcf: null,
    price: toFiniteNumber(snapshot?.price),
    currency: toNullableString(snapshot?.currency),
    source: 'yahoo',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ticker = parseSymbol(req.query?.symbol);
  if (!ticker) {
    return res.status(400).json({ error: 'Missing or invalid symbol' });
  }

  const apiKey = String(process.env.FMP_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('[api/dcf] FMP_API_KEY missing; FMP fallback unavailable.');
  }
  if (!TWELVE_DATA_API_KEY) {
    console.warn('[api/dcf] TWELVE_DATA_API_KEY missing; Twelve Data fallback unavailable.');
  }
  if (!MASSIVE_API_KEY) {
    console.warn('[api/dcf] MASSIVE_API_KEY missing; Massive fallback unavailable.');
  }

  try {
    const yahooSnapshot = await fetchYahooQuoteSnapshot(ticker).catch(() => null);
    const yahooPayload = yahooSnapshot?.ok ? buildYahooDcfPayload(ticker, yahooSnapshot.data) : null;

    const fmpPayload = await fetchFmpDcf(ticker, apiKey).catch(() => null);
    if (fmpPayload && Number.isFinite(toNum(fmpPayload?.dcf))) {
      writeCachedDcf(ticker, fmpPayload);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(fmpPayload);
    }

    if (yahooPayload) {
      writeCachedDcf(ticker, yahooPayload);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(yahooPayload);
    }

    if (fmpPayload) {
      writeCachedDcf(ticker, fmpPayload);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(fmpPayload);
    }

    const legacyFallback = await fetchLegacyPriceFallback(ticker);
    if (legacyFallback) {
      writeCachedDcf(ticker, legacyFallback);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(legacyFallback);
    }

    const stale = readCachedDcf(ticker);
    if (stale) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Data-Stale', '1');
      return res.status(200).json({ ...stale, stale: true });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(buildUnavailableDcf(ticker));
  } catch (err) {
    const legacyFallback = await fetchLegacyPriceFallback(ticker).catch(() => null);
    if (legacyFallback) {
      writeCachedDcf(ticker, legacyFallback);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(legacyFallback);
    }

    const stale = readCachedDcf(ticker);
    if (stale) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Data-Stale', '1');
      return res.status(200).json({ ...stale, stale: true });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(buildUnavailableDcf(ticker));
  }
}
