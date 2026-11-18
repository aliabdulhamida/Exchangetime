import { expect, it } from 'vitest';

import { summarizeBalanceHistory } from './net-worth-history';

it('orders snapshots without mutating records and measures absolute change', () => {
  const earlier = {date: '2026-01-01', assets: 100, liabilities: 150, net: -50};
  const later = {date: '2026-02-01', assets: 200, liabilities: 120, net: 80};
  const records = [later, earlier];
  expect(summarizeBalanceHistory(records)).toMatchObject({latest: later, previous: earlier, change: 130});
  expect(records[0]).toBe(later);
});
it('withholds change until two saved observations exist', () => {
  expect(summarizeBalanceHistory([]).change).toBeNull();
  expect(summarizeBalanceHistory([{date: '2026-01-01', assets: 0, liabilities: 0, net: 0}]).change).toBeNull();
});
