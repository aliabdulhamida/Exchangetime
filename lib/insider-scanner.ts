export type InsiderSide = 'buy' | 'sell';
export type InsiderSource = 'fmp' | 'nasdaq';
export const reportedPurchase =
  /^\s*(?:P(?:\s*-\s*|$)|(?:open market |private )?(?:purchase|buy)\b)/i;
export const reportedSale = /^\s*(?:S(?:\s*-\s*|$)|(?:open market |private )?(?:sale|sell)\b)/i;

export type InsiderTransaction = {
  symbol: string;
  insider: string;
  role: string;
  security: string;
  side: InsiderSide;
  automatic?: boolean;
  amended: boolean | null;
  filed: string | null;
  traded: string | null;
  quantity: number | null;
  price: number | null;
  value: number | null;
  filingUrl: string | null;
};

export type InsiderPage = {
  scope: 'market' | 'issuer';
  source: InsiderSource;
  transactions: InsiderTransaction[];
  scanned: number;
  nextPage: number | null;
  retrievedAt: string;
  stale: boolean;
};

export type InsiderFilters = {
  side: 'all' | InsiderSide;
  person: string;
  role: 'all' | 'director' | 'officer' | 'owner';
  days: number;
  minimumValue: string;
};

export const defaultInsiderFilters: InsiderFilters = {
  side: 'all',
  person: '',
  role: 'all',
  days: 0,
  minimumValue: '',
};

export function validInsiderSymbol(symbol: string) {
  return /^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(symbol);
}

export function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = /^(\d{4}-\d{2}-\d{2})(?:$|[ T])/.exec(value)?.[1];
  if (!date) return null;
  const stamp = Date.parse(date);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().startsWith(date) ? date : null;
}

function nonNegative(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function secLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https://www.sec.gov', 'https://sec.gov'].includes(url.origin) &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith('/Archives/edgar/data/')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function normalizeInsiderTrade(raw: unknown): InsiderTransaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (record.formType !== '4' && record.formType !== '4/A') return null;
  const code = String(record.transactionType ?? '')
    .split('-')[0]
    .trim()
    .toUpperCase();
  if (code !== 'P' && code !== 'S') return null;
  const symbol = typeof record.symbol === 'string' ? record.symbol.trim().toUpperCase() : '';
  const filed = dateOnly(record.filingDate);
  if (!validInsiderSymbol(symbol) || !filed) return null;
  const quantity = nonNegative(record.securitiesTransacted);
  const price = nonNegative(record.price);
  return {
    symbol,
    side: code === 'P' ? 'buy' : 'sell',
    amended: record.formType === '4/A',
    insider: typeof record.reportingName === 'string' ? record.reportingName.trim() : '',
    role: typeof record.typeOfOwner === 'string' ? record.typeOfOwner.trim() : '',
    security: typeof record.securityName === 'string' ? record.securityName.trim() : '',
    filed,
    traded: dateOnly(record.transactionDate),
    quantity,
    price,
    value: quantity !== null && price !== null ? nonNegative(quantity * price) : null,
    filingUrl: secLink(record.url),
  };
}

export function filterInsiderTrades(
  rows: InsiderTransaction[],
  filters: InsiderFilters,
  now = Date.now(),
) {
  const person = filters.person.trim().toLowerCase();
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  const since = midnight.getTime() - (filters.days - 1) * 86400000;
  const minimum = filters.minimumValue === '' ? null : Number(filters.minimumValue);
  return rows.filter((row) => {
    if (filters.side !== 'all' && row.side !== filters.side) return false;
    if (person && !row.insider.toLowerCase().includes(person)) return false;
    if (filters.role === 'director' && !/\bdirector\b/i.test(row.role)) return false;
    if (filters.role === 'officer' && !/\bofficer\b/i.test(row.role)) return false;
    if (filters.role === 'owner' && !/10\s*(?:%|percent)|ten percent/i.test(row.role)) return false;
    if (
      filters.days &&
      (!row.traded || Date.parse(row.traded) < since || Date.parse(row.traded) > midnight.getTime())
    )
      return false;
    return (
      minimum === null ||
      (Number.isFinite(minimum) && minimum >= 0 && row.value !== null && row.value >= minimum)
    );
  });
}
