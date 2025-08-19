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
    const url = `https://financialmodelingprep.com/api/v3/discounted-cash-flow/${symbol}?apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'FMP API error' });
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
