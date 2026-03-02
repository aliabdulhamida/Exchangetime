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
    // Get company profile and ratios from FMP
    const [profileRes, ratiosRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${apiKey}`)
    ]);

    if (!profileRes.ok || !ratiosRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch metrics from FMP' });
    }

    const profileData = await profileRes.json();
    const ratiosData = await ratiosRes.json();

    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    const ratios = Array.isArray(ratiosData) ? ratiosData[0] : ratiosData;

    const metrics = {
      peRatio: profile?.peRatioTTM,
      pbRatio: profile?.pbRatio,
      pegRatio: ratios?.priceEarningsToGrowthRatio,
      roe: ratios?.returnOnEquity,
      profitMargin: ratios?.netProfitMargin,
      roic: ratios?.returnOnCapitalEmployed,
      debtToEquity: ratios?.debtToEquity,
      currentRatio: ratios?.currentRatio,
      freeCashFlow: profile?.freeCashFlowPerShare,
      dividendYield: profile?.dividendYield,
      revenueGrowth: ratios?.assetGrowth,
      earningsGrowth: undefined,
      epsGrowth: undefined,
    };

    res.status(200).json(metrics);
  } catch (err) {
    console.error('Metrics API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
