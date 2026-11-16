import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const request = (search = '') => new NextRequest('http://localhost/api/insider-scanner' + search);
let GET: typeof import('../app/api/insider-scanner/route').GET;
beforeEach(async () => {
  vi.stubEnv('FMP_API_KEY', 'test-key');
  vi.resetModules();
  ({ GET } = await import('../app/api/insider-scanner/route'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('keeps credentials server-side, scopes symbol searches, and reuses cached pages', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json([]));
  vi.stubGlobal('fetch', fetcher);
  const response = await GET(request('?symbol=abc&page=1'));
  const payload = await response.json();
  expect(payload).toMatchObject({ transactions: [], scanned: 0, nextPage: null, stale: false });
  expect(JSON.stringify(payload)).not.toContain('test-key');
  expect(fetcher.mock.calls[0][0]).toContain('/search?page=1');
  expect(fetcher.mock.calls[0][0]).toContain('symbol=ABC');
  expect((await GET(request('?symbol=ABC&page=1'))).status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('distinguishes malformed upstream responses from empty results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'provider error' })));
  expect((await GET(request('?symbol=BADRESPONSE'))).status).toBe(503);
});
it('preserves the original retrieval time when serving a stale snapshot', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json([]))
    .mockRejectedValueOnce(new Error());
  vi.stubGlobal('fetch', fetcher);
  const first = await (await GET(request('?symbol=CACHED'))).json();
  vi.setSystemTime(Date.now() + 6 * 60_000);
  const stale = await (await GET(request('?symbol=CACHED'))).json();
  expect(stale).toMatchObject({ retrievedAt: first.retrievedAt, stale: true });
});
it('rejects invalid input and missing configuration without contacting a provider', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect((await GET(request('?page=-1'))).status).toBe(400);
  expect((await GET(request('?symbol=A/B'))).status).toBe(400);
  expect((await GET(request('?source=nasdaq'))).status).toBe(400);
  expect((await GET(request('?symbol=AAPL&source=other'))).status).toBe(400);
  vi.stubEnv('FMP_API_KEY', '');
  expect((await GET(request())).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});

function nasdaqResponse(
  rows: { transactionType: string; [key: string]: unknown }[],
  total = rows.length,
) {
  return Response.json({
    status: { rCode: 200 },
    data: {
      transactionTable: { totalRecords: String(total), table: { rows } },
    },
  });
}

it('looks up AAPL itself rather than filtering a market page when issuer history is restricted', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response('Restricted endpoint', { status: 402 }))
    .mockResolvedValueOnce(
      nasdaqResponse([
        {
          transactionType: 'Automatic Sell',
          lastDate: '11/10/2026',
          lastPrice: '$351.36',
          sharesTraded: '2,399',
        },
        { transactionType: 'Buy', lastPrice: 'N/A', sharesTraded: '0' },
        { transactionType: 'Option Execute' },
        { transactionType: 'Disposition (Non Open Market)' },
      ]),
    );
  vi.stubGlobal('fetch', fetcher);
  const result = await (await GET(request('?symbol=aapl'))).json();
  expect(result).toMatchObject({
    scope: 'issuer',
    source: 'nasdaq',
    scanned: 4,
    stale: false,
    nextPage: null,
  });
  expect(result.transactions).toMatchObject([
    {
      symbol: 'AAPL',
      side: 'sell',
      automatic: true,
      traded: '2026-11-10',
      filed: null,
      value: 842912.64,
    },
    { symbol: 'AAPL', side: 'buy', price: null, quantity: 0, value: null },
  ]);
  expect(fetcher.mock.calls[1][0]).toBe(
    'https://api.nasdaq.com/api/company/AAPL/insider-trades?limit=100&offset=0',
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('paginates by raw issuer records, even if none in the first batch qualify', async () => {
  vi.stubEnv('FMP_API_KEY', '');
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      nasdaqResponse(
        Array.from({ length: 100 }, () => ({ transactionType: 'Gift' })),
        101,
      ),
    )
    .mockResolvedValueOnce(nasdaqResponse([{ transactionType: 'Sell' }], 101));
  vi.stubGlobal('fetch', fetcher);
  expect(await (await GET(request('?symbol=AAPL'))).json()).toMatchObject({
    transactions: [],
    scanned: 100,
    nextPage: 1,
    source: 'nasdaq',
  });
  expect(await (await GET(request('?symbol=AAPL&page=1&source=nasdaq'))).json()).toMatchObject({
    transactions: [{ symbol: 'AAPL', side: 'sell' }],
    scanned: 1,
    nextPage: null,
  });
  expect(fetcher.mock.calls[1][0]).toContain('AAPL/insider-trades?limit=100&offset=100');
});

it('distinguishes an empty history from an unknown ticker and an unavailable provider', async () => {
  vi.stubEnv('FMP_API_KEY', '');
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(nasdaqResponse([]))
    .mockResolvedValueOnce(
      Response.json({
        status: { rCode: 400, bCodeMessage: [{ errorMessage: 'Symbol not exists.' }] },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 503 }));
  vi.stubGlobal('fetch', fetcher);
  expect(await (await GET(request('?symbol=EMPTY'))).json()).toMatchObject({
    transactions: [],
    scanned: 0,
    nextPage: null,
  });
  expect((await GET(request('?symbol=UNKNOWN'))).status).toBe(404);
  expect((await GET(request('?symbol=UNAVAILABLE'))).status).toBe(503);
});

it('distinguishes restricted history from an empty batch or a temporary outage', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('Restricted endpoint', { status: 402 })),
  );
  const response = await GET(request('?page=3'));
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: 'history_restricted' });
});
