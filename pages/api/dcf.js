const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const DEFAULT_TIMEOUT_MS = 12000;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || '1e197034762a4ee0814aae5260b2d800';
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY || 'O1l93TNLLysETJkr1NwyMuPZS5ZpoX6p';

function parseSymbol(raw) {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  if (!normalized || !SYMBOL_PATTERN.test(normalized)) return null;
  return normalized;
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
    return await fetch(url, { signal: controller.signal });
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ticker = parseSymbol(req.query?.symbol);
  if (!ticker) {
    return res.status(400).json({ error: 'Missing or invalid symbol' });
  }

  const apiKey = process.env.FMP_API_KEY;

  try {
    if (apiKey) {
      // Legacy DCF endpoint was sunset in 2025; use stable endpoint.
      const url = `https://financialmodelingprep.com/stable/discounted-cash-flow?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
      const response = await fetchWithTimeout(url);

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
        return res.status(200).json({ ...(row || { symbol: ticker, dcf: null }), source: 'fmp' });
      }
    }

    const quote = await fetchTwelveDataQuote(ticker);
    if (quote) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        symbol: ticker,
        dcf: null,
        price: toNum(quote?.close ?? quote?.price),
        currency: quote?.currency || null,
        source: 'twelvedata',
      });
    }

    const [massivePrice, massiveDetails] = await Promise.all([
      fetchMassivePrevClose(ticker),
      fetchMassiveTickerDetails(ticker),
    ]);
    if (massivePrice !== null || massiveDetails) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        symbol: ticker,
        dcf: null,
        price: massivePrice,
        currency: massiveDetails?.currency_name || massiveDetails?.currency_symbol || null,
        source: 'massive',
      });
    }

    return res.status(502).json({ error: 'Failed to fetch DCF from FMP, Twelve Data, and Massive fallback' });
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';

    try {
      const quote = await fetchTwelveDataQuote(ticker);
      if (quote) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
        return res.status(200).json({
          symbol: ticker,
          dcf: null,
          price: toNum(quote?.close ?? quote?.price),
          currency: quote?.currency || null,
          source: 'twelvedata',
        });
      }

      const [massivePrice, massiveDetails] = await Promise.all([
        fetchMassivePrevClose(ticker),
        fetchMassiveTickerDetails(ticker),
      ]);
      if (massivePrice !== null || massiveDetails) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
        return res.status(200).json({
          symbol: ticker,
          dcf: null,
          price: massivePrice,
          currency: massiveDetails?.currency_name || massiveDetails?.currency_symbol || null,
          source: 'massive',
        });
      }
    } catch {
      // Fall through to error response.
    }

    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'Upstream request timed out (FMP, Twelve Data, and Massive fallback unavailable)'
        : 'Internal server error',
    });
  }
}
