import { afterEach, expect, it, vi } from 'vitest';

import { siteOperator } from './site-operator';

afterEach(() => vi.unstubAllEnvs());

it('does not treat a brand and existing contact address as a completed legal identity', () => {
  for (const name of [
    'SITE_OPERATOR_NAME',
    'SITE_EDITOR_NAME',
    'SITE_EDITOR_ADDRESS',
    'SITE_HOSTING_DISCLOSURE',
  ])
    vi.stubEnv(name, '');
  expect(siteOperator().complete).toBe(false);
  expect(siteOperator().name).toBe('');
});

it('keeps public operator details configurable without inventing an editor', () => {
  vi.stubEnv('SITE_OPERATOR_NAME', ' Test operator ');
  vi.stubEnv('SITE_EDITOR_NAME', '');
  expect(siteOperator().name).toBe('Test operator');
  expect(siteOperator().editor).toBe('');
  expect(siteOperator().complete).toBe(false);
});
