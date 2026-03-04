export type ContributionTiming = 'beginning' | 'end';

export interface CompoundInterestInput {
  initialCapital: number;
  contributionAmount: number;
  annualRatePct: number;
  years: number;
  compoundingPerYear: number;
  contributionPerYear: number;
  contributionTiming?: ContributionTiming;
}

export interface CompoundInterestPoint {
  year: number;
  capital: number;
  invested: number;
  gain: number;
}

export interface CompoundInterestResult {
  finalCapital: number;
  totalContributions: number;
  totalInvested: number;
  totalGain: number;
  effectiveAnnualReturnPct: number;
  chartData: CompoundInterestPoint[];
  normalizedInput: NormalizedCompoundInterestInput;
}

export interface NormalizedCompoundInterestInput {
  initialCapital: number;
  contributionAmount: number;
  annualRatePct: number;
  years: number;
  compoundingPerYear: number;
  contributionPerYear: number;
  contributionTiming: ContributionTiming;
}

export const COMPOUND_INTEREST_FREQUENCIES = [1, 4, 12] as const;

const DEFAULT_TIMING: ContributionTiming = 'end';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toFiniteNumber = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const normalizeFrequency = (value: number, fallback: number): number => {
  return COMPOUND_INTEREST_FREQUENCIES.includes(value as (typeof COMPOUND_INTEREST_FREQUENCIES)[number])
    ? value
    : fallback;
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
};

const lcm = (a: number, b: number): number => Math.abs(a * b) / gcd(a, b);

const npv = (cashflows: Array<{ amount: number; t: number }>, rate: number): number => {
  const base = 1 + rate;
  if (base <= 0) return Number.POSITIVE_INFINITY;

  return cashflows.reduce((sum, cf) => {
    const discount = Math.pow(base, cf.t);
    if (!Number.isFinite(discount) || discount === 0) return sum;
    return sum + cf.amount / discount;
  }, 0);
};

const solveIrr = (cashflows: Array<{ amount: number; t: number }>): number | null => {
  const hasPositive = cashflows.some((cf) => cf.amount > 0);
  const hasNegative = cashflows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  let low = -0.9999;
  let high = 1;
  let fLow = npv(cashflows, low);
  let fHigh = npv(cashflows, high);

  let expansionSteps = 0;
  while (fLow * fHigh > 0 && expansionSteps < 40) {
    high *= 2;
    fHigh = npv(cashflows, high);
    expansionSteps += 1;

    if (!Number.isFinite(fHigh)) {
      return null;
    }
  }

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) {
    return null;
  }

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const fMid = npv(cashflows, mid);

    if (!Number.isFinite(fMid)) {
      return null;
    }

    if (Math.abs(fMid) < 1e-9) {
      return mid;
    }

    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
};

export function normalizeCompoundInterestInput(
  input: CompoundInterestInput,
): NormalizedCompoundInterestInput {
  const rawYears = Math.round(toFiniteNumber(input.years, 10));

  return {
    initialCapital: clamp(toFiniteNumber(input.initialCapital, 0), 0, 1_000_000_000),
    contributionAmount: clamp(toFiniteNumber(input.contributionAmount, 0), 0, 10_000_000),
    annualRatePct: clamp(toFiniteNumber(input.annualRatePct, 0), -99, 100),
    years: clamp(rawYears, 1, 100),
    compoundingPerYear: normalizeFrequency(input.compoundingPerYear, 12),
    contributionPerYear: normalizeFrequency(input.contributionPerYear, 12),
    contributionTiming:
      input.contributionTiming === 'beginning' || input.contributionTiming === 'end'
        ? input.contributionTiming
        : DEFAULT_TIMING,
  };
}

export function calculateCompoundInterest(rawInput: CompoundInterestInput): CompoundInterestResult {
  const input = normalizeCompoundInterestInput(rawInput);

  const annualRate = input.annualRatePct / 100;
  const periodsPerYear = lcm(input.compoundingPerYear, input.contributionPerYear);
  const compoundingEvery = periodsPerYear / input.compoundingPerYear;
  const contributionEvery = periodsPerYear / input.contributionPerYear;
  const totalPeriods = input.years * periodsPerYear;

  const periodicRate = annualRate / input.compoundingPerYear;

  let capital = input.initialCapital;
  let totalContributions = 0;

  const cashflows: Array<{ amount: number; t: number }> = [];
  if (input.initialCapital > 0) {
    cashflows.push({ amount: -input.initialCapital, t: 0 });
  }

  const chartData: CompoundInterestPoint[] = [
    {
      year: 0,
      capital,
      invested: input.initialCapital,
      gain: capital - input.initialCapital,
    },
  ];

  for (let period = 1; period <= totalPeriods; period += 1) {
    const contributionDue = period % contributionEvery === 0;
    const compoundingDue = period % compoundingEvery === 0;

    if (contributionDue && input.contributionTiming === 'beginning') {
      capital += input.contributionAmount;
      totalContributions += input.contributionAmount;
      cashflows.push({ amount: -input.contributionAmount, t: (period - 1) / periodsPerYear });
    }

    if (compoundingDue) {
      capital *= 1 + periodicRate;
    }

    if (contributionDue && input.contributionTiming === 'end') {
      capital += input.contributionAmount;
      totalContributions += input.contributionAmount;
      cashflows.push({ amount: -input.contributionAmount, t: period / periodsPerYear });
    }

    if (period % periodsPerYear === 0) {
      const year = period / periodsPerYear;
      const invested = input.initialCapital + totalContributions;

      chartData.push({
        year,
        capital,
        invested,
        gain: capital - invested,
      });
    }
  }

  cashflows.push({ amount: capital, t: input.years });
  const solvedIrr = solveIrr(cashflows);

  const totalInvested = input.initialCapital + totalContributions;
  const totalGain = capital - totalInvested;

  return {
    finalCapital: capital,
    totalContributions,
    totalInvested,
    totalGain,
    effectiveAnnualReturnPct: solvedIrr !== null ? solvedIrr * 100 : 0,
    chartData,
    normalizedInput: input,
  };
}
