const FEAR_GREED_API_URL = 'https://fear-and-greed-index.p.rapidapi.com/v1/fgi';
const FEAR_GREED_API_HOST = 'fear-and-greed-index.p.rapidapi.com';
const REQUEST_TIMEOUT_MS = 12000;

function getRapidApiKey() {
  return String(process.env.RAPIDAPI_KEY || '').trim();
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rapidApiKey = getRapidApiKey();
  if (!rapidApiKey) {
    console.warn('[api/fear-greed] RAPIDAPI_KEY missing; endpoint unavailable.');
    return res.status(503).json({ error: 'Fear & Greed provider not configured' });
  }

  try {
    const response = await fetchWithTimeout(FEAR_GREED_API_URL, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': FEAR_GREED_API_HOST,
      },
    });

    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: body?.message || body?.error || 'Failed to fetch fear and greed index',
      });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(body || {});
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'Fear & Greed provider timeout' : 'Fear & Greed provider error',
    });
  }
}
