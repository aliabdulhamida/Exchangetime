import type { NextApiRequest, NextApiResponse } from 'next';
import { afterEach, expect, it, vi } from 'vitest';
import handler from '../pages/api/news';

afterEach(() => vi.unstubAllGlobals());

it.each([
  { payload: { news: [] }, status: 200, expected: 200 },
  { payload: {}, status: 503, expected: 502 },
  { payload: { news: null }, status: 200, expected: 502 },
  { payload: { news: [{ title: 'Missing publication date' }] }, status: 200, expected: 200 },
])('distinguishes upstream responses: %j', async ({ payload, status, expected }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(payload, { status })));
  const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  await handler({ method: 'GET', query: { ticker: 'SAP.DE' } } as unknown as NextApiRequest, res as unknown as NextApiResponse);
  expect(res.status).toHaveBeenCalledWith(expected);
  if (expected === 200) expect(res.json).toHaveBeenCalledWith([]);
});
