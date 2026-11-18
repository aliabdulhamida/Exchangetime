import { expect, it } from 'vitest';

import { sizePosition } from './position-sizing';

const base = {side: 'long' as const, capital: 10000, riskPct: 1, entry: 100, stop: 95,
  target: 110, increment: 1, commission: 0, slippagePct: 0, cashOnly: false};
it('sizes to risk and includes both sides of costs', () => {
  expect(sizePosition(base)?.quantity).toBe(20);
  const result = sizePosition({...base, commission: .5, slippagePct: .5})!;
  expect(result.quantity).toBe(14);
  expect(result.loss).toBe(98);
  expect(result.reward).toBe(112);
  expect(result.costs).toBe(28);
});
it('caps cash positions including modeled entry costs', () => {
  const result = sizePosition({...base, stop: 99.99, cashOnly: true, commission: 1})!;
  expect(result.capped).toBe(false);
  const capped = sizePosition({...base, stop: 99.99, cashOnly: true, commission: .1})!;
  expect(capped.capped).toBe(true);
  expect(capped.quantity * 100.1).toBeLessThanOrEqual(10000);
});
it('does not treat short-sale proceeds as available cash', () => {
  const result = sizePosition({...base, side: 'short', stop: 100.01, target: 90, cashOnly: true})!;
  expect(result.capped).toBe(false);
  expect(result.exposure).toBeGreaterThan(base.capital);
});
it('handles fractional units and unaffordable increments', () => {
  expect(sizePosition({...base, increment: .5})?.quantity).toBe(20);
  expect(sizePosition({...base, increment: 100})?.quantity).toBe(0);
});
it('rejects inverted levels and non-finite inputs', () => {
  expect(sizePosition({...base, stop: 110})).toBeNull();
  expect(sizePosition({...base, capital: Infinity})).toBeNull();
});
