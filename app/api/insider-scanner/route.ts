import { NextRequest, NextResponse } from 'next/server';

import {
  normalizeInsiderTrade,
  validInsiderSymbol,
  type InsiderPage,
  type InsiderSource,
} from '../../../lib/insider-scanner';
import {
  loadNasdaqInsiders,
  UnknownInsiderSymbol,
} from '../../../lib/server/nasdaq-insider-history';

export const dynamic = 'force-dynamic';

const batch = 100;
const ttl = 5 * 60_000;
const cache = new Map<string, InsiderPage>();
const pending = new Map<string, Promise<InsiderPage>>();
let issuerRestrictedUntil = 0;
class IssuerFeedRestricted extends Error {}
class OlderFilingsRestricted extends Error {}

async function retrieve(symbol: string, page: number, apiKey: string): Promise<InsiderPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(batch), apikey: apiKey });
  if (symbol) params.set('symbol', symbol);
  const endpoint = symbol ? 'search' : 'latest';
  const response = await fetch(
    'https://financialmodelingprep.com/stable/insider-trading/' + endpoint + '?' + params,
    {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    },
  );
  if ([402, 403].includes(response.status)) {
    if (page > 0) throw new OlderFilingsRestricted();
    if (symbol) throw new IssuerFeedRestricted();
  }
  if (!response.ok) throw new Error('Provider unavailable');
  const data: unknown = await response.json();
  if (
    !Array.isArray(data) ||
    (data.length && !data.some((row) => typeof row?.transactionType === 'string'))
  ) {
    throw new Error('Unrecognized filing feed');
  }
  const transactions = data.flatMap((raw) => {
    const trade = normalizeInsiderTrade(raw);
    return trade && (!symbol || trade.symbol === symbol) ? [trade] : [];
  });
  return {
    scope: symbol ? 'issuer' : 'market',
    source: 'fmp',
    transactions,
    scanned: data.length,
    retrievedAt: new Date().toISOString(),
    stale: false,
    nextPage: data.length >= batch && page < 99 ? page + 1 : null,
  };
}

async function loadPage(
  source: InsiderSource,
  symbol: string,
  page: number,
  apiKey: string,
): Promise<InsiderPage> {
  const key = source + ':' + symbol + ':' + page;
  const saved = cache.get(key);
  const age = saved ? Date.now() - Date.parse(saved.retrievedAt) : Infinity;
  if (saved && age < ttl) return saved;
  let work = pending.get(key);
  if (!work) {
    work = (
      source === 'nasdaq' ? loadNasdaqInsiders(symbol, page, batch) : retrieve(symbol, page, apiKey)
    )
      .then((snapshot) => {
        cache.delete(key);
        if (cache.size >= 128) cache.delete(cache.keys().next().value!);
        cache.set(key, snapshot);
        return snapshot;
      })
      .finally(() => pending.delete(key));
    pending.set(key, work);
  }
  try {
    return await work;
  } catch (error) {
    if (
      !(error instanceof IssuerFeedRestricted) &&
      !(error instanceof OlderFilingsRestricted) &&
      saved &&
      age < 24 * 60 * 60_000
    )
      return { ...saved, stale: true };
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get('symbol') ?? '').trim().toUpperCase();
  const pageText = request.nextUrl.searchParams.get('page') ?? '0';
  const source = request.nextUrl.searchParams.get('source');
  if (
    (symbol && !validInsiderSymbol(symbol)) ||
    !/^\d{1,2}$/.test(pageText) ||
    (source !== null && source !== 'fmp' && source !== 'nasdaq') ||
    (source === 'nasdaq' && !symbol)
  ) {
    return NextResponse.json({ error: 'Invalid ticker or filing page.' }, { status: 400 });
  }
  const apiKey = process.env.FMP_API_KEY?.trim() ?? '';
  if (!apiKey && (!symbol || source === 'fmp'))
    return NextResponse.json(
      { error: 'The insider filing feed is not configured.' },
      { status: 503 },
    );
  const page = Number(pageText);
  const send = (payload: InsiderPage) =>
    NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  try {
    if (!symbol || source === 'fmp') return send(await loadPage('fmp', symbol, page, apiKey));
    if (!source && apiKey && issuerRestrictedUntil <= Date.now()) {
      try {
        return send(await loadPage('fmp', symbol, page, apiKey));
      } catch (error) {
        if (error instanceof IssuerFeedRestricted) issuerRestrictedUntil = Date.now() + 30 * 60_000;
        if (error instanceof OlderFilingsRestricted) throw error;
      }
    }
    return send(await loadPage('nasdaq', symbol, page, apiKey));
  } catch (error) {
    if (error instanceof UnknownInsiderSymbol)
      return NextResponse.json(
        { error: 'Nasdaq does not recognize this issuer ticker.' },
        { status: 404 },
      );
    if (error instanceof OlderFilingsRestricted) {
      return NextResponse.json(
        {
          code: 'history_restricted',
          error: 'Older batches are not included in the configured filing feed.',
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error: symbol
          ? 'Company transaction history is unavailable for ' + symbol + '. Try again later.'
          : 'The filing provider is unavailable. Try again later.',
      },
      { status: 503 },
    );
  }
}
