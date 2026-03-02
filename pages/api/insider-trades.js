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
    const pageSize = 100;
    const maxPages = 8;
    let trades = [];

    // Per-symbol endpoint is currently restricted for this key, so filter from latest feed pages.
    for (let page = 0; page < maxPages; page++) {
      const tradesRes = await fetch(
        `https://financialmodelingprep.com/stable/insider-trading/latest?page=${page}&limit=${pageSize}&apikey=${apiKey}`,
      );
      if (!tradesRes.ok) {
        if (page === 0) {
          return res.status(502).json({ error: 'Failed to fetch insider trades', status: tradesRes.status });
        }
        break;
      }
      const pageTrades = await tradesRes.json();
      if (!Array.isArray(pageTrades) || pageTrades.length === 0) break;
      const filtered = pageTrades.filter((trade) => String(trade?.symbol || '').toUpperCase() === ticker);
      trades.push(...filtered);
      if (trades.length >= 100 || pageTrades.length < pageSize) break;
    }

    const profileRes = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
    );
    const profileData = await profileRes.json();
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    // Transform FMP format to expected format
    const transformed = (Array.isArray(trades) ? trades : []).map((trade) => {
      const shares = Number(trade.securitiesTransacted || 0);
      const price = Number(trade.price || trade.pricePerShare || 0);
      return {
      date: trade.filingDate || trade.transactionDate || '',
      insider: trade.reportingName || '',
      position: trade.typeOfOwner || trade.officerTitle || '',
      transaction: trade.transactionType || '',
      shares,
      price,
      value: shares * price,
      company: profile?.companyName || ticker,
      symbol: ticker,
    };
    });

    res.status(200).json({
      company: profile?.companyName || ticker,
      trades: transformed
    });
  } catch (err) {
    console.error('Insider trades API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
