import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

    // Server-side Yahoo proxy to avoid brittle browser CORS proxies.
    const fetchWithHeaders = (u: string) =>
      fetch(u, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://finance.yahoo.com/',
        },
      });

    const urlParams = new URLSearchParams(url.search);
    const wantChart = urlParams.get('chart') === '1' || urlParams.get('chart') === 'true';

    if (wantChart) {
      const chartParams = new URLSearchParams();
      const interval = (urlParams.get('interval') || '1d').trim();
      const range = (urlParams.get('range') || '').trim();
      const period1 = (urlParams.get('period1') || '').trim();
      const period2 = (urlParams.get('period2') || '').trim();
      const includePrePost = (urlParams.get('includePrePost') || '').trim();
      const events = (urlParams.get('events') || '').trim();

      chartParams.set('interval', interval);
      if (period1) chartParams.set('period1', period1);
      if (period2) chartParams.set('period2', period2);
      if (!period1 && !period2) chartParams.set('range', range || '7d');
      if (includePrePost) chartParams.set('includePrePost', includePrePost);
      if (events) chartParams.set('events', events);

      const cUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${chartParams.toString()}`;
      const cres = await fetchWithHeaders(cUrl);
      const text = await cres.text();
      let j: any = null;
      try {
        j = JSON.parse(text);
      } catch {}

      if (!cres.ok) {
        return NextResponse.json(
          {
            error: 'Chart endpoint failed',
            status: cres.status,
            details: j?.finance?.error?.description || text.slice(0, 250),
          },
          { status: 502 },
        );
      }

      const result = j?.chart?.result?.[0];
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const timestamps = result?.timestamp || [];
      const currency = result?.meta?.currency ?? null;

      // Preserve Yahoo response shape while adding normalized helpers for existing callers.
      return NextResponse.json({
        ...(j || {}),
        series: closes,
        timestamps,
        currency,
        source: 'chart',
      });
    }

    const cUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetchWithHeaders(cUrl);
    const text = await res.text();
    let j: any = null;
    try {
      j = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Quote endpoint failed',
          status: res.status,
          details: j?.finance?.error?.description || text.slice(0, 250),
        },
        { status: 502 },
      );
    }

    const result = j?.chart?.result?.[0];
    const meta = result?.meta || {};
    const closes: number[] = (result?.indicators?.quote?.[0]?.close || []).filter(
      (v: any) => typeof v === 'number' && Number.isFinite(v),
    );
    const latestClose = closes.length ? closes[closes.length - 1] : null;
    const price = meta?.regularMarketPrice ?? latestClose ?? null;
    const previousClose = meta?.previousClose ?? (closes.length > 1 ? closes[closes.length - 2] : null);
    const currency = meta?.currency ?? null;

    if (typeof price === 'number' && Number.isFinite(price)) {
      return NextResponse.json({
        price,
        previousClose,
        currency,
        symbol,
        source: 'chart',
        meta,
      });
    }
    return NextResponse.json({ error: 'Price not available from Yahoo chart endpoint' }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
