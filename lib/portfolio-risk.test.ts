import { describe, expect, it } from 'vitest';

import { portfolioReturnIndex, portfolioRisk } from './portfolio-risk';

describe('portfolio risk and return', () => {
  it('removes contributions between valuation dates', () => {
    const index = portfolioReturnIndex(
      [
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-05', value: 210 },
      ],
      [{ date: '2026-01-03', amount: 100 }],
    );
    expect(index[1].value).toBeCloseTo(110);
    expect(portfolioRisk(index).totalReturnPct).toBeCloseTo(10);
  });
  it('accounts for withdrawals and paid distributions', () => {
    const index = portfolioReturnIndex(
      [
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-02', value: 90 },
      ],
      [{ date: '2026-01-02', amount: -10 }],
      [{ date: '2026-01-02', amount: 2 }],
    );
    expect(index[1].value).toBeCloseTo(102);
  });
  it('does not annualize short histories or report ratios for constant returns', () => {
    expect(
      portfolioRisk([
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-02', value: 105 },
      ]).volatilityPct,
    ).toBeNull();
    const flat = Array.from({ length: 25 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
      value: 100,
    }));
    expect(portfolioRisk(flat).sharpe).toBeNull();
  });
  it('measures drawdown from the prior high', () => {
    expect(
      portfolioRisk([
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-02', value: 120 },
        { date: '2026-01-03', value: 90 },
      ]).maxDrawdownPct,
    ).toBeCloseTo(-25);
  });
});
