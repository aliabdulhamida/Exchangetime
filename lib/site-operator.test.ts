import { afterEach, expect, it, vi } from 'vitest';

import { siteOperator } from './site-operator';

afterEach(() => vi.unstubAllEnvs());

it('uses the confirmed identity but keeps missing editorial and hosting details incomplete', () => {
  for (const name of [
    'SITE_OPERATOR_NAME',
    'SITE_EDITOR_NAME',
    'SITE_EDITOR_ADDRESS',
    'SITE_HOSTING_DISCLOSURE',
  ])
    vi.stubEnv(name, '');
  expect(siteOperator().complete).toBe(false);
  expect(siteOperator().name).toBe('Ali Abdul Hamid Hassan');
  expect(siteOperator().hosting).toContain('GitHub and Vercel');
  expect(siteOperator().hosting).toContain('Washington, D.C., United States (region iad1)');
  expect(siteOperator().hosting).toContain('log retention periods');
  expect(siteOperator().hosting).toContain('still need to be confirmed');
});

it('uses the confirmed new address without treating unknown hosting terms as complete', () => {
  vi.stubEnv('SITE_OPERATOR_ADDRESS', '');
  vi.stubEnv('SITE_HOSTING_DISCLOSURE', '');
  vi.stubEnv('SITE_OPERATOR_NAME', 'Test operator');
  vi.stubEnv('SITE_EDITOR_NAME', 'Test editor');
  vi.stubEnv('SITE_EDITOR_ADDRESS', 'Test editor address');
  expect(siteOperator().address).toBe('Frieda-Seidlitz-Straße 6\n13086 Berlin\nGermany');
  expect(siteOperator().complete).toBe(false);
});

it('keeps public operator details configurable without inventing an editor', () => {
  vi.stubEnv('SITE_OPERATOR_NAME', ' Test operator ');
  vi.stubEnv('SITE_EDITOR_NAME', '');
  expect(siteOperator().name).toBe('Test operator');
  expect(siteOperator().editor).toBe('');
  expect(siteOperator().complete).toBe(false);
});
