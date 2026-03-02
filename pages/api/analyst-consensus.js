const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const DEFAULT_TIMEOUT_MS = 12000;

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
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  try {
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

    if (!targetRes.ok && !ratingRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch analyst consensus' });
    }

    const targetData = targetRes.ok ? await targetRes.json() : [];
    const ratingData = ratingRes.ok ? await ratingRes.json() : [];
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
    const targetPrice = Number.isFinite(targetConsensus) ? targetConsensus.toFixed(2) : '-';

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      symbol: ticker,
      analystRecommendation,
      targetPrice,
      rating: ratingCode || null,
    });
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'Upstream request timed out' : 'Internal server error',
    });
  }
}
