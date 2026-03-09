import {
  fetchYahooQuoteSnapshot,
  normalizeYahooSymbol,
  toFiniteNumber,
  toNullableString,
} from '../../lib/server/yahoo-finance';

const DEFAULT_TIMEOUT_MS = 12000;

function parseSymbol(raw) {
  const normalized = normalizeYahooSymbol(raw, {
    allowFxPair: false,
    allowFxWithSuffix: false,
  });
  return normalized || null;
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

function toIsoDate(value) {
  const raw = toFiniteNumber(value?.raw ?? value);
  if (raw !== null && raw > 0) {
    return new Date(Math.floor(raw) * 1000).toISOString().slice(0, 10);
  }

  const fmt = toNullableString(value?.fmt ?? value);
  if (!fmt) return null;
  const parsed = new Date(fmt);
  if (Number.isNaN(parsed.getTime())) return fmt;
  return parsed.toISOString().slice(0, 10);
}

function mapYahooCashflowRows(summaryResult, ticker) {
  const annualRows = summaryResult?.cashflowStatementHistory?.cashflowStatements;
  const quarterlyRows = summaryResult?.cashflowStatementHistoryQuarterly?.cashflowStatements;
  const rows = Array.isArray(annualRows) && annualRows.length ? annualRows : Array.isArray(quarterlyRows) ? quarterlyRows : [];

  return rows
    .map((row) => {
      const freeCashFlow = toFiniteNumber(row?.freeCashFlow);
      const operatingCashFlow =
        toFiniteNumber(row?.totalCashFromOperatingActivities) ||
        toFiniteNumber(row?.operatingCashFlow) ||
        null;
      const capitalExpenditure =
        toFiniteNumber(row?.capitalExpenditures) ||
        toFiniteNumber(row?.capitalExpenditure) ||
        null;

      return {
        symbol: ticker,
        date: toIsoDate(row?.endDate || row?.date),
        freeCashFlow,
        operatingCashFlow,
        capitalExpenditure,
        source: 'yahoo',
      };
    })
    .filter((row) => row.freeCashFlow !== null || row.operatingCashFlow !== null);
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

  try {
    const yahooSnapshot = await fetchYahooQuoteSnapshot(ticker, [
      'financialData',
      'cashflowStatementHistory',
      'cashflowStatementHistoryQuarterly',
      'price',
    ]).catch(() => null);

    if (yahooSnapshot?.ok) {
      const rows = mapYahooCashflowRows(yahooSnapshot.data?.summaryResult, ticker);
      const freeCashflow = toFiniteNumber(yahooSnapshot.data?.financialData?.freeCashflow);

      if (!rows.length && freeCashflow !== null) {
        const asOf = toFiniteNumber(yahooSnapshot.data?.meta?.regularMarketTime);
        rows.push({
          symbol: ticker,
          date: asOf ? new Date(Math.floor(asOf) * 1000).toISOString().slice(0, 10) : null,
          freeCashFlow: freeCashflow,
          operatingCashFlow: null,
          capitalExpenditure: null,
          source: 'yahoo',
        });
      }

      if (rows.length) {
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
        return res.status(200).json(rows);
      }
    }

    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

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
