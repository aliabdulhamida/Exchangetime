const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const DEFAULT_TIMEOUT_MS = 12000;

function parseSymbol(raw) {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  if (!normalized || !SYMBOL_PATTERN.test(normalized)) return null;
  return normalized;
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPercent(value) {
  const n = parseNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickNumber(row, keys) {
  if (!row || typeof row !== 'object') return null;
  for (const key of keys) {
    const n = parseNumber(row[key]);
    if (n !== null) return n;
  }
  return null;
}

function firstRow(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  return payload && typeof payload === 'object' ? payload : null;
}

function normalizeCurrency(raw) {
  if (typeof raw !== 'string') return null;
  const cur = raw.trim().toUpperCase();
  if (cur === 'USD' || cur === 'EUR' || cur === 'GBP' || cur === 'CHF') return cur;
  return null;
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

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toFcfValue(row) {
  const direct = pickNumber(row, ['freeCashFlow']);
  if (direct !== null) return direct;

  const operating = pickNumber(row, ['operatingCashFlow', 'netCashProvidedByOperatingActivities']);
  const capex = pickNumber(row, ['capitalExpenditure', 'capitalExpenditures']);
  if (operating === null || capex === null) return null;

  // Capex is usually negative in providers; normalize to "subtract capex spend".
  return operating + (capex < 0 ? capex : -Math.abs(capex));
}

function buildFcfHistory(cashFlowRows) {
  const mapped = (Array.isArray(cashFlowRows) ? cashFlowRows : [])
    .map((row) => ({
      date:
        typeof row?.date === 'string'
          ? row.date
          : typeof row?.calendarYear === 'string'
            ? row.calendarYear
            : null,
      value: toFcfValue(row),
    }))
    .filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));

  if (mapped.length <= 1) return mapped;

  const hasDate = mapped.every((item) => typeof item.date === 'string' && item.date.length >= 4);
  if (!hasDate) return mapped;

  return [...mapped].sort((a, b) => {
    const ta = Date.parse(String(a.date));
    const tb = Date.parse(String(b.date));
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
    return ta - tb;
  });
}

function estimateGrowthPct(fcfHistory, growthRow) {
  if (fcfHistory.length >= 2) {
    const first = parseNumber(fcfHistory[0]?.value);
    const last = parseNumber(fcfHistory[fcfHistory.length - 1]?.value);
    const periods = fcfHistory.length - 1;
    if (first && last && first > 0 && last > 0 && periods > 0) {
      const cagr = (Math.pow(last / first, 1 / periods) - 1) * 100;
      return clamp(cagr, -15, 25);
    }
  }

  const revenueGrowth = toPercent(growthRow?.revenueGrowth);
  if (revenueGrowth !== null) return clamp(revenueGrowth * 0.35, -10, 18);
  return 5;
}

function buildForecast(latestHistoricalFcf, growthPct, years = 5) {
  if (!Number.isFinite(latestHistoricalFcf) || latestHistoricalFcf === 0) return [];
  const g = growthPct / 100;
  // Year-1 forecast should be next-period FCF, not the last reported historical value.
  return Array.from({ length: years }, (_, i) => {
    const value = latestHistoricalFcf * Math.pow(1 + g, i + 1);
    return Math.round(value * 100) / 100;
  });
}

function deriveDebt(balanceRow) {
  const explicitTotal = pickNumber(balanceRow, ['totalDebt']);
  if (explicitTotal !== null) return Math.max(0, explicitTotal);

  const longTerm = pickNumber(balanceRow, ['longTermDebt', 'longTermDebtNoncurrent']);
  const shortTerm = pickNumber(balanceRow, ['shortTermDebt', 'shortTermBorrowings', 'shortTermDebtTotal']);
  if (longTerm !== null || shortTerm !== null) {
    return Math.max(0, (longTerm || 0) + (shortTerm || 0));
  }
  return 0;
}

function deriveCash(balanceRow) {
  return Math.max(
    0,
    pickNumber(balanceRow, [
      'cashAndCashEquivalents',
      'cashAndShortTermInvestments',
      'cashAndCashEquivalentsAtCarryingValue',
    ]) || 0,
  );
}

function deriveSharesOutstanding(profileRow, metricsRow, price, marketCap) {
  const direct = pickNumber(profileRow, ['sharesOutstanding']) || pickNumber(metricsRow, ['weightedAverageShsOutDil']);
  if (direct && direct > 0) return direct;

  if (price && price > 0 && marketCap && marketCap > 0) {
    return marketCap / price;
  }
  return null;
}

function deriveTerminalGrowthPct(dcfRow, growthRow) {
  const dcfGrowth = toPercent(
    pickNumber(dcfRow, ['longTermGrowthRate', 'terminalGrowthRate', 'growthRate', 'perpetualGrowthRate']),
  );
  if (dcfGrowth !== null) return clamp(dcfGrowth, 0, 6);

  const revenueGrowth = toPercent(growthRow?.revenueGrowth);
  if (revenueGrowth !== null) return clamp(revenueGrowth * 0.25, 0.5, 5);

  return 2.5;
}

function deriveDiscountRatePct(dcfRow, profileRow) {
  const dcfRate = toPercent(
    pickNumber(dcfRow, ['wacc', 'discountRate', 'costOfCapital', 'weightedAverageCostOfCapital']),
  );
  if (dcfRate !== null && dcfRate > 0) return clamp(dcfRate, 4, 25);

  const beta = pickNumber(profileRow, ['beta']);
  if (beta !== null) {
    const riskFreeRate = 4.0;
    const marketRiskPremium = 5.5;
    const capm = riskFreeRate + beta * marketRiskPremium;
    return clamp(capm, 4, 25);
  }
  return 10;
}

function calculatePerShareFromForecast({
  forecast,
  discountRatePct,
  terminalGrowthPct,
  cash,
  debt,
  sharesOutstanding,
}) {
  if (!Array.isArray(forecast) || forecast.length === 0 || !Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) {
    return null;
  }

  const r = discountRatePct / 100;
  const g = terminalGrowthPct / 100;
  if (!Number.isFinite(r) || !Number.isFinite(g) || r <= g || r <= -0.99) return null;

  let pv = 0;
  for (let i = 0; i < forecast.length; i++) {
    const f = parseNumber(forecast[i]);
    if (!Number.isFinite(f)) return null;
    pv += f / Math.pow(1 + r, i + 1);
  }

  const lastFcf = parseNumber(forecast[forecast.length - 1]);
  if (!Number.isFinite(lastFcf)) return null;

  const terminalValue = (lastFcf * (1 + g)) / (r - g);
  const pvTerminal = terminalValue / Math.pow(1 + r, forecast.length);
  const enterpriseValue = pv + pvTerminal;
  const equityValue = enterpriseValue + (Number.isFinite(cash) ? cash : 0) - (Number.isFinite(debt) ? debt : 0);
  return equityValue / sharesOutstanding;
}

function solveDiscountRateForTargetDcf({
  targetPerShare,
  forecast,
  terminalGrowthPct,
  cash,
  debt,
  sharesOutstanding,
}) {
  if (!Number.isFinite(targetPerShare) || targetPerShare <= 0) return null;
  if (!Array.isArray(forecast) || forecast.length < 3) return null;
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;

  let lo = Math.max(terminalGrowthPct + 0.3, 1.0);
  let hi = 40.0;

  const loVal = calculatePerShareFromForecast({
    forecast,
    discountRatePct: lo,
    terminalGrowthPct,
    cash,
    debt,
    sharesOutstanding,
  });
  const hiVal = calculatePerShareFromForecast({
    forecast,
    discountRatePct: hi,
    terminalGrowthPct,
    cash,
    debt,
    sharesOutstanding,
  });

  if (!Number.isFinite(loVal) || !Number.isFinite(hiVal)) return null;
  if (!(loVal >= targetPerShare && hiVal <= targetPerShare)) return null;

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const midVal = calculatePerShareFromForecast({
      forecast,
      discountRatePct: mid,
      terminalGrowthPct,
      cash,
      debt,
      sharesOutstanding,
    });

    if (!Number.isFinite(midVal)) return null;
    if (midVal > targetPerShare) lo = mid;
    else hi = mid;
  }

  const solved = (lo + hi) / 2;
  return Number.isFinite(solved) ? clamp(solved, 1, 40) : null;
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

  const u = (path, extra = '') =>
    `${FMP_BASE_URL}/${path}?symbol=${encodeURIComponent(ticker)}${extra}&apikey=${apiKey}`;

  try {
    const [profileRes, metricsRes, growthRes, balanceRes, cashFlowRes, dcfRes] = await Promise.all([
      fetchWithTimeout(u('profile')),
      fetchWithTimeout(u('key-metrics', '&limit=1')),
      fetchWithTimeout(u('financial-growth', '&limit=1')),
      fetchWithTimeout(u('balance-sheet-statement', '&limit=1')),
      fetchWithTimeout(u('cash-flow-statement', '&limit=5')),
      fetchWithTimeout(u('discounted-cash-flow')),
    ]);

    if (!profileRes.ok && !balanceRes.ok && !cashFlowRes.ok && !dcfRes.ok) {
      return res.status(502).json({
        error: 'Failed to fetch DCF inputs from upstream provider',
        profileStatus: profileRes.status,
        balanceStatus: balanceRes.status,
        cashFlowStatus: cashFlowRes.status,
        dcfStatus: dcfRes.status,
      });
    }

    const [profilePayload, metricsPayload, growthPayload, balancePayload, cashFlowPayload, dcfPayload] =
      await Promise.all([
        profileRes.ok ? parseJsonSafe(profileRes) : null,
        metricsRes.ok ? parseJsonSafe(metricsRes) : null,
        growthRes.ok ? parseJsonSafe(growthRes) : null,
        balanceRes.ok ? parseJsonSafe(balanceRes) : null,
        cashFlowRes.ok ? parseJsonSafe(cashFlowRes) : null,
        dcfRes.ok ? parseJsonSafe(dcfRes) : null,
      ]);

    const profile = firstRow(profilePayload);
    const keyMetrics = firstRow(metricsPayload);
    const growth = firstRow(growthPayload);
    const balance = firstRow(balancePayload);
    const dcf = firstRow(dcfPayload);
    const cashFlowRows = Array.isArray(cashFlowPayload) ? cashFlowPayload : [];

    const price = pickNumber(profile, ['price']);
    const marketCap =
      pickNumber(profile, ['marketCap', 'mktCap', 'marketCapitalization']) ||
      pickNumber(keyMetrics, ['marketCap', 'mktCap', 'marketCapitalization']);
    const sharesOutstanding = deriveSharesOutstanding(profile, keyMetrics, price, marketCap);
    const cash = deriveCash(balance);
    const debt = deriveDebt(balance);
    const debtRatio = debt > 0 && marketCap && marketCap > 0 ? clamp((debt / (debt + marketCap)) * 100, 0, 99) : null;
    const taxRate = toPercent(
      pickNumber(keyMetrics, ['effectiveTaxRate']) || pickNumber(growth, ['effectiveTaxRate']),
    );
    const beta = pickNumber(profile, ['beta']);

    const terminalGrowth = deriveTerminalGrowthPct(dcf, growth);

    const fcfHistory = buildFcfHistory(cashFlowRows);
    const latestFcf = fcfHistory.length ? parseNumber(fcfHistory[fcfHistory.length - 1]?.value) : null;
    const fcfGrowthPct = estimateGrowthPct(fcfHistory, growth);
    const fcfForecast = latestFcf ? buildForecast(latestFcf, fcfGrowthPct, 5) : [];
    const fcfStart = fcfForecast.length ? fcfForecast[0] : null;
    const baseDiscountRate = deriveDiscountRatePct(dcf, profile);
    const targetDcfPerShare = pickNumber(dcf, ['dcf']);
    const impliedDiscountRate = solveDiscountRateForTargetDcf({
      targetPerShare: targetDcfPerShare,
      forecast: fcfForecast,
      terminalGrowthPct: terminalGrowth,
      cash,
      debt,
      sharesOutstanding,
    });
    const discountRate = impliedDiscountRate ?? baseDiscountRate;

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      symbol: ticker,
      companyName: profile?.companyName || ticker,
      source: 'fmp',
      inputs: {
        currentPrice: price,
        currency: normalizeCurrency(profile?.currency),
        sharesOutstanding,
        cash,
        debt,
        beta,
        taxRate,
        debtRatio,
        discountRate,
        discountRateSource: impliedDiscountRate !== null ? 'implied_from_fmp_dcf' : 'capm_or_fmp_rate',
        terminalGrowth,
      },
      fcf: {
        history: fcfHistory,
        latestHistorical: latestFcf,
        start: fcfStart,
        growthRatePct: fcfGrowthPct,
        forecast: fcfForecast,
      },
      asOf: balance?.date || cashFlowRows?.[0]?.date || null,
    });
  } catch (err) {
    const isTimeout = err && typeof err === 'object' && err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'Upstream request timed out' : 'Internal server error',
    });
  }
}
