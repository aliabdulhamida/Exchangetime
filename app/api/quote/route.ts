import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy for Yahoo Finance quote/chart endpoints to avoid CORS and improve reliability.
// Returns JSON: { price: number|null, currency?: string|null, source: 'quote'|'chart'|'error', raw?: any }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

    // Helper to fetch with friendly headers
    const fetchWithHeaders = (u: string) =>
      fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://finance.yahoo.com/',
        },
      });

    const urlParams = new URLSearchParams(url.search);
    const wantChart = urlParams.get('chart') === '1' || urlParams.get('chart') === 'true';

    // If caller specifically asked for chart series, fetch chart endpoint and return series
    if (wantChart) {
      const cUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=7d`;
      const cres = await fetchWithHeaders(cUrl);
      if (cres.ok) {
        const j = await cres.json();
        const result = j?.chart?.result?.[0];
        const closes = result?.indicators?.quote?.[0]?.close || [];
        const timestamps = result?.timestamp || [];
        const currency = result?.meta?.currency ?? null;
        return NextResponse.json({ series: closes, timestamps, currency, source: 'chart' });
      }
      return NextResponse.json({ error: 'Chart endpoint failed' }, { status: 502 });
    }

    // Try v7 quote endpoint first
    const qUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    let res = await fetchWithHeaders(qUrl);

    if (res.ok) {
      const j = await res.json();
      const quote = j?.quoteResponse?.result?.[0];
      const price = quote?.regularMarketPrice ?? quote?.ask ?? quote?.preMarketPrice ?? quote?.postMarketPrice;
      const currency = quote?.currency || null;
      if (typeof price === 'number' && isFinite(price)) {
        return NextResponse.json({ price, currency, source: 'quote', raw: quote });
      }
    }

    // Fallback: v8 chart endpoint (single price)
    const cUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    res = await fetchWithHeaders(cUrl);
    if (res.ok) {
      const j = await res.json();
      const result = j?.chart?.result?.[0];
      const price = result?.meta?.regularMarketPrice ?? null;
      const currency = result?.meta?.currency ?? null;
      if (typeof price === 'number' && isFinite(price)) {
        return NextResponse.json({ price, currency, source: 'chart', raw: result });
      }
    }

    // If neither returned a usable price, return error details (best-effort)
    return NextResponse.json({ error: 'Price not available from Yahoo endpoints' }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
