import { describe, expect, it } from 'vitest';

import { dcfSensitivityValue, parseDcfNumber, sensitivityRange } from './dcf';

describe('DCF numeric inputs', () => {
  const model = {discountPct: 10, terminal: 2, multiple: false, cashflows: [100],
    cash: 20, debt: 10, shares: 10, midYear: false};
  it('reconciles explicit cash flows and terminal value per share', () => {
    expect(dcfSensitivityValue(model)).toBeCloseTo((100 / 1.1 + (102 / .08) / 1.1 + 10) / 10);
    expect(dcfSensitivityValue({...model, multiple: true, terminal: 12})).toBeCloseTo((1300 / 1.1 + 10) / 10);
  });
  it('never reports a partial valuation for an invalid perpetual-growth model', () => {
    expect(dcfSensitivityValue({...model, terminal: 10})).toBeNaN();
    expect(dcfSensitivityValue({...model, shares: 0})).toBeNaN();
  });
  it('keeps the exact base rate and removes duplicate boundary values', () => {
    expect(sensitivityRange(8.484, 1, 1, 60)[2]).toBe(8.484);
    expect(sensitivityRange(1, 1, 1, 60)).toEqual([1, 2, 3]);
  });
  it('preserves fractional model values in every currency', () => {
    for (const currency of ['EUR', 'CHF', 'USD', 'GBP']) {
      expect(parseDcfNumber(2.5, currency)).toBe(2.5);
      expect(parseDcfNumber('2.5', currency)).toBe(2.5);
    }
  });
  it('accepts localized grouped values', () => {
    expect(parseDcfNumber('1.234,56', 'EUR')).toBe(1234.56);
    expect(parseDcfNumber('1,234.56', 'USD')).toBe(1234.56);
  });
  it('rejects nonnumeric values', () => {
    expect(parseDcfNumber('invalid', 'EUR')).toBeNaN();
  });
});
