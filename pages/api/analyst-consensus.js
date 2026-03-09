import {
  fetchYahooQuoteSnapshot,
  mapYahooAnalystConsensus,
  normalizeYahooSymbol,
} from '../../lib/server/yahoo-finance';

const DEFAULT_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const consensusCache = new Map();

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

function readCachedConsensus(symbol) {
  const cached = consensusCache.get(symbol);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.data;
}

function writeCachedConsensus(symbol, data) {
  consensusCache.set(symbol, { fetchedAt: Date.now(), data });
}

function buildUnavailableConsensus(symbol, reason = 'upstream_unavailable') {
  return {
    symbol,
    analystRecommendation: 'Not available',
    targetPrice: '-',
    rating: null,
    source: 'unavailable',
    unavailableReason: reason,
  };
}

function hasConsensusSignal(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.targetPrice && payload.targetPrice !== '-') return true;
  return Boolean(payload.analystRecommendation && payload.analystRecommendation !== 'Not available');
}

async function fetchFmpConsensus(ticker, apiKey) {
  if (!apiKey) return null;

  const [targetRes, ratingRes] = await Promise.all([
    fetchWithTimeout(
      `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${encodeURIComponent(
        ticker,
      )}&apikey=${apiKey}`,
    ),
    fetchWithTimeout(
      `https://financialmodelingprep.com/stable/ratings-snapshot?symbol=${encodeURIComponent(
        ticker,
      )}&apikey=${apiKey}`,
    ),
  ]);

  if (!targetRes.ok && !ratingRes.ok) return null;

  const targetData = targetRes.ok ? await targetRes.json().catch(() => []) : [];
  const ratingData = ratingRes.ok ? await ratingRes.json().catch(() => []) : [];
  const targetRow = Array.isArray(targetData) ? targetData[0] : targetData;
  const ratingRow = Array.isArray(ratingData) ? ratingData[0] : ratingData;

  const ratingMap = {
    A: 'Strong Buy',
    B: 'Buy',
    C: 'Hold',
    D: 'Sell',
    F: 'Strong Sell',
  };

  const ratingCode = String(ratingRow?.rating || '').toUpperCase();
  const analystRecommendation = ratingMap[ratingCode] || 'Not available';
  const targetConsensus = Number(targetRow?.targetConsensus);

  return {
    symbol: ticker,
    analystRecommendation,
    targetPrice: Number.isFinite(targetConsensus) ? targetConsensus.toFixed(2) : '-',
    rating: ratingCode || null,
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

  try {
    const yahooSnapshot = await fetchYahooQuoteSnapshot(ticker, [
      'financialData',
      'recommendationTrend',
      'defaultKeyStatistics',
      'summaryDetail',
      'price',
      'summaryProfile',
      'assetProfile',
    ]).catch(() => null);

    const yahooConsensus = yahooSnapshot?.ok
      ? mapYahooAnalystConsensus(yahooSnapshot.data, ticker)
      : null;

    if (hasConsensusSignal(yahooConsensus)) {
      writeCachedConsensus(ticker, yahooConsensus);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(yahooConsensus);
    }

    const fallback = await fetchFmpConsensus(ticker, apiKey);
    if (fallback) {
      writeCachedConsensus(ticker, fallback);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(fallback);
    }

    if (yahooConsensus) {
      writeCachedConsensus(ticker, yahooConsensus);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(yahooConsensus);
    }

    const stale = readCachedConsensus(ticker);
    if (stale) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Data-Stale', '1');
      return res.status(200).json({ ...stale, stale: true });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(buildUnavailableConsensus(ticker, apiKey ? 'upstream_unavailable' : 'api_key_missing'));
  } catch {
    const stale = readCachedConsensus(ticker);
    if (stale) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('X-Data-Stale', '1');
      return res.status(200).json({ ...stale, stale: true });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(buildUnavailableConsensus(ticker));
  }
}
