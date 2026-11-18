import { expect, it } from 'vitest';

import { conversionValue, parseConversionAmount } from './currency-conversion';

it('parses explicitly US-formatted amounts without losing decimals', () => {
  expect(parseConversionAmount('1,234.56')).toBe(1234.56);
  expect(parseConversionAmount('1000.00')).toBe(parseConversionAmount('1,000'));
});
it.each(['', '0', '-1', '1,23', '1,2,3', 'Infinity', '1000000000000001'])('rejects ambiguous or invalid amount %s', raw => {
  expect(parseConversionAmount(raw)).toBeNull();
});
it('does not produce invented zero or infinite converted values', () => {
  expect(conversionValue(100, 1.25)).toBe(125);
  expect(conversionValue(100, NaN)).toBeNull();
  expect(conversionValue(1e308, 1e308)).toBeNull();
});
