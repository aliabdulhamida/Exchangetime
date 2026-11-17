'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  calculateCompoundInterest,
  normalizeCompoundInterestInput,
  type ContributionTiming,
} from '@/lib/compound-interest';

const COMPOUNDING_OPTIONS = [
  { value: 12, label: 'Monthly' },
  { value: 4, label: 'Quarterly' },
  { value: 1, label: 'Yearly' },
] as const;

const CONTRIBUTION_TIMING_OPTIONS: Array<{ value: ContributionTiming; label: string }> = [
  { value: 'end', label: 'End of period' },
  { value: 'beginning', label: 'Beginning of period' },
];

const frequencyLabel = (frequency: number): string => {
  if (frequency === 12) return 'monthly';
  if (frequency === 4) return 'quarterly';
  return 'yearly';
};

const axisCurrencyLabel = (value: number): string => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${Math.round(value)}`;
};

export default function CompoundInterestCalculator() {
  const [initialCapital, setInitialCapital] = useState(0);
  const [contributionAmount, setContributionAmount] = useState(0);
  const [annualRatePct, setAnnualRatePct] = useState(5);
  const [inflationRatePct, setInflationRatePct] = useState(2);
  const [adjustForInflation, setAdjustForInflation] = useState(false);
  const [years, setYears] = useState(10);
  const [compoundingPerYear, setCompoundingPerYear] = useState(12);
  const [contributionPerYear, setContributionPerYear] = useState(12);
  const [contributionTiming, setContributionTiming] = useState<ContributionTiming>('end');

  const normalizedInput = useMemo(
    () =>
      normalizeCompoundInterestInput({
        initialCapital,
        contributionAmount,
        annualRatePct,
        years,
        compoundingPerYear,
        contributionPerYear,
        contributionTiming,
      }),
    [
      annualRatePct,
      compoundingPerYear,
      contributionAmount,
      contributionPerYear,
      contributionTiming,
      initialCapital,
      years,
    ],
  );

  const calculation = useMemo(() => calculateCompoundInterest(normalizedInput), [normalizedInput]);
  const normalizedInflationRatePct = useMemo(() => {
    const sanitized = Number.isFinite(inflationRatePct) ? inflationRatePct : 0;
    return Math.min(100, Math.max(-99, sanitized));
  }, [inflationRatePct]);
  const inflationRate = normalizedInflationRatePct / 100;

  const inputWasAdjusted =
    normalizedInput.initialCapital !== initialCapital ||
    normalizedInput.contributionAmount !== contributionAmount ||
    normalizedInput.annualRatePct !== annualRatePct ||
    normalizedInput.years !== years ||
    normalizedInput.compoundingPerYear !== compoundingPerYear ||
    normalizedInput.contributionPerYear !== contributionPerYear ||
    normalizedInflationRatePct !== inflationRatePct;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const formatCurrency = (value: number): string => `${currencyFormatter.format(value)} €`;
  const formatPercent = (value: number): string => `${percentFormatter.format(value)}%`;
  const inflationLabel = `${percentFormatter.format(normalizedInflationRatePct)}%`;

  const displayChartData = useMemo(() => {
    if (!adjustForInflation) return calculation.chartData;

    return calculation.chartData.map((point) => {
      const factor = Math.pow(1 + inflationRate, point.year);
      return {
        ...point,
        capital: point.capital / factor,
        invested: point.invested / factor,
        gain: point.gain / factor,
      };
    });
  }, [adjustForInflation, calculation.chartData, inflationRate]);

  const horizonFactor = Math.pow(1 + inflationRate, normalizedInput.years);
  const displayFinalCapital = adjustForInflation
    ? calculation.finalCapital / horizonFactor
    : calculation.finalCapital;
  const displayTotalInvested = adjustForInflation
    ? calculation.totalInvested / horizonFactor
    : calculation.totalInvested;
  const displayTotalContributions = adjustForInflation
    ? calculation.totalContributions / horizonFactor
    : calculation.totalContributions;
  const displayTotalGain = displayFinalCapital - displayTotalInvested;
  const nominalIrr = calculation.effectiveAnnualReturnPct / 100;
  const realIrrPct = ((1 + nominalIrr) / (1 + inflationRate) - 1) * 100;
  const displayAnnualizedReturnPct = adjustForInflation
    ? realIrrPct
    : calculation.effectiveAnnualReturnPct;

  const inputClassName =
    'mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition focus:outline-none focus:ring-2 focus:ring-ring';
  const gainColorClass = displayTotalGain >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const inflationPresets = [0, 2, 3, 5, 7] as const;

  return (
    <div className="compound-workspace flex w-full flex-col gap-4 xl:flex-row xl:items-start">
      <form
        className="compound-input-surface w-full rounded-xl border border-border bg-background/40 p-4 sm:p-5 xl:max-w-md"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Your plan</h3>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col text-sm font-medium text-muted-foreground">
            Initial Capital
            <input
              type="number"
              className={inputClassName}
              value={initialCapital}
              min={0}
              max={1000000000}
              step={100}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col text-sm font-medium text-muted-foreground">
              Contribution Amount
              <input
                type="number"
                className={inputClassName}
                value={contributionAmount}
                min={0}
                max={10000000}
                step={10}
                onChange={(e) => setContributionAmount(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col text-sm font-medium text-muted-foreground">
              Interest Rate (% p.a.)
              <input
                type="number"
                className={inputClassName}
                value={annualRatePct}
                min={-99}
                max={100}
                step={0.01}
                onChange={(e) => setAnnualRatePct(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col text-sm font-medium text-muted-foreground">
              Years
              <input
                type="number"
                className={inputClassName}
                value={years}
                min={1}
                max={100}
                step={1}
                onChange={(e) => setYears(Number(e.target.value))}
              />
            </label>

            <div className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
              <label
                htmlFor="compounding-select"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Interest
              </label>
              <div className="relative">
                <select
                  id="compounding-select"
                  value={compoundingPerYear}
                  onChange={(e) => setCompoundingPerYear(Number(e.target.value))}
                  className="et-tool-select"
                >
                  {COMPOUNDING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="et-tool-select-caret h-4 w-4" />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
              <label
                htmlFor="contribution-frequency-select"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Deposits
              </label>
              <div className="relative">
                <select
                  id="contribution-frequency-select"
                  value={contributionPerYear}
                  onChange={(e) => setContributionPerYear(Number(e.target.value))}
                  className="et-tool-select"
                >
                  {COMPOUNDING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="et-tool-select-caret h-4 w-4" />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
              <label
                htmlFor="contribution-timing-select"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Timing
              </label>
              <div className="relative">
                <select
                  id="contribution-timing-select"
                  value={contributionTiming}
                  onChange={(e) => setContributionTiming(e.target.value as ContributionTiming)}
                  className="et-tool-select"
                >
                  {CONTRIBUTION_TIMING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="et-tool-select-caret h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-gradient-to-b from-background/80 via-background/45 to-background/20 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Inflation Adjustment
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={adjustForInflation}
                  onChange={(e) => setAdjustForInflation(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full border border-border bg-muted/45 transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-foreground after:transition-transform after:content-[''] peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/25 peer-checked:after:translate-x-5" />
              </label>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="flex flex-col text-sm font-medium text-muted-foreground">
                Inflation Rate (% p.a.)
                <div className="relative mt-1">
                  <input
                    type="number"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 pr-8 text-sm text-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                    value={Number.isFinite(inflationRatePct) ? inflationRatePct : ''}
                    min={-99}
                    max={100}
                    step={0.01}
                    onChange={(e) =>
                      setInflationRatePct(e.target.value === '' ? 0 : Number(e.target.value))
                    }
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {inflationPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInflationRatePct(preset)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition ${
                      Math.abs(normalizedInflationRatePct - preset) < 0.005
                        ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                        : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {inputWasAdjusted && (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Some input values were outside valid ranges and were adjusted automatically.
          </p>
        )}
      </form>

      <div
        className="compound-results flex w-full min-w-0 flex-1 flex-col gap-3"
      >
        <div className="rounded-xl border border-border bg-gradient-to-r from-card via-card to-background px-4 py-4 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Final Capital
          </p>
          <p className="mt-1 break-words text-xl font-semibold leading-tight text-foreground sm:text-3xl">
            {formatCurrency(displayFinalCapital)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Total Invested
            </p>
            <p className="mt-1 break-words text-base font-semibold leading-tight text-foreground sm:text-lg">
              {formatCurrency(displayTotalInvested)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Contributions
            </p>
            <p className="mt-1 break-words text-base font-semibold leading-tight text-foreground sm:text-lg">
              {formatCurrency(displayTotalContributions)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Interest Earned
            </p>
            <p
              className={`mt-1 break-words text-base font-semibold leading-tight sm:text-lg ${gainColorClass}`}
            >
              {formatCurrency(displayTotalGain)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Annualized Return (IRR)
            </p>
            <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">
              {formatPercent(displayAnnualizedReturnPct)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Capital Growth</h3>
            <p className="text-xs text-muted-foreground">
              {adjustForInflation
                ? `Inflation-adjusted (${inflationLabel} p.a.)`
                : 'Invested vs. portfolio value'}
            </p>
          </div>
          <div className="h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="compoundInvestedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="compoundCapitalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e5e5e5" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#e5e5e5" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickFormatter={(value) => axisCurrencyLabel(value as number)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;

                    const point = payload[0]?.payload as
                      | { year: number; capital: number; invested: number; gain: number }
                      | undefined;
                    if (!point) return null;

                    return (
                      <div className="min-w-[170px] rounded-lg border border-border bg-black/95 px-3 py-2 text-xs text-white shadow-lg">
                        <div className="mb-1 font-semibold">Year {point.year}</div>
                        <div className="space-y-0.5">
                          <div>Capital: {formatCurrency(point.capital)}</div>
                          <div>Invested: {formatCurrency(point.invested)}</div>
                          <div className={point.gain >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                            Gain: {formatCurrency(point.gain)}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="#71717a"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#compoundInvestedFill)"
                />
                <Area
                  type="monotone"
                  dataKey="capital"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#compoundCapitalFill)"
                />
                <Line
                  type="monotone"
                  dataKey="gain"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
