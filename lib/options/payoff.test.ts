import { describe, expect, it } from 'vitest';

import {
  createPnlScaler,
  detectShortCallEarlyExerciseRisks,
  inferPayoffDomain,
  payoffAtExpiry,
  payoffAtExpiryAfterCosts,
  pnlDisplayDivisor,
  probabilityOfProfitAtExpiry,
  profitableIntervalsFromCurve,
  sampleCurve,
  scenarioRowsFromCurve,
} from './payoff';

describe('payoffAtExpiry', () => {
  it('computes long call payoff correctly', () => {
    const legs = [
      {
        id: 'lc',
        type: 'call' as const,
        side: 'long' as const,
        strike: 100,
        premium: 5,
        qty: 1,
        multiplier: 100,
      },
    ];

    expect(payoffAtExpiry(90, legs)).toBeCloseTo(-500, 6);
    expect(payoffAtExpiry(100, legs)).toBeCloseTo(-500, 6);
    expect(payoffAtExpiry(120, legs)).toBeCloseTo(1500, 6);
  });

  it('computes covered call payoff correctly', () => {
    const legs = [
      {
        id: 'stock',
        type: 'stock' as const,
        side: 'long' as const,
        premium: 100,
        entryPrice: 100,
        qty: 1,
        multiplier: 100,
      },
      {
        id: 'short-call',
        type: 'call' as const,
        side: 'short' as const,
        strike: 110,
        premium: 2,
        qty: 1,
        multiplier: 100,
      },
    ];

    expect(payoffAtExpiry(90, legs)).toBeCloseTo(-800, 6);
    expect(payoffAtExpiry(110, legs)).toBeCloseTo(1200, 6);
    expect(payoffAtExpiry(130, legs)).toBeCloseTo(1200, 6);
  });

  it('applies trading costs on top of payoff', () => {
    const legs = [
      {
        id: 'lc',
        type: 'call' as const,
        side: 'long' as const,
        strike: 100,
        premium: 5,
        qty: 1,
        multiplier: 100,
      },
    ];

    const withCosts = payoffAtExpiryAfterCosts(120, legs, {
      feePerContract: 1,
      feePerShare: 0,
      slippagePct: 1,
    });

    expect(withCosts).toBeCloseTo(1493, 6);
  });

  it('binds inferred payoff domain to scenario range input', () => {
    const spot = 200;
    const rangePct = 15;
    const domain = inferPayoffDomain(spot, [], rangePct);

    expect(domain.min).toBeCloseTo(170, 6);
    expect(domain.max).toBeCloseTo(230, 6);
  });

  it('samples scenario rows from the configured range', () => {
    const spot = 100;
    const domain = inferPayoffDomain(spot, [], 20);
    const curve = sampleCurve(domain, 200, (price) => price - 100);
    const rows = scenarioRowsFromCurve(curve, spot, 20);

    expect(rows[0].movePct).toBeCloseTo(-20, 2);
    expect(rows[rows.length - 1].movePct).toBeCloseTo(20, 2);
    expect(rows.find((row) => Math.abs(row.movePct) < 0.001)?.price).toBeCloseTo(100, 2);
  });

  it('uses absolute option contract count as per-contract divisor', () => {
    const optionLegs = [
      {
        id: 'c1',
        type: 'call' as const,
        side: 'long' as const,
        strike: 100,
        premium: 5,
        qty: 2,
        multiplier: 100,
      },
      {
        id: 'p1',
        type: 'put' as const,
        side: 'short' as const,
        strike: 95,
        premium: 4,
        qty: 3,
        multiplier: 100,
      },
    ];

    expect(pnlDisplayDivisor('per_contract', optionLegs)).toBe(5);

    const stockOnlyLegs = [
      {
        id: 's1',
        type: 'stock' as const,
        side: 'long' as const,
        premium: 100,
        qty: 1,
        multiplier: 100,
      },
    ];

    expect(pnlDisplayDivisor('per_contract', stockOnlyLegs)).toBe(1);
  });

  it('uses one centralized scaler for display consistency', () => {
    const legs = [
      {
        id: 'c1',
        type: 'call' as const,
        side: 'long' as const,
        strike: 100,
        premium: 5,
        qty: 2,
        multiplier: 100,
      },
    ];

    const scaler = createPnlScaler('per_contract', legs);
    expect(scaler.divisor).toBe(2);
    expect(scaler.scale(400)).toBe(200);
    expect(scaler.scale(-50)).toBe(-25);
  });

  it('computes PoP for a single breakeven (unbounded upside)', () => {
    const pop = probabilityOfProfitAtExpiry(
      [{ lower: 100, upper: null }],
      {
        spot: 100,
        volatility: 0.2,
        riskFreeRate: 0,
        dividendYield: 0,
        timeToExpiryYears: 1,
      },
    );

    expect(pop).toBeGreaterThan(0.4);
    expect(pop).toBeLessThan(0.5);
  });

  it('computes PoP for two breakevens (bounded profit interval)', () => {
    const pop = probabilityOfProfitAtExpiry(
      [{ lower: 90, upper: 110 }],
      {
        spot: 100,
        volatility: 0.2,
        riskFreeRate: 0,
        dividendYield: 0,
        timeToExpiryYears: 1,
      },
    );

    expect(pop).toBeGreaterThan(0.35);
    expect(pop).toBeLessThan(0.45);
  });

  it('computes PoP for unbounded downside region', () => {
    const pop = probabilityOfProfitAtExpiry(
      [{ lower: null, upper: 95 }],
      {
        spot: 100,
        volatility: 0.2,
        riskFreeRate: 0,
        dividendYield: 0,
        timeToExpiryYears: 1,
      },
    );

    expect(pop).toBeGreaterThan(0.33);
    expect(pop).toBeLessThan(0.45);
  });

  it('detects profitable intervals from curve with two breakevens', () => {
    const curve = sampleCurve({ min: 80, max: 120 }, 200, (price) => 10 - Math.abs(price - 100));
    const intervals = profitableIntervalsFromCurve(curve);

    expect(intervals).toHaveLength(1);
    expect(intervals[0].lower ?? 0).toBeCloseTo(90, 1);
    expect(intervals[0].upper ?? 0).toBeCloseTo(110, 1);
  });

  it('flags early exercise risk for short ITM call with dividends', () => {
    const risks = detectShortCallEarlyExerciseRisks(
      [
        {
          id: 'short-call',
          type: 'call',
          side: 'short',
          strike: 95,
          premium: 2,
          qty: 1,
          multiplier: 100,
        },
      ],
      110,
      0.02,
      14,
      { 'short-call': 15.1 },
    );

    expect(risks).toHaveLength(1);
    expect(risks[0].legId).toBe('short-call');
  });

  it('does not flag early exercise risk when no dividend yield is present', () => {
    const risks = detectShortCallEarlyExerciseRisks(
      [
        {
          id: 'short-call',
          type: 'call',
          side: 'short',
          strike: 95,
          premium: 2,
          qty: 1,
          multiplier: 100,
        },
      ],
      110,
      0,
      14,
      { 'short-call': 15.1 },
    );

    expect(risks).toHaveLength(0);
  });
});
