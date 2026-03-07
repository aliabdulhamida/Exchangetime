const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const DEFAULT_TIMEOUT_MS = 12000;
const TWELVE_DATA_API_KEY = String(process.env.TWELVE_DATA_API_KEY || '').trim();
const MASSIVE_API_KEY = String(process.env.MASSIVE_API_KEY || '').trim();

function parseSymbol(raw) {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  if (!normalized || !SYMBOL_PATTERN.test(normalized)) return null;
  return normalized;
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

function toNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const parsed = Number(v.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toPercent(v) {
  const n = toNum(v);
  if (typeof n !== 'number') return undefined;
  return Math.abs(n) <= 1 ? n * 100 : n;
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

async function fetchMassiveTickerDetails(symbol) {
  if (!MASSIVE_API_KEY) return null;
  const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${encodeURIComponent(MASSIVE_API_KEY)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  if (!payload || payload.status === 'ERROR') return null;
  return payload?.results || null;
}

function buildFallbackMetricsFromTwelveData(ticker, quote) {
  const freeCashFlowRaw = toNum(quote?.free_cash_flow);
  return {
    peRatio: toNum(quote?.pe ?? quote?.pe_ratio),
    pbRatio: toNum(quote?.pb ?? quote?.price_to_book),
    pegRatio: toNum(quote?.peg ?? quote?.peg_ratio),
    roe: toPercent(quote?.roe),
    profitMargin: toPercent(quote?.profit_margin),
    roic: toPercent(quote?.roic),
    debtToEquity: toNum(quote?.debt_to_equity),
    currentRatio: toNum(quote?.current_ratio),
    freeCashFlow: typeof freeCashFlowRaw === 'number' ? freeCashFlowRaw / 1_000_000_000 : undefined,
    dividendYield: toPercent(quote?.dividend_yield),
    revenueGrowth: toPercent(quote?.revenue_growth),
    earningsGrowth: toPercent(quote?.earnings_growth),
    epsGrowth: toPercent(quote?.eps_growth),
    companyName: quote?.name || ticker,
    source: 'twelvedata',
  };
}

function buildFallbackMetricsFromMassive(ticker, details) {
  return {
    peRatio: undefined,
    pbRatio: undefined,
    pegRatio: undefined,
    roe: undefined,
    profitMargin: undefined,
    roic: undefined,
    debtToEquity: undefined,
    currentRatio: undefined,
    freeCashFlow: undefined,
    dividendYield: undefined,
    revenueGrowth: undefined,
    earningsGrowth: undefined,
    epsGrowth: undefined,
    companyName: details?.name || ticker,
    source: 'massive',
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
  const base = 'https://financialmodelingprep.com/stable';
  if (!apiKey) {
    console.warn('[api/metrics] FMP_API_KEY missing; skipping FMP provider.');
  }
  if (!TWELVE_DATA_API_KEY) {
    console.warn('[api/metrics] TWELVE_DATA_API_KEY missing; Twelve Data fallback unavailable.');
  }
  if (!MASSIVE_API_KEY) {
    console.warn('[api/metrics] MASSIVE_API_KEY missing; Massive fallback unavailable.');
  }

  try {
    if (apiKey) {
      const url = (path) => `${base}/${path}?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;

      // Use current stable endpoints (legacy v3/v4 endpoints were discontinued after 2025-08-31).
      const [profileRes, ratiosRes, growthRes, cashFlowRes, keyMetricsRes] = await Promise.all([
        fetchWithTimeout(url('profile')),
        fetchWithTimeout(url('ratios')),
        fetchWithTimeout(url('financial-growth')),
        fetchWithTimeout(
          `${base}/cash-flow-statement?symbol=${encodeURIComponent(ticker)}&limit=1&apikey=${apiKey}`,
        ),
        fetchWithTimeout(url('key-metrics')),
      ]);

      if (profileRes.ok && ratiosRes.ok) {
        const profileData = await profileRes.json();
        const ratiosData = await ratiosRes.json();
        const growthData = growthRes.ok ? await growthRes.json() : [];
        const cashFlowData = cashFlowRes.ok ? await cashFlowRes.json() : [];
        const keyMetricsData = keyMetricsRes.ok ? await keyMetricsRes.json() : [];

        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        const ratios = Array.isArray(ratiosData) ? ratiosData[0] : ratiosData;
        const growth = Array.isArray(growthData) ? growthData[0] : growthData;
        const cashFlow = Array.isArray(cashFlowData) ? cashFlowData[0] : cashFlowData;
        const keyMetrics = Array.isArray(keyMetricsData) ? keyMetricsData[0] : keyMetricsData;

        const metrics = {
          peRatio: toNum(ratios?.priceToEarningsRatio),
          pbRatio: toNum(ratios?.priceToBookRatio),
          pegRatio: toNum(
            ratios?.priceToEarningsGrowthRatio || ratios?.forwardPriceToEarningsGrowthRatio,
          ),
          roe: toPercent(keyMetrics?.returnOnEquity || ratios?.returnOnEquity),
          profitMargin: toPercent(ratios?.netProfitMargin),
          roic: toPercent(
            keyMetrics?.returnOnCapitalEmployed ||
              keyMetrics?.returnOnInvestedCapital ||
              ratios?.returnOnCapitalEmployed ||
              ratios?.returnOnAssets,
          ),
          debtToEquity: toNum(ratios?.debtToEquityRatio),
          currentRatio: toNum(ratios?.currentRatio),
          // Keep unit in billions to match frontend formatting logic.
          freeCashFlow:
            typeof cashFlow?.freeCashFlow === 'number' && Number.isFinite(cashFlow.freeCashFlow)
              ? cashFlow.freeCashFlow / 1_000_000_000
              : undefined,
          dividendYield: toPercent(ratios?.dividendYield || ratios?.dividendYieldPercentage),
          revenueGrowth: toPercent(growth?.revenueGrowth),
          earningsGrowth: toPercent(growth?.netIncomeGrowth),
          epsGrowth: undefined,
          companyName: profile?.companyName || ticker,
          source: 'fmp',
        };

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
        return res.status(200).json(metrics);
      }
    }

    const twelveDataQuote = await fetchTwelveDataQuote(ticker);
    if (twelveDataQuote) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(buildFallbackMetricsFromTwelveData(ticker, twelveDataQuote));
    }

    const massiveDetails = await fetchMassiveTickerDetails(ticker);
    if (massiveDetails) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(buildFallbackMetricsFromMassive(ticker, massiveDetails));
    }

    return res.status(502).json({ error: 'Failed to fetch metrics from FMP, Twelve Data, and Massive fallback' });
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';
    if (!isTimeout) {
      console.error('Metrics API error:', err);
    }

    try {
      const twelveDataQuote = await fetchTwelveDataQuote(ticker);
      if (twelveDataQuote) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
        return res.status(200).json(buildFallbackMetricsFromTwelveData(ticker, twelveDataQuote));
      }

      const massiveDetails = await fetchMassiveTickerDetails(ticker);
      if (massiveDetails) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
        return res.status(200).json(buildFallbackMetricsFromMassive(ticker, massiveDetails));
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
