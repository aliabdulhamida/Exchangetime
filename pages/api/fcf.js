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
    // Legacy v3 endpoint was sunset in 2025; use stable endpoint.
    const url = `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${encodeURIComponent(ticker)}&limit=1&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      return res
        .status(502)
        .json({ error: 'Upstream cash-flow API error', status: response.status, details });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(data);
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'Upstream request timed out' : 'Internal server error',
    });
  }
}
