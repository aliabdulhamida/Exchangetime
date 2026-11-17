import { describe, expect, it } from 'vitest';

import { breakEven, loanRepayment } from './planning-tools';

describe('planning equations', () => {
  it('handles a zero rate without dividing by zero', () => {
    expect(loanRepayment(1200, 0, 12, 100)).toMatchObject({
      payment: 100,
      interest: 0,
      duration: 6,
      monthsSaved: 6,
      interestSaved: 0,
    });
  });
  it('charges only one month of interest when an extra payment retires the balance', () => {
    expect(loanRepayment(1000, 12, 12, 1000)?.interest).toBeCloseTo(10);
  });
  it('rejects incomplete terms and includes both trade fees', () => {
    expect(loanRepayment(0, 3, 12, 0)).toBeNull();
    expect(breakEven(0, 50, 1, 1)).toBeNull();
    expect(breakEven(10, 50, 2, 3)?.exitPrice).toBe(50.5);
  });
  it.each([
    [36, 4, 0],
    [36, 4, 75],
    [600, 100, 0],
    [24, 0, 50000],
  ])(
    'reconciles scheduled balances for %i months at %i percent with %i extra',
    (months, rate, extra) => {
      const result = loanRepayment(15000, rate, months, extra)!;
      expect(result.years.at(-1)?.balance).toBe(0);
      expect(result.years.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(15000);
      expect(result.years.reduce((sum, row) => sum + row.interest, 0)).toBeCloseTo(result.interest);
      expect(result.years.length).toBe(Math.ceil(result.duration / 12));
      if (!extra) expect(result.interest).toBeCloseTo(result.payment * months - 15000);
    },
  );
});
