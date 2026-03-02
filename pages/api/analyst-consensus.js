export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid symbol' });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const ticker = symbol.trim().toUpperCase();

  try {
    const [targetRes, ratingRes] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${encodeURIComponent(
          ticker,
        )}&apikey=${apiKey}`,
      ),
      fetch(
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

    return res.status(200).json({
      symbol: ticker,
      analystRecommendation,
      targetPrice,
      rating: ratingCode || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
