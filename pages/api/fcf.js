export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid symbol' });
  }
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  try {
    const ticker = symbol.trim().toUpperCase();
    // Legacy v3 endpoint was sunset in 2025; use stable endpoint.
    const url = `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${encodeURIComponent(ticker)}&limit=1&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      return res
        .status(502)
        .json({ error: 'Upstream cash-flow API error', status: response.status, details });
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
