import { describe, expect, it } from 'vitest';
import { parseDcfNumber } from './dcf';

describe('DCF numeric inputs', () => {
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
