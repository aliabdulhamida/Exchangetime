import {
  fetchYahooQuoteSnapshot,
  mapYahooInsiderTrades,
  normalizeYahooSymbol,
} from '../../lib/server/yahoo-finance';

const NASDAQ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.nasdaq.com/',
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

function parseSymbol(raw) {
  const normalized = normalizeYahooSymbol(raw, {
    allowFxPair: false,
    allowFxWithSuffix: false,
  });
  return normalized || null;
}

function parseNumeric(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let text = String(value).trim();
  if (!text) return 0;

  const bracketedNegative = text.match(/^\((.*)\)$/);
  const isNegative = Boolean(bracketedNegative);
  if (isNegative) text = bracketedNegative[1];

  text = text.replace(/[^0-9.-]/g, '');
  if (!text || text === '-' || text === '.' || text === '-.') return 0;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return isNegative ? -Math.abs(parsed) : parsed;
}

function normalizeDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!mdy) return str;

  const [, month, day, year] = mdy;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function fetchNasdaqJson(url) {
  const response = await fetch(url, {
    headers: NASDAQ_HEADERS,
    cache: 'no-store',
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function mapNasdaqTrades(rows, ticker, company) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const shares = parseNumeric(row?.sharesTraded);
      const price = parseNumeric(row?.lastPrice);

      return {
        date: normalizeDate(row?.lastDate),
        insider: row?.insider || '',
        position: row?.relation || '',
        transaction: row?.transactionType || '',
        shares,
        price,
        value: shares * price,
        company,
        symbol: ticker,
      };
    })
    .filter((trade) => trade.date && trade.insider)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function fetchNasdaqTrades(ticker) {
  const insiderUrl = `https://api.nasdaq.com/api/company/${encodeURIComponent(ticker)}/insider-trades`;
  const companyUrl = `https://api.nasdaq.com/api/company/${encodeURIComponent(ticker)}/company-profile`;

  const [insiderResponse, companyResponse] = await Promise.all([
    fetchNasdaqJson(insiderUrl),
    fetchNasdaqJson(companyUrl),
  ]);

  if (!insiderResponse.ok) {
    return {
      ok: false,
      status: insiderResponse.status,
    };
  }

  const rows = insiderResponse.payload?.data?.transactionTable?.table?.rows;
  const companyName =
    companyResponse.payload?.data?.CompanyName?.value ||
    companyResponse.payload?.data?.companyName ||
    ticker;

  return {
    ok: true,
    data: {
      company: companyName,
      trades: mapNasdaqTrades(rows, ticker, companyName),
      source: 'nasdaq',
    },
  };
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

  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=900');
    return res.status(200).json(cached.data);
  }

  try {
    const yahooSnapshot = await fetchYahooQuoteSnapshot(ticker, [
      'insiderTransactions',
      'price',
      'summaryProfile',
      'assetProfile',
      'defaultKeyStatistics',
    ]).catch(() => null);

    const yahooData = yahooSnapshot?.ok
      ? mapYahooInsiderTrades(yahooSnapshot.data, ticker)
      : null;

    if (yahooData && Array.isArray(yahooData.trades) && yahooData.trades.length > 0) {
      cache.set(ticker, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: yahooData,
      });
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=900');
      return res.status(200).json(yahooData);
    }

    const nasdaqData = await fetchNasdaqTrades(ticker);
    if (nasdaqData.ok) {
      cache.set(ticker, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: nasdaqData.data,
      });
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=900');
      return res.status(200).json(nasdaqData.data);
    }

    if (yahooData) {
      cache.set(ticker, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: yahooData,
      });
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=900');
      return res.status(200).json(yahooData);
    }

    return res.status(502).json({
      error: 'Failed to fetch insider trades',
      status: nasdaqData.status,
    });
  } catch (err) {
    console.error('Insider trades API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
