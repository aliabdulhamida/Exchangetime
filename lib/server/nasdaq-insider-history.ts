import { dateOnly, type InsiderPage, type InsiderTransaction } from '../insider-scanner';

export class UnknownInsiderSymbol extends Error {}

function reportedNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== 'string' || !/^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(raw.trim()))
    return null;
  const value = Number(raw.trim().replace(/[$,]/g, ''));
  return Number.isFinite(value) ? value : null;
}

function transaction(raw: Record<string, unknown>, symbol: string): InsiderTransaction | null {
  const label = String(raw.transactionType ?? '').trim();
  const kind = /^(automatic )?(buy|purchase|sell|sale)$/i.exec(label);
  if (!kind) return null;
  const day = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(raw.lastDate ?? ''));
  const traded = day
    ? dateOnly(day[3] + '-' + day[1].padStart(2, '0') + '-' + day[2].padStart(2, '0'))
    : dateOnly(raw.lastDate);
  const quantity = reportedNumber(raw.sharesTraded);
  const price = reportedNumber(raw.lastPrice);
  return {
    symbol,
    side: /buy|purchase/i.test(kind[2]) ? 'buy' : 'sell',
    automatic: Boolean(kind[1]),
    insider: typeof raw.insider === 'string' ? raw.insider.trim() : '',
    role: typeof raw.relation === 'string' ? raw.relation.trim() : '',
    security: '',
    traded,
    filed: null,
    filingUrl: null,
    amended: null,
    quantity,
    price,
    value: quantity !== null && price !== null ? reportedNumber(quantity * price) : null,
  };
}

export async function loadNasdaqInsiders(
  symbol: string,
  page: number,
  limit: number,
): Promise<InsiderPage> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await fetch(
    'https://api.nasdaq.com/api/company/' +
      encodeURIComponent(symbol) +
      '/insider-trades?' +
      params,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
        Referer: 'https://www.nasdaq.com/',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error('Nasdaq history unavailable');
  const body = await response.json();
  if (
    body?.status?.rCode === 400 &&
    Array.isArray(body.status.bCodeMessage) &&
    body.status.bCodeMessage.some(
      (detail: { errorMessage?: string } | null) => detail?.errorMessage === 'Symbol not exists.',
    )
  ) {
    throw new UnknownInsiderSymbol();
  }
  const table = body?.data?.transactionTable;
  const total = reportedNumber(table?.totalRecords);
  const rows: unknown = table?.table?.rows ?? (total === 0 ? [] : null);
  if (
    body?.status?.rCode !== 200 ||
    !Array.isArray(rows) ||
    rows.some((row) => !row || typeof row.transactionType !== 'string') ||
    (total !== null && offset < total && !rows.length)
  )
    throw new Error('Missing Nasdaq transaction records');
  return {
    scope: 'issuer',
    source: 'nasdaq',
    scanned: rows.length,
    stale: false,
    retrievedAt: new Date().toISOString(),
    nextPage:
      page < 99 && rows.length >= limit && (total === null || offset + rows.length < total)
        ? page + 1
        : null,
    transactions: rows.flatMap((row) => {
      const trade = transaction(row, symbol);
      return trade ? [trade] : [];
    }),
  };
}
