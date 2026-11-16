import { describe, expect, it } from 'vitest';

import { buildPortfolioHistory } from './portfolio-history';

describe('portfolio history', () => {
  it('carries prior closes forward, applies sales, and never counts an unpriced holding as zero', () => {
    const history = buildPortfolioHistory([
      { date: '2026-01-01', symbol: 'A', shares: 2, side: 'BUY' },
      { date: '2026-01-02', symbol: 'B', shares: 1, side: 'BUY' },
      { date: '2026-01-04', symbol: 'A', shares: 1, side: 'SELL' },
    ], {
      A: [{ date: '2026-01-01', close: 10 }, { date: '2026-01-02', close: 12 }],
      B: [{ date: '2026-01-03', close: 20 }, { date: '2026-01-04', close: 21 }],
    }, price => price);
    expect(history).toEqual([
      { date: '2026-01-01', value: 20 },
      { date: '2026-01-03', value: 44 },
      { date: '2026-01-04', value: 33 },
    ]);
  });
  it('omits valuations without a conversion rate', () => {
    expect(buildPortfolioHistory([{ date: '2026-01-01', symbol: 'A', shares: 1, side: 'BUY' }],
      { A: [{ date: '2026-01-01', close: 10 }] }, () => NaN)).toEqual([]);
  });
});
