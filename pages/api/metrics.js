import {
  fetchYahooQuoteSnapshot,
  mapYahooMetrics,
  normalizeYahooSymbol,
} from '../../lib/server/yahoo-finance';

const DEFAULT_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const TWELVE_DATA_API_KEY = String(process.env.TWELVE_DATA_API_KEY || '').trim();
const MASSIVE_API_KEY = String(process.env.MASSIVE_API_KEY || '').trim();
const metricsCache = new Map();

function parseSymbol(raw) {
  const normalized = normalizeYahooSymbol(raw, {
    allowFxPair: false,
    allowFxWithSuffix: false,
  });
  return normalized || null;
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

async function fetchFmpMetrics(ticker, apiKey) {
  if (!apiKey) return null;

  const base = 'https://financialmodelingprep.com/stable';
  const url = (path) => `${base}/${path}?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;

  const [profileRes, ratiosRes, growthRes, cashFlowRes, keyMetricsRes] = await Promise.all([
    fetchWithTimeout(url('profile')),
    fetchWithTimeout(url('ratios')),
    fetchWithTimeout(url('financial-growth')),
    fetchWithTimeout(
      `${base}/cash-flow-statement?symbol=${encodeURIComponent(ticker)}&limit=1&apikey=${apiKey}`,
    ),
    fetchWithTimeout(url('key-metrics')),
  ]);

  if (!profileRes.ok || !ratiosRes.ok) return null;

  const profileData = await profileRes.json().catch(() => []);
  const ratiosData = await ratiosRes.json().catch(() => []);
  const growthData = growthRes.ok ? await growthRes.json().catch(() => []) : [];
  const cashFlowData = cashFlowRes.ok ? await cashFlowRes.json().catch(() => []) : [];
  const keyMetricsData = keyMetricsRes.ok ? await keyMetricsRes.json().catch(() => []) : [];

  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  const ratios = Array.isArray(ratiosData) ? ratiosData[0] : ratiosData;
  const growth = Array.isArray(growthData) ? growthData[0] : growthData;
  const cashFlow = Array.isArray(cashFlowData) ? cashFlowData[0] : cashFlowData;
  const keyMetrics = Array.isArray(keyMetricsData) ? keyMetricsData[0] : keyMetricsData;

  return {
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
}

async function fetchFallbackMetrics(ticker, apiKey) {
  const fmp = await fetchFmpMetrics(ticker, apiKey).catch(() => null);
  if (fmp) return fmp;

  const twelveDataQuote = await fetchTwelveDataQuote(ticker).catch(() => null);
  if (twelveDataQuote) return buildFallbackMetricsFromTwelveData(ticker, twelveDataQuote);

  const massiveDetails = await fetchMassiveTickerDetails(ticker).catch(() => null);
  if (massiveDetails) return buildFallbackMetricsFromMassive(ticker, massiveDetails);

  return null;
}

function readCachedMetrics(symbol) {
  const cached = metricsCache.get(symbol);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.data;
}

function writeCachedMetrics(symbol, data) {
  metricsCache.set(symbol, { fetchedAt: Date.now(), data });
}

function buildUnavailableMetrics(ticker, reason = 'upstream_unavailable') {
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
    companyName: ticker,
    source: 'unavailable',
    unavailableReason: reason,
  };
}

function hasAnySignalMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') return false;
  const keys = [
    'peRatio',
    'pbRatio',
    'pegRatio',
    'roe',
    'profitMargin',
    'roic',
    'debtToEquity',
    'currentRatio',
    'freeCashFlow',
    'dividendYield',
    'revenueGrowth',
    'earningsGrowth',
    'epsGrowth',
  ];

  return keys.some((key) => typeof metrics[key] === 'number' && Number.isFinite(metrics[key]));
}

function needsFallbackMerge(metrics) {
  const mergeKeys = [
    'peRatio',
    'pbRatio',
    'pegRatio',
    'roe',
    'profitMargin',
    'roic',
    'debtToEquity',
    'currentRatio',
    'freeCashFlow',
    'dividendYield',
    'revenueGrowth',
    'earningsGrowth',
    'epsGrowth',
  ];
  return mergeKeys.some((key) => metrics[key] === undefined || metrics[key] === null);
}

function mergeMissingMetrics(primary, fallback) {
  if (!fallback) return primary;
  const merged = { ...primary };
  for (const [key, value] of Object.entries(fallback)) {
    if (key === 'source') continue;
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
      merged[key] = value;
    }
  }

  if (primary.source === 'yahoo' && fallback.source && fallback.source !== 'yahoo') {
    merged.fallbackSource = fallback.source;
  }

  return merged;
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
    console.warn('[api/metrics] FMP_API_KEY missing; FMP fallback unavailable.');
  }
  if (!TWELVE_DATA_API_KEY) {
    console.warn('[api/metrics] TWELVE_DATA_API_KEY missing; Twelve Data fallback unavailable.');
  }
  if (!MASSIVE_API_KEY) {
    console.warn('[api/metrics] MASSIVE_API_KEY missing; Massive fallback unavailable.');
  }

  try {
    const yahooSnapshot = await fetchYahooQuoteSnapshot(ticker).catch(() => null);
    if (yahooSnapshot?.ok) {
      let metrics = mapYahooMetrics(yahooSnapshot.data, ticker);

      if (!hasAnySignalMetrics(metrics)) {
        const fallback = await fetchFallbackMetrics(ticker, apiKey);
        if (fallback) {
          writeCachedMetrics(ticker, fallback);
          res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
          return res.status(200).json(fallback);
        }
      } else {
        const fallback = needsFallbackMerge(metrics)
          ? await fetchFallbackMetrics(ticker, apiKey)
          : null;
        metrics = mergeMissingMetrics(metrics, fallback);

        writeCachedMetrics(ticker, metrics);
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
        return res.status(200).json(metrics);
      }
    }

    const fallbackMetrics = await fetchFallbackMetrics(ticker, apiKey);
    if (fallbackMetrics) {
      writeCachedMetrics(ticker, fallbackMetrics);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(fallbackMetrics);
    }

    const stale = readCachedMetrics(ticker);
    if (stale) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Data-Stale', '1');
      return res.status(200).json({ ...stale, stale: true });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(buildUnavailableMetrics(ticker));
  } catch (err) {
    if (!(err && typeof err === 'object' && err.name === 'AbortError')) {
      console.error('Metrics API error:', err);
    }

    const fallbackMetrics = await fetchFallbackMetrics(ticker, apiKey).catch(() => null);
    if (fallbackMetrics) {
      writeCachedMetrics(ticker, fallbackMetrics);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(fallbackMetrics);
    }

    const stale = readCachedMetrics(ticker);
    if (stale) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Data-Stale', '1');
      return res.status(200).json({ ...stale, stale: true });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(buildUnavailableMetrics(ticker));
  }
}
