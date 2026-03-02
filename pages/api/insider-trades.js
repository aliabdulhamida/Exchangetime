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
    // Get insider trading data from FMP
    const [tradesRes, profileRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v4/insider-trading?symbol=${symbol}&limit=100&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`)
    ]);

    if (!tradesRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch insider trades' });
    }

    const trades = await tradesRes.json();
    const profileData = await profileRes.json();
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    // Transform FMP format to expected format
    const transformed = (Array.isArray(trades) ? trades : []).map(trade => ({
      date: trade.filingDate || trade.transactionDate || '',
      insider: trade.reportingName || '',
      position: trade.officerTitle || '',
      transaction: trade.transactionType || '',
      shares: trade.securitiesTransacted || 0,
      price: trade.pricePerShare || 0,
      value: (trade.securitiesTransacted || 0) * (trade.pricePerShare || 0),
      company: profile?.companyName || symbol,
      symbol: symbol
    }));

    res.status(200).json({
      company: profile?.companyName || symbol,
      trades: transformed
    });
  } catch (err) {
    console.error('Insider trades API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
