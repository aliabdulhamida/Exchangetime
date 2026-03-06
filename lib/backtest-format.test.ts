import { describe, expect, it } from 'vitest';

import {
  formatCompactCurrencyAxis,
  formatCurrencyAmount,
  formatDateLabel,
  formatPercentValue,
  formatSharesValue,
} from './backtest-format';

describe('backtest format utilities', () => {
  it('formats currency, percent and shares consistently for en-US', () => {
    expect(formatCurrencyAmount(26_111.203, 'USD', 'en-US')).toBe('$26,111.20');
    expect(formatPercentValue(161.11, 'en-US')).toBe('+161.11%');
    expect(formatSharesValue(26.111203, 'en-US')).toBe('26.1112');
    expect(formatCompactCurrencyAxis(26_111.203, 'USD', 'en-US')).toBe('$26.1K');
  });

  it('supports locale-specific separators without mixed notation', () => {
    const currency = formatCurrencyAmount(26_111.203, 'EUR', 'de-DE');
    const percent = formatPercentValue(161.11, 'de-DE');
    const shares = formatSharesValue(26.111203, 'de-DE');

    expect(currency).toMatch(/26\.111,20/);
    expect(percent).toBe('+161,11%');
    expect(shares).toBe('26,1112');
  });

  it('returns placeholders for invalid numeric values', () => {
    expect(formatCurrencyAmount(null, 'USD', 'en-US')).toBe('-');
    expect(formatPercentValue(undefined, 'en-US')).toBe('-');
    expect(formatSharesValue(Number.NaN, 'en-US')).toBe('-');
  });

  it('formats ISO dates into readable labels', () => {
    expect(formatDateLabel('2024-01-20', 'en-US')).toBe('Jan 20, 2024');
    expect(formatDateLabel('invalid-date', 'en-US')).toBe('invalid-date');
  });
});
