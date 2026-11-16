import { NextRequest, NextResponse } from 'next/server';

import { parseAssetMatches } from '@/lib/asset-directory';

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (query.length < 2 || query.length > 64) {
    return NextResponse.json({ error: 'Enter between 2 and 64 characters.' }, { status: 400 });
  }
  const params = new URLSearchParams({ q: query, quotesCount: '12', newsCount: '0', listsCount: '0' });
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v1/finance/search?' + params, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)' },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Directory unavailable');
    return NextResponse.json({
      matches: parseAssetMatches(await response.json()),
      fetchedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return NextResponse.json({ error: 'Instrument lookup is unavailable.' }, { status: 503 });
  }
}
