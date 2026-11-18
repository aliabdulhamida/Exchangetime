import { expect, it } from 'vitest';

import { calculateMarketPulse } from './market-pulse';

const timestamps = Array.from({length: 55}, (_, index) => Date.UTC(2026, 0, index + 1));
const series = {timestamps, prices: timestamps.map((_, index) => 100 + index)};
it('uses VIX history when its newest bar is ahead of stocks', () => {
  const vix = {timestamps: [...timestamps, timestamps.at(-1)! + 86400000], prices: [...timestamps.map(() => 18), 32]};
  const pulse = calculateMarketPulse(series, vix, Array(11).fill(series));
  expect(pulse.asOf).toBe(new Date(timestamps.at(-1)!).toISOString().slice(0,10));
  expect(pulse.vix).toBe(18);
  expect(pulse.score).toBe(100);
});
it('chooses the latest common date and never uses later index prices in its moving average', () => {
  const vix = {timestamps: timestamps.slice(0,-1), prices: timestamps.slice(0,-1).map(() => 25)};
  const pulse = calculateMarketPulse(series, vix, Array(8).fill(series));
  expect(pulse.asOf).toBe(new Date(timestamps.at(-2)!).toISOString().slice(0,10));
  expect(pulse.sma).toBeCloseTo(series.prices.slice(4,54).reduce((sum, value) => sum + value,0)/50);
  expect(pulse.score).toBe(85);
});
it('withholds incomplete scores and explains missing inputs', () => {
  const pulse = calculateMarketPulse(series, undefined, Array(7).fill(series));
  expect(pulse.score).toBeNull();
  expect(pulse.missing).toContain('Sector coverage: 7/8 required');
  expect(pulse.missing.join(' ')).toContain('VIX unavailable');
  expect(calculateMarketPulse().score).toBeNull();
});
it('does not invent historical prices or a trend from a short sample', () => {
  const short = {prices: [100, 101], timestamps: timestamps.slice(0,2)};
  expect(calculateMarketPulse(short, short, Array(8).fill(short)).score).toBeNull();
});
