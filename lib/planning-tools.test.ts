import { describe, expect, it } from 'vitest';

import { breakEven, loanRepayment } from './planning-tools';

describe('planning equations', () => {
  it('handles a zero rate without dividing by zero', () => {
    expect(loanRepayment(1200, 0, 12, 100)).toEqual({ payment: 100, interest: 0, duration: 6, monthsSaved: 6, interestSaved: 0 });
  });
  it('charges only one month of interest when an extra payment retires the balance', () => {
    expect(loanRepayment(1000, 12, 12, 1000)?.interest).toBeCloseTo(10);
  });
  it('rejects incomplete terms and includes both trade fees', () => {
    expect(loanRepayment(0, 3, 12, 0)).toBeNull();
    expect(breakEven(0, 50, 1, 1)).toBeNull();
    expect(breakEven(10, 50, 2, 3)?.exitPrice).toBe(50.5);
  });
});
