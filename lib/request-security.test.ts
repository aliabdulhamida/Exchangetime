import { afterEach, expect, it, vi } from 'vitest';

import { blockedProbe, localRequestLimit, requestLimit } from './request-security';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('blocks scanner paths without blocking articles or crawlers', () => {
  for (const path of [
    '/wp-admin/install.php',
    '/wp-login.php',
    '/.env.local',
    '/.git/config',
    '/xmlrpc.php',
  ])
    expect(blockedProbe(path)).toBe(true);
  for (const path of ['/blog', '/robots.txt', '/dashboard', '/images/weekly/example.png'])
    expect(blockedProbe(path)).toBe(false);
});
it('limits a window and resets after expiry', () => {
  expect(localRequestLimit('unit-window', 2, 1000)).toBe(true);
  expect(localRequestLimit('unit-window', 2, 1001)).toBe(true);
  expect(localRequestLimit('unit-window', 2, 1002)).toBe(false);
  expect(localRequestLimit('unit-window', 2, 61000)).toBe(true);
});
it('uses an atomic shared counter and rejects over-limit requests', async () => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
  const fetcher = vi.fn().mockResolvedValue(Response.json({ result: 121 }));
  vi.stubGlobal('fetch', fetcher);
  expect(await requestLimit('hashed-test-ip')).toBe(false);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)[0]).toBe('EVAL');
});
it('fails closed on configured counter errors or partial configuration', async () => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'unavailable' })));
  await expect(requestLimit('test')).rejects.toThrow();
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  await expect(requestLimit('test')).rejects.toThrow();
});
