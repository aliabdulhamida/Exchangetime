import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('./request-security', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./request-security')>()),
  requestLimit: vi.fn(),
}));
import { middleware } from '../middleware';
import { requestLimit } from './request-security';

beforeEach(() => { vi.mocked(requestLimit).mockResolvedValue(true); });
const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest('https://www.exchangetime.de' + path, init);
it('removes PDF rendering before contacting the limiter', async () => {
  vi.mocked(requestLimit).mockClear();
  expect((await middleware(request('/api/pdf?url=http://localhost'))).status).toBe(410);
  expect(requestLimit).not.toHaveBeenCalled();
});
it('rejects probes, unwanted methods and oversized declared bodies', async () => {
  expect((await middleware(request('/wp-admin/install.php'))).status).toBe(404);
  expect((await middleware(request('/api/quote', { method: 'DELETE' }))).status).toBe(405);
  expect(
    (
      await middleware(
        request('/api/views', { method: 'POST', headers: { 'Content-Length': '70000' } }),
      )
    ).status,
  ).toBe(413);
});
it('rejects cross-origin writes but permits the same origin', async () => {
  expect(
    (
      await middleware(
        request('/api/views', { method: 'POST', headers: { Origin: 'https://evil.example' } }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await middleware(
        request('/api/views', {
          method: 'POST',
          headers: { Origin: 'https://www.exchangetime.de' },
        }),
      )
    ).status,
  ).toBe(200);
});
it('enforces limits and fails closed when configured shared storage is unavailable', async () => {
  vi.mocked(requestLimit).mockResolvedValue(false);
  const blocked = await middleware(request('/api/quote'));
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get('retry-after')).toBe('60');
  vi.mocked(requestLimit).mockRejectedValue(new Error('offline'));
  expect((await middleware(request('/api/quote'))).status).toBe(503);
  expect((await middleware(request('/blog'))).status).toBe(200);
});
