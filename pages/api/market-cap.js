import {
  fetchYahooQuoteSnapshot,
  normalizeYahooSymbol,
  toNullableString,
} from '../../lib/server/yahoo-finance';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const DEFAULT_TIMEOUT_MS = 12000;
const TWELVE_DATA_API_KEY = String(process.env.TWELVE_DATA_API_KEY || '').trim();
const MASSIVE_API_KEY = String(process.env.MASSIVE_API_KEY || '').trim();

function parseSymbol(raw) {
  const normalized = normalizeYahooSymbol(raw, {
    allowFxPair: false,
    allowFxWithSuffix: false,
  });
  return normalized || null;
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const normalized = value.replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === 'object' && typeof value.raw === 'number' && Number.isFinite(value.raw)) {
    return value.raw;
  }
  return null;
}

function pickMarketCap(row) {
  if (!row || typeof row !== 'object') return null;
  return (
    parseNumber(row.marketCap) ??
    parseNumber(row.mktCap) ??
    parseNumber(row.marketCapitalization) ??
    parseNumber(row.market_cap) ??
    null
  );
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

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchTwelveDataQuote(symbol) {
  if (!TWELVE_DATA_API_KEY) return null;
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const payload = await parseJsonSafe(response);
  if (!payload || payload.status === 'error') return null;
  return payload;
}

async function fetchMassiveTickerDetails(symbol) {
  if (!MASSIVE_API_KEY) return null;
  const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${encodeURIComponent(MASSIVE_API_KEY)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const payload = await parseJsonSafe(response);
  if (!payload || payload.status === 'ERROR') return null;
  return payload?.results || null;
}

async function fetchFmpMarketCap(ticker, apiKey) {
  if (!apiKey) return null;

  const profileUrl = `${FMP_BASE_URL}/profile?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const metricsUrl = `${FMP_BASE_URL}/key-metrics?symbol=${encodeURIComponent(ticker)}&limit=1&apikey=${apiKey}`;

  const [profileRes, metricsRes] = await Promise.all([
    fetchWithTimeout(profileUrl),
    fetchWithTimeout(metricsUrl),
  ]);

  if (!profileRes.ok && !metricsRes.ok) return null;

  const profilePayload = profileRes.ok ? await parseJsonSafe(profileRes) : null;
  const metricsPayload = metricsRes.ok ? await parseJsonSafe(metricsRes) : null;
  const profileRow = Array.isArray(profilePayload) ? profilePayload[0] : profilePayload;
  const metricsRow = Array.isArray(metricsPayload) ? metricsPayload[0] : metricsPayload;

  return {
    symbol: ticker,
    marketCap: pickMarketCap(profileRow) ?? pickMarketCap(metricsRow),
    currency: profileRow?.currency || null,
    source: 'fmp',
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
    console.warn('[api/market-cap] FMP_API_KEY missing; FMP fallback unavailable.');
  }
  if (!TWELVE_DATA_API_KEY) {
    console.warn('[api/market-cap] TWELVE_DATA_API_KEY missing; Twelve Data fallback unavailable.');
  }
  if (!MASSIVE_API_KEY) {
    console.warn('[api/market-cap] MASSIVE_API_KEY missing; Massive fallback unavailable.');
  }

  try {
    const yahooSnapshot = await fetchYahooQuoteSnapshot(ticker, [
      'summaryDetail',
      'defaultKeyStatistics',
      'financialData',
      'price',
      'summaryProfile',
      'assetProfile',
    ]).catch(() => null);

    if (yahooSnapshot?.ok) {
      const marketCap =
        parseNumber(yahooSnapshot.data?.quoteResult?.marketCap) ||
        parseNumber(yahooSnapshot.data?.summaryDetail?.marketCap) ||
        parseNumber(yahooSnapshot.data?.defaultKeyStats?.marketCap) ||
        parseNumber(yahooSnapshot.data?.financialData?.marketCap);

      if (marketCap !== null) {
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
        return res.status(200).json({
          symbol: ticker,
          marketCap,
          currency: toNullableString(yahooSnapshot.data?.currency),
          source: 'yahoo',
        });
      }
    }

    const fmpPayload = await fetchFmpMarketCap(ticker, apiKey);
    if (fmpPayload) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(fmpPayload);
    }

    const quote = await fetchTwelveDataQuote(ticker);
    if (quote) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        symbol: ticker,
        marketCap: pickMarketCap(quote),
        currency: quote?.currency || null,
        source: 'twelvedata',
      });
    }

    const massiveDetails = await fetchMassiveTickerDetails(ticker);
    if (massiveDetails) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        symbol: ticker,
        marketCap: pickMarketCap(massiveDetails),
        currency: massiveDetails?.currency_name || massiveDetails?.currency_symbol || null,
        source: 'massive',
      });
    }

    return res
      .status(502)
      .json({ error: 'Failed to fetch market cap from Yahoo and fallback providers' });
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';

    try {
      const quote = await fetchTwelveDataQuote(ticker);
      if (quote) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
        return res.status(200).json({
          symbol: ticker,
          marketCap: pickMarketCap(quote),
          currency: quote?.currency || null,
          source: 'twelvedata',
        });
      }

      const massiveDetails = await fetchMassiveTickerDetails(ticker);
      if (massiveDetails) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
        return res.status(200).json({
          symbol: ticker,
          marketCap: pickMarketCap(massiveDetails),
          currency: massiveDetails?.currency_name || massiveDetails?.currency_symbol || null,
          source: 'massive',
        });
      }
    } catch {
      // Fall through to error response.
    }

    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'Upstream request timed out (Yahoo and fallback providers unavailable)'
        : 'Internal server error',
    });
  }
}
