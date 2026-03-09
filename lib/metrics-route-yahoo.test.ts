import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
};

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      res.headers[name] = value;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('pages/api/metrics yahoo-first routing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it('returns yahoo metrics when yahoo endpoints succeed', async () => {
    process.env.FMP_API_KEY = '';
    process.env.TWELVE_DATA_API_KEY = '';
    process.env.MASSIVE_API_KEY = '';

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/v8/finance/chart/')) {
        return jsonResponse({
          chart: {
            result: [
              {
                meta: {
                  regularMarketPrice: 200,
                  previousClose: 195,
                  currency: 'USD',
                },
                timestamp: [1, 2],
                indicators: { quote: [{ close: [195, 200] }] },
              },
            ],
          },
        });
      }

      if (url.includes('/v7/finance/quote')) {
        return jsonResponse({
          quoteResponse: {
            result: [
              {
                longName: 'Apple Inc.',
                trailingPE: 30,
                priceToBook: 40,
              },
            ],
          },
        });
      }

      if (url.includes('/v10/finance/quoteSummary/')) {
        return jsonResponse({
          quoteSummary: {
            result: [
              {
                summaryDetail: { dividendYield: { raw: 0.005 } },
                defaultKeyStatistics: { earningsQuarterlyGrowth: { raw: 0.2 } },
                financialData: {
                  returnOnEquity: { raw: 0.22 },
                  revenueGrowth: { raw: 0.1 },
                  earningsGrowth: { raw: 0.12 },
                  freeCashflow: { raw: 80_000_000_000 },
                },
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { default: handler } = await import('../pages/api/metrics.js');
    const req = { method: 'GET', query: { symbol: 'AAPL' } } as any;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('yahoo');
    expect(res.body.companyName).toBe('Apple Inc.');
    expect(res.body.peRatio).toBe(30);
    expect(res.body.roe).toBe(22);
    expect(res.body.revenueGrowth).toBe(10);
    expect(res.body.freeCashFlow).toBe(80);
  });

  it('falls back to twelvedata when yahoo fails', async () => {
    process.env.FMP_API_KEY = '';
    process.env.TWELVE_DATA_API_KEY = 'test-key';
    process.env.MASSIVE_API_KEY = '';

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/v8/finance/chart/')) {
        return jsonResponse(
          {
            finance: { error: { description: 'Blocked' } },
          },
          502,
        );
      }

      if (url.includes('api.twelvedata.com/quote')) {
        return jsonResponse({
          pe: '18.5',
          roe: '0.12',
          revenue_growth: '0.07',
          free_cash_flow: '25000000000',
          name: 'Fallback Corp',
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { default: handler } = await import('../pages/api/metrics.js');
    const req = { method: 'GET', query: { symbol: 'MSFT' } } as any;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('twelvedata');
    expect(res.body.companyName).toBe('Fallback Corp');
    expect(res.body.peRatio).toBe(18.5);
    expect(res.body.roe).toBe(12);
    expect(res.body.revenueGrowth).toBe(7);
    expect(res.body.freeCashFlow).toBe(25);
  });
});
