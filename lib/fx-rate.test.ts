import { expect, it } from 'vitest';
import { getSeriesFxRate } from './fx-rate';

it('never uses a later FX observation or invents a missing rate', () => {
  const rates = [{ date: '2026-01-02', close: 0.85 }, { date: '2026-01-05', close: 0.91 }];
  expect(getSeriesFxRate(rates, '2026-01-01')).toBeNull();
  expect(getSeriesFxRate(rates, '2026-01-04')).toBe(0.85);
  expect(getSeriesFxRate(rates)).toBe(0.91);
  expect(getSeriesFxRate([])).toBeNull();
});
