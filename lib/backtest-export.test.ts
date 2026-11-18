import { expect, it } from 'vitest';

import { backtestExportRows } from './backtest-export';

it('exports the simulation dates and precise run assumptions without adding dates', () => {
  const rows = backtestExportRows([{date: '2026-01-02', value: 1234.567}], {
    symbols: 'AAA, BBB', allocation: '50%, 50%', currency: 'USD', start: '2026-01-01', end: '2026-01-03',
    initialAmount: 1000, monthlyAmount: 100, feePct: .5, slippagePct: .1, dividendTaxPct: 15,
    reinvest: false, calculatedAt: '2026-01-04T00:00:00Z',
  });
  expect(rows).toHaveLength(2);
  expect(rows[1].slice(0, 3)).toEqual(['2026-01-02', 1234.567, 'USD']);
  expect(rows[1]).toContain('Held in cash');
  expect(rows[1]).toContain(15);
  expect(rows[0]).toHaveLength(rows[1].length);
});
