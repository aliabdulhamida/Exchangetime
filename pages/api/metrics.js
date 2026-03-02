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
  const base = 'https://financialmodelingprep.com/stable';
  const url = (path) => `${base}/${path}?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const toNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const toPercent = (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.abs(v) <= 1 ? v * 100 : v;
  };

  try {
    // Use current stable endpoints (legacy v3/v4 endpoints were discontinued after 2025-08-31).
    const [profileRes, ratiosRes, growthRes, cashFlowRes] = await Promise.all([
      fetch(url('profile')),
      fetch(url('ratios')),
      fetch(url('financial-growth')),
      fetch(`${base}/cash-flow-statement?symbol=${encodeURIComponent(ticker)}&limit=1&apikey=${apiKey}`),
    ]);

    if (!profileRes.ok || !ratiosRes.ok) {
      return res.status(502).json({
        error: 'Failed to fetch metrics from upstream provider',
        profileStatus: profileRes.status,
        ratiosStatus: ratiosRes.status,
      });
    }

    const profileData = await profileRes.json();
    const ratiosData = await ratiosRes.json();
    const growthData = growthRes.ok ? await growthRes.json() : [];
    const cashFlowData = cashFlowRes.ok ? await cashFlowRes.json() : [];

    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    const ratios = Array.isArray(ratiosData) ? ratiosData[0] : ratiosData;
    const growth = Array.isArray(growthData) ? growthData[0] : growthData;
    const cashFlow = Array.isArray(cashFlowData) ? cashFlowData[0] : cashFlowData;

    const metrics = {
      peRatio: toNum(ratios?.priceToEarningsRatio),
      pbRatio: toNum(ratios?.priceToBookRatio),
      pegRatio: toNum(ratios?.priceToEarningsGrowthRatio || ratios?.forwardPriceToEarningsGrowthRatio),
      roe: toPercent(ratios?.returnOnEquity),
      profitMargin: toPercent(ratios?.netProfitMargin),
      roic: toPercent(ratios?.returnOnCapitalEmployed || ratios?.returnOnAssets),
      debtToEquity: toNum(ratios?.debtToEquityRatio),
      currentRatio: toNum(ratios?.currentRatio),
      // Keep unit in billions to match frontend formatting logic.
      freeCashFlow:
        typeof cashFlow?.freeCashFlow === 'number' && Number.isFinite(cashFlow.freeCashFlow)
          ? cashFlow.freeCashFlow / 1_000_000_000
          : undefined,
      dividendYield: toPercent(ratios?.dividendYield || ratios?.dividendYieldPercentage),
      revenueGrowth: toPercent(growth?.revenueGrowth),
      earningsGrowth: toPercent(growth?.netIncomeGrowth),
      epsGrowth: undefined,
      companyName: profile?.companyName || ticker,
    };

    res.status(200).json(metrics);
  } catch (err) {
    console.error('Metrics API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
