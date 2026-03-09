const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const FX_SYMBOL_PATTERN = /^[A-Z]{6}=X$/;
const FX_PAIR_PATTERN = /^[A-Z]{6}$/;

const ALLOWED_INTERVALS = new Set([
  '1m',
  '2m',
  '5m',
  '15m',
  '30m',
  '60m',
  '90m',
  '1h',
  '1d',
  '5d',
  '1wk',
  '1mo',
  '3mo',
]);

const ALLOWED_RANGES = new Set([
  '1d',
  '5d',
  '1mo',
  '3mo',
  '6mo',
  '1y',
  '2y',
  '5y',
  '10y',
  'ytd',
  'max',
]);

const ALLOWED_EVENTS = new Set(['div', 'split', 'div,splits', 'capitalGain', 'history']);

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://finance.yahoo.com/',
};

const YAHOO_AUTH_TTL_MS = 15 * 60 * 1000;

let yahooAuthCache: { cookieHeader: string; crumb: string; fetchedAt: number } | null = null;

const DEFAULT_QUOTE_SUMMARY_MODULES = [
  'summaryProfile',
  'assetProfile',
  'summaryDetail',
  'defaultKeyStatistics',
  'financialData',
] as const;

export type NormalizeSymbolOptions = {
  allowFxPair?: boolean;
  allowFxWithSuffix?: boolean;
};

export type YahooQuoteSnapshot = {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  meta: Record<string, any>;
  chartResult: Record<string, any> | null;
  chartRaw: Record<string, any> | null;
  quoteResult: Record<string, any> | null;
  summaryResult: Record<string, any> | null;
  summaryProfile: Record<string, any>;
  summaryDetail: Record<string, any>;
  defaultKeyStats: Record<string, any>;
  financialData: Record<string, any>;
};

export type YahooChartResult = {
  chartRaw: Record<string, any> | null;
  chartResult: Record<string, any> | null;
  series: number[];
  timestamps: number[];
  currency: string | null;
};

export function normalizeYahooSymbol(
  raw: unknown,
  options: NormalizeSymbolOptions = {},
): string | null {
  const normalized = String(raw || '').trim().toUpperCase();
  if (!normalized) return null;

  const { allowFxPair = false, allowFxWithSuffix = true } = options;

  if (SYMBOL_PATTERN.test(normalized)) return normalized;
  if (allowFxWithSuffix && FX_SYMBOL_PATTERN.test(normalized)) return normalized;
  if (allowFxPair && FX_PAIR_PATTERN.test(normalized)) return normalized;

  return null;
}

export function toYahooRequestSymbol(symbol: string): string {
  if (FX_SYMBOL_PATTERN.test(symbol)) return symbol;
  if (FX_PAIR_PATTERN.test(symbol)) return `${symbol}=X`;
  return symbol;
}

export function normalizeUnixParam(raw: string): string {
  if (!raw) return '';
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return String(Math.floor(parsed));
}

export function normalizeBooleanParam(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return 'true';
  if (normalized === 'false' || normalized === '0') return 'false';
  return '';
}

export function parseJsonSafely(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function toFiniteNumber(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof value.raw === 'number' && Number.isFinite(value.raw)) {
    return value.raw;
  }
  return null;
}

export function toNullableString(value: any): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (!value || typeof value !== 'object') return null;

  const longFmt = typeof value.longFmt === 'string' ? value.longFmt.trim() : '';
  if (longFmt) return longFmt;

  const fmt = typeof value.fmt === 'string' ? value.fmt.trim() : '';
  if (fmt) return fmt;

  const raw = typeof value.raw === 'string' ? value.raw.trim() : '';
  if (raw) return raw;

  return null;
}

function coercePercent(value: number | null): number | undefined {
  if (value === null || !Number.isFinite(value)) return undefined;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function normalizeYieldToPercent(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.abs(value) < 1 ? value * 100 : value;
}

function parseSuffixNumber(textValue: unknown): number | null {
  const text = String(textValue || '').trim();
  if (!text) return null;
  const cleaned = text.replace(/\$/g, '').replace(/,/g, '').replace(/\s+/g, '');
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)([KMBT])?$/i);
  if (!match) {
    const numeric = Number(cleaned.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = String(match[2] || '').toUpperCase();
  if (suffix === 'K') return base * 1_000;
  if (suffix === 'M') return base * 1_000_000;
  if (suffix === 'B') return base * 1_000_000_000;
  if (suffix === 'T') return base * 1_000_000_000_000;
  return base;
}

async function fetchWithYahooHeaders(url: string) {
  return fetch(url, {
    cache: 'no-store',
    headers: DEFAULT_HEADERS,
  });
}

function getSetCookieValues(headers: Headers): string[] {
  const maybeGetSetCookie = (headers as any)?.getSetCookie;
  if (typeof maybeGetSetCookie === 'function') {
    const values = maybeGetSetCookie.call(headers);
    if (Array.isArray(values)) {
      return values.filter((value) => typeof value === 'string' && value.trim());
    }
  }

  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function extractCookieHeader(headers: Headers): string | null {
  const setCookieValues = getSetCookieValues(headers);
  if (!setCookieValues.length) return null;

  const pairs = new Map<string, string>();
  for (const setCookie of setCookieValues) {
    const firstPair = String(setCookie || '').split(';')[0]?.trim();
    if (!firstPair || !firstPair.includes('=')) continue;
    const eqIndex = firstPair.indexOf('=');
    const name = firstPair.slice(0, eqIndex).trim();
    const value = firstPair.slice(eqIndex + 1).trim();
    if (!name || !value) continue;
    pairs.set(name, `${name}=${value}`);
  }

  if (!pairs.size) return null;
  return Array.from(pairs.values()).join('; ');
}

function mergeCookieHeaders(...cookieHeaders: Array<string | null | undefined>): string | null {
  const pairs = new Map<string, string>();
  for (const cookieHeader of cookieHeaders) {
    const parts = String(cookieHeader || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      const eqIndex = part.indexOf('=');
      if (eqIndex <= 0) continue;
      const name = part.slice(0, eqIndex).trim();
      const value = part.slice(eqIndex + 1).trim();
      if (!name || !value) continue;
      pairs.set(name, `${name}=${value}`);
    }
  }

  if (!pairs.size) return null;
  return Array.from(pairs.values()).join('; ');
}

function isValidYahooCrumb(value: string): boolean {
  const crumb = String(value || '').trim();
  if (!crumb || crumb.length > 128) return false;
  if (crumb.startsWith('{') || crumb.includes('Invalid')) return false;
  return true;
}

function withYahooCrumb(url: string, crumb: string): string {
  if (!crumb) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('crumb', crumb);
    return parsed.toString();
  } catch {
    return url;
  }
}

function yahooEndpointNeedsAuth(url: string): boolean {
  return (
    url.includes('/v7/finance/quote') ||
    url.includes('/v10/finance/quoteSummary') ||
    url.includes('/ws/fundamentals-timeseries/')
  );
}

async function fetchYahooAuth(forceRefresh = false): Promise<{ cookieHeader: string; crumb: string } | null> {
  if (!forceRefresh && yahooAuthCache && Date.now() - yahooAuthCache.fetchedAt < YAHOO_AUTH_TTL_MS) {
    return {
      cookieHeader: yahooAuthCache.cookieHeader,
      crumb: yahooAuthCache.crumb,
    };
  }

  try {
    const seedResponse = await fetch('https://fc.yahoo.com', {
      cache: 'no-store',
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
    });
    const seedCookie = extractCookieHeader(seedResponse.headers);
    if (!seedCookie) return null;

    const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      cache: 'no-store',
      headers: {
        ...DEFAULT_HEADERS,
        Cookie: seedCookie,
      },
    });
    const crumbText = (await crumbResponse.text()).trim();
    if (!crumbResponse.ok || !isValidYahooCrumb(crumbText)) return null;

    const crumbCookie = extractCookieHeader(crumbResponse.headers);
    const cookieHeader = mergeCookieHeaders(seedCookie, crumbCookie);
    if (!cookieHeader) return null;

    yahooAuthCache = {
      cookieHeader,
      crumb: crumbText,
      fetchedAt: Date.now(),
    };

    return {
      cookieHeader,
      crumb: crumbText,
    };
  } catch {
    return null;
  }
}

async function fetchYahooWithOptionalAuth(url: string) {
  const needsAuth = yahooEndpointNeedsAuth(url);
  if (!needsAuth) {
    return fetchWithYahooHeaders(url);
  }

  const auth = await fetchYahooAuth(false);
  if (!auth) {
    return fetchWithYahooHeaders(url);
  }

  let response = await fetch(withYahooCrumb(url, auth.crumb), {
    cache: 'no-store',
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: auth.cookieHeader,
    },
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshedAuth = await fetchYahooAuth(true);
  if (!refreshedAuth) {
    return response;
  }

  response = await fetch(withYahooCrumb(url, refreshedAuth.crumb), {
    cache: 'no-store',
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: refreshedAuth.cookieHeader,
    },
  });

  return response;
}

export async function fetchYahooJson(url: string) {
  const response = await fetchYahooWithOptionalAuth(url);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text,
    json: parseJsonSafely(text),
  };
}

export function buildYahooChartUrl(symbol: string, params: URLSearchParams): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`;
}

export async function fetchYahooChart(
  symbol: string,
  inputParams: {
    interval?: string;
    range?: string;
    period1?: string;
    period2?: string;
    includePrePost?: string;
    events?: string;
  } = {},
): Promise<{ ok: true; data: YahooChartResult } | { ok: false; status: number; error: string }> {
  const params = new URLSearchParams();
  const intervalRaw = String(inputParams.interval || '').trim().toLowerCase();
  const interval = ALLOWED_INTERVALS.has(intervalRaw) ? intervalRaw : '1d';
  const rangeRaw = String(inputParams.range || '').trim().toLowerCase();
  const range = ALLOWED_RANGES.has(rangeRaw) ? rangeRaw : '7d';
  const period1 = normalizeUnixParam(String(inputParams.period1 || '').trim());
  const period2 = normalizeUnixParam(String(inputParams.period2 || '').trim());
  const includePrePost = normalizeBooleanParam(String(inputParams.includePrePost || '').trim());
  const eventsRaw = String(inputParams.events || '').trim();
  const events = ALLOWED_EVENTS.has(eventsRaw) ? eventsRaw : '';

  params.set('interval', interval);
  if (period1) params.set('period1', period1);
  if (period2) params.set('period2', period2);
  if (!period1 && !period2) params.set('range', range);
  if (includePrePost) params.set('includePrePost', includePrePost);
  if (events) params.set('events', events);

  const url = buildYahooChartUrl(symbol, params);
  const result = await fetchYahooJson(url);
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      error: result.json?.finance?.error?.description || result.text.slice(0, 250) || 'Chart fetch failed',
    };
  }

  const chartRaw = result.json;
  const chartResult = chartRaw?.chart?.result?.[0] || null;
  const series = Array.isArray(chartResult?.indicators?.quote?.[0]?.close)
    ? chartResult.indicators.quote[0].close.filter((v: unknown) => typeof v === 'number' && Number.isFinite(v))
    : [];
  const timestamps = Array.isArray(chartResult?.timestamp)
    ? chartResult.timestamp.filter((v: unknown) => typeof v === 'number' && Number.isFinite(v))
    : [];

  return {
    ok: true,
    data: {
      chartRaw,
      chartResult,
      series,
      timestamps,
      currency: toNullableString(chartResult?.meta?.currency),
    },
  };
}

export async function fetchYahooQuoteSummary(
  symbol: string,
  modules: readonly string[] = DEFAULT_QUOTE_SUMMARY_MODULES,
): Promise<{ ok: true; result: Record<string, any> | null } | { ok: false; status: number }> {
  const moduleList = Array.from(new Set(modules.map((m) => String(m || '').trim()).filter(Boolean)));
  if (!moduleList.length) {
    return { ok: true, result: null };
  }

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=${encodeURIComponent(moduleList.join(','))}`;
  const response = await fetchYahooJson(url);
  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return {
    ok: true,
    result: response.json?.quoteSummary?.result?.[0] || null,
  };
}

export async function fetchYahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const response = await fetchYahooJson(url);
  if (!response.ok) {
    return { ok: false as const, status: response.status };
  }
  return {
    ok: true as const,
    result: response.json?.quoteResponse?.result?.[0] || null,
  };
}

export async function fetchYahooQuoteSnapshot(
  symbol: string,
  modules: readonly string[] = DEFAULT_QUOTE_SUMMARY_MODULES,
): Promise<{ ok: true; data: YahooQuoteSnapshot } | { ok: false; status: number; error: string }> {
  const chart = await fetchYahooChart(symbol, { interval: '1d', range: '5d' });
  if (!chart.ok) {
    return {
      ok: false,
      status: chart.status,
      error: chart.error,
    };
  }

  const [quoteResponse, summaryResponse] = await Promise.all([
    fetchYahooQuote(symbol).catch(() => ({ ok: false as const, status: 500 })),
    fetchYahooQuoteSummary(symbol, modules).catch(() => ({ ok: false as const, status: 500 })),
  ]);

  const quoteResult = quoteResponse.ok ? quoteResponse.result : null;
  const summaryResult = summaryResponse.ok ? summaryResponse.result : null;

  const chartResult = chart.data.chartResult;
  const meta = chartResult?.meta || {};
  const closes: number[] = Array.isArray(chartResult?.indicators?.quote?.[0]?.close)
    ? chartResult.indicators.quote[0].close.filter((v: unknown) => typeof v === 'number' && Number.isFinite(v))
    : [];
  const latestClose = closes.length ? closes[closes.length - 1] : null;

  const price =
    toFiniteNumber(meta?.regularMarketPrice) ??
    toFiniteNumber(quoteResult?.regularMarketPrice) ??
    latestClose ??
    null;
  const previousClose =
    toFiniteNumber(meta?.previousClose) ??
    toFiniteNumber(quoteResult?.regularMarketPreviousClose) ??
    (closes.length > 1 ? closes[closes.length - 2] : null);
  const currency = toNullableString(meta?.currency) || toNullableString(quoteResult?.currency) || null;

  if (price === null) {
    return {
      ok: false,
      status: 502,
      error: 'Price not available from Yahoo chart endpoint',
    };
  }

  const summaryProfile = summaryResult?.summaryProfile || summaryResult?.assetProfile || {};
  const summaryDetail = summaryResult?.summaryDetail || {};
  const defaultKeyStats = summaryResult?.defaultKeyStatistics || {};
  const financialData = summaryResult?.financialData || {};

  return {
    ok: true,
    data: {
      symbol,
      price,
      previousClose,
      currency,
      meta,
      chartResult,
      chartRaw: chart.data.chartRaw,
      quoteResult,
      summaryResult,
      summaryProfile,
      summaryDetail,
      defaultKeyStats,
      financialData,
    },
  };
}

export function mapYahooMetrics(snapshot: YahooQuoteSnapshot, fallbackCompanyName?: string) {
  const quoteResult = snapshot.quoteResult || {};
  const summaryDetail = snapshot.summaryDetail || {};
  const defaultKeyStats = snapshot.defaultKeyStats || {};
  const financialData = snapshot.financialData || {};

  const freeCashflowRaw = toFiniteNumber(financialData?.freeCashflow) ?? toFiniteNumber(financialData?.freeCashFlow);

  return {
    peRatio:
      toFiniteNumber(quoteResult?.trailingPE) ??
      toFiniteNumber(quoteResult?.trailingPe) ??
      toFiniteNumber(summaryDetail?.trailingPE) ??
      toFiniteNumber(summaryDetail?.trailingPe) ??
      toFiniteNumber(defaultKeyStats?.trailingPE) ??
      toFiniteNumber(defaultKeyStats?.trailingPe) ??
      undefined,
    pbRatio:
      toFiniteNumber(quoteResult?.priceToBook) ??
      toFiniteNumber(summaryDetail?.priceToBook) ??
      toFiniteNumber(defaultKeyStats?.priceToBookRatio) ??
      toFiniteNumber(defaultKeyStats?.priceToBook) ??
      undefined,
    pegRatio:
      toFiniteNumber(quoteResult?.pegRatio) ??
      toFiniteNumber(quoteResult?.trailingPegRatio) ??
      toFiniteNumber(summaryDetail?.pegRatio) ??
      toFiniteNumber(summaryDetail?.trailingPegRatio) ??
      toFiniteNumber(defaultKeyStats?.pegRatio) ??
      toFiniteNumber(defaultKeyStats?.trailingPegRatio) ??
      undefined,
    roe:
      coercePercent(toFiniteNumber(financialData?.returnOnEquity) ?? toFiniteNumber(defaultKeyStats?.returnOnEquity)) ??
      undefined,
    profitMargin:
      coercePercent(toFiniteNumber(financialData?.profitMargins) ?? toFiniteNumber(defaultKeyStats?.profitMargins)) ??
      undefined,
    roic: coercePercent(toFiniteNumber(financialData?.returnOnAssets)) ?? undefined,
    debtToEquity: toFiniteNumber(financialData?.debtToEquity) ?? undefined,
    currentRatio: toFiniteNumber(financialData?.currentRatio) ?? undefined,
    freeCashFlow:
      typeof freeCashflowRaw === 'number' && Number.isFinite(freeCashflowRaw)
        ? freeCashflowRaw / 1_000_000_000
        : undefined,
    dividendYield:
      coercePercent(
        toFiniteNumber(quoteResult?.dividendYield) ??
          toFiniteNumber(summaryDetail?.dividendYield) ??
          toFiniteNumber(defaultKeyStats?.dividendYield),
      ) ?? undefined,
    revenueGrowth: coercePercent(toFiniteNumber(financialData?.revenueGrowth)) ?? undefined,
    earningsGrowth: coercePercent(toFiniteNumber(financialData?.earningsGrowth)) ?? undefined,
    epsGrowth: coercePercent(toFiniteNumber(defaultKeyStats?.earningsQuarterlyGrowth)) ?? undefined,
    companyName:
      toNullableString(quoteResult?.longName) ||
      toNullableString(quoteResult?.shortName) ||
      toNullableString(snapshot.summaryProfile?.companyName) ||
      fallbackCompanyName ||
      snapshot.symbol,
    source: 'yahoo',
  };
}

function recommendationToLetter(recommendation: string): string | null {
  const normalized = recommendation.trim().toLowerCase().replace(/\s+/g, '_');
  if (!normalized) return null;
  if (normalized === 'strong_buy') return 'A';
  if (normalized === 'buy' || normalized === 'overweight' || normalized === 'outperform') return 'B';
  if (normalized === 'hold' || normalized === 'neutral') return 'C';
  if (normalized === 'underperform' || normalized === 'underweight' || normalized === 'sell') return 'D';
  if (normalized === 'strong_sell') return 'F';
  return null;
}

function recommendationFromMean(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (value <= 1.5) return 'Strong Buy';
  if (value <= 2.2) return 'Buy';
  if (value <= 3.2) return 'Hold';
  if (value <= 4.2) return 'Sell';
  return 'Strong Sell';
}

export function mapYahooAnalystConsensus(snapshot: YahooQuoteSnapshot, symbol: string) {
  const financialData = snapshot.financialData || {};
  const recommendationKey = String(financialData?.recommendationKey || '').trim();
  const recommendationFromKey = recommendationKey
    ? recommendationKey
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
    : null;

  const recommendationMean = toFiniteNumber(financialData?.recommendationMean);
  const analystRecommendation = recommendationFromKey || recommendationFromMean(recommendationMean) || 'Not available';

  const rating = recommendationToLetter(recommendationKey) || recommendationToLetter(analystRecommendation) || null;
  const targetMean =
    toFiniteNumber(financialData?.targetMeanPrice) ??
    toFiniteNumber(financialData?.targetMedianPrice) ??
    null;

  return {
    symbol,
    analystRecommendation,
    targetPrice: targetMean !== null ? targetMean.toFixed(2) : '-',
    rating,
    source: 'yahoo',
  };
}

function normalizeDateForInsider(value: any): string {
  const unix = toFiniteNumber(value?.raw ?? value);
  if (unix !== null && unix > 0) {
    return new Date(Math.floor(unix) * 1000).toISOString().slice(0, 10);
  }

  const fmt = toNullableString(value?.fmt ?? value);
  if (fmt) {
    const parsed = new Date(fmt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    const mdy = fmt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const [, month, day, year] = mdy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return fmt;
  }

  return '';
}

export function mapYahooInsiderTrades(snapshot: YahooQuoteSnapshot, symbol: string) {
  const summary = snapshot.summaryResult || {};
  const insiderModule = summary.insiderTransactions || {};
  const rows = Array.isArray(insiderModule?.transactions) ? insiderModule.transactions : [];
  const company =
    toNullableString(snapshot.quoteResult?.longName) ||
    toNullableString(snapshot.quoteResult?.shortName) ||
    symbol;

  const trades = rows
    .map((row: any) => {
      const date = normalizeDateForInsider(row?.startDate || row?.date || row?.transactionDate);
      const insider =
        toNullableString(row?.filerName) ||
        toNullableString(row?.name) ||
        toNullableString(row?.insider) ||
        '';
      const position =
        toNullableString(row?.filerRelation) ||
        toNullableString(row?.positionDirect) ||
        toNullableString(row?.relation) ||
        '';
      const transaction =
        toNullableString(row?.transactionText) ||
        toNullableString(row?.transactionDescription) ||
        toNullableString(row?.ownership) ||
        '';

      const shares =
        toFiniteNumber(row?.shares) ??
        parseSuffixNumber(row?.shares?.fmt) ??
        parseSuffixNumber(row?.sharesText) ??
        0;
      const valueFromModule =
        toFiniteNumber(row?.value) ??
        parseSuffixNumber(row?.moneyText?.fmt || row?.moneyText?.raw || row?.moneyText);
      const priceFromModule = toFiniteNumber(row?.transactionPrice) ?? toFiniteNumber(row?.price);
      const price =
        priceFromModule ??
        (typeof valueFromModule === 'number' && Number.isFinite(valueFromModule) && shares > 0
          ? valueFromModule / shares
          : 0);
      const value =
        typeof valueFromModule === 'number' && Number.isFinite(valueFromModule)
          ? valueFromModule
          : shares * (price || 0);

      return {
        date,
        insider,
        position,
        transaction,
        shares: Number.isFinite(shares) ? shares : 0,
        price: Number.isFinite(price) ? price : 0,
        value: Number.isFinite(value) ? value : 0,
        company,
        symbol,
      };
    })
    .filter((trade: any) => trade.date && trade.insider)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    company,
    trades,
    source: 'yahoo',
  };
}

export function toDateKeyFromUnix(value: number): string {
  return new Date(Math.floor(value) * 1000).toISOString().slice(0, 10);
}

export function toUnixFromIsoDate(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000);
}

export { DEFAULT_QUOTE_SUMMARY_MODULES };
