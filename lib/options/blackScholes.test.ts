import { describe, expect, it } from 'vitest';

import { blackScholes } from './blackScholes';

describe('blackScholes', () => {
  it('matches reference call/put prices within tolerance', () => {
    const call = blackScholes({
      type: 'call',
      spot: 100,
      strike: 100,
      timeToExpiryYears: 1,
      volatility: 0.2,
      riskFreeRate: 0.05,
      dividendYield: 0,
    });

    const put = blackScholes({
      type: 'put',
      spot: 100,
      strike: 100,
      timeToExpiryYears: 1,
      volatility: 0.2,
      riskFreeRate: 0.05,
      dividendYield: 0,
    });

    expect(call.price).toBeCloseTo(10.4506, 3);
    expect(put.price).toBeCloseTo(5.5735, 3);
    expect(call.delta).toBeCloseTo(0.6368, 3);
    expect(put.delta).toBeCloseTo(-0.3632, 3);
    expect(call.gamma).toBeCloseTo(0.0188, 3);
    expect(call.vega).toBeCloseTo(0.3752, 3);
  });

  it('satisfies put-call parity approximately', () => {
    const input = {
      spot: 100,
      strike: 105,
      timeToExpiryYears: 0.5,
      volatility: 0.25,
      riskFreeRate: 0.03,
      dividendYield: 0.01,
    };

    const call = blackScholes({ type: 'call', ...input });
    const put = blackScholes({ type: 'put', ...input });

    const lhs = call.price - put.price;
    const rhs =
      input.spot * Math.exp(-input.dividendYield * input.timeToExpiryYears) -
      input.strike * Math.exp(-input.riskFreeRate * input.timeToExpiryYears);

    expect(lhs).toBeCloseTo(rhs, 3);
  });

  it('falls back to intrinsic values at zero expiry', () => {
    const call = blackScholes({
      type: 'call',
      spot: 120,
      strike: 100,
      timeToExpiryYears: 0,
      volatility: 0.2,
      riskFreeRate: 0.05,
      dividendYield: 0,
    });

    expect(call.price).toBe(20);
    expect(call.gamma).toBe(0);
    expect(call.vega).toBe(0);
  });
});
