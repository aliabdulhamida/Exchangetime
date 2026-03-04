import { describe, expect, it } from 'vitest';

import {
  calculateCompoundInterest,
  normalizeCompoundInterestInput,
} from './compound-interest';

describe('normalizeCompoundInterestInput', () => {
  it('clamps and normalizes invalid values', () => {
    const normalized = normalizeCompoundInterestInput({
      initialCapital: -100,
      contributionAmount: -20,
      annualRatePct: 500,
      years: 0,
      compoundingPerYear: 7,
      contributionPerYear: 3,
      contributionTiming: 'end',
    });

    expect(normalized.initialCapital).toBe(0);
    expect(normalized.contributionAmount).toBe(0);
    expect(normalized.annualRatePct).toBe(100);
    expect(normalized.years).toBe(1);
    expect(normalized.compoundingPerYear).toBe(12);
    expect(normalized.contributionPerYear).toBe(12);
  });
});

describe('calculateCompoundInterest', () => {
  it('matches simple deposit sum when rate is 0%', () => {
    const result = calculateCompoundInterest({
      initialCapital: 1000,
      contributionAmount: 100,
      annualRatePct: 0,
      years: 10,
      compoundingPerYear: 1,
      contributionPerYear: 12,
      contributionTiming: 'end',
    });

    expect(result.finalCapital).toBeCloseTo(13_000, 8);
    expect(result.totalContributions).toBeCloseTo(12_000, 8);
    expect(result.totalGain).toBeCloseTo(0, 8);
    expect(result.chartData).toHaveLength(11);
  });

  it('matches closed-form formula without contributions', () => {
    const start = 10_000;
    const rate = 5;
    const years = 8;
    const compoundingPerYear = 4;

    const result = calculateCompoundInterest({
      initialCapital: start,
      contributionAmount: 0,
      annualRatePct: rate,
      years,
      compoundingPerYear,
      contributionPerYear: 12,
      contributionTiming: 'end',
    });

    const expected = start * Math.pow(1 + rate / 100 / compoundingPerYear, compoundingPerYear * years);

    expect(result.finalCapital).toBeCloseTo(expected, 8);
  });

  it('gives higher final capital for beginning-of-period contributions', () => {
    const endResult = calculateCompoundInterest({
      initialCapital: 0,
      contributionAmount: 200,
      annualRatePct: 8,
      years: 12,
      compoundingPerYear: 12,
      contributionPerYear: 12,
      contributionTiming: 'end',
    });

    const beginningResult = calculateCompoundInterest({
      initialCapital: 0,
      contributionAmount: 200,
      annualRatePct: 8,
      years: 12,
      compoundingPerYear: 12,
      contributionPerYear: 12,
      contributionTiming: 'beginning',
    });

    expect(beginningResult.finalCapital).toBeGreaterThan(endResult.finalCapital);
  });

  it('approximates annual return via IRR for a lump-sum investment', () => {
    const result = calculateCompoundInterest({
      initialCapital: 1000,
      contributionAmount: 0,
      annualRatePct: 10,
      years: 5,
      compoundingPerYear: 1,
      contributionPerYear: 12,
      contributionTiming: 'end',
    });

    expect(result.effectiveAnnualReturnPct).toBeCloseTo(10, 6);
  });
});
