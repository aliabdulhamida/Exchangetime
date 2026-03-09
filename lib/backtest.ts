const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365 * MS_PER_DAY;

export type PricePoint = {
  date: string;
  close: number;
};

export type DividendPoint = {
  date: string;
  amount: number;
};

export type PortfolioPoint = {
  date: string;
  value: number;
};

export type CashflowType =
  | 'initial_investment'
  | 'monthly_contribution'
  | 'dividend_cash'
  | 'terminal_value';

export type CashflowPoint = {
  date: string;
  amount: number;
  type: CashflowType;
};

export type BacktestInput = {
  symbol: string;
  startDate: string;
  endDate: string;
  initialAmount: number;
  monthlyAmount: number;
  reinvestDividends: boolean;
};

export type BacktestErrorKind = 'input' | 'data' | 'calculation';

export type BacktestError = {
  kind: BacktestErrorKind;
  code: string;
  message: string;
};

export type BacktestResult = {
  symbol: string;
  requestedWindow: { start: string; end: string };
  appliedWindow: { start: string; end: string };
  rangeAdjusted: boolean;
  providerLimitedHistory: boolean;
  totalInvested: number;
  finalValue: number;
  totalShares: number;
  dividendsCash: number;
  dividendsReinvested: number;
  xirrPct: number | null;
  twrPct: number | null;
  portfolioHistory: PortfolioPoint[];
  cashflows: CashflowPoint[];
};

export type BacktestOutcome =
  | { ok: true; result: BacktestResult }
  | { ok: false; error: BacktestError };

type NormalizedPrice = {
  date: string;
  ts: number;
  close: number;
};

type NormalizedDividend = {
  date: string;
  ts: number;
  amount: number;
};

function toIsoDate(raw: string): string | null {
  if (typeof raw !== 'string' || raw.trim().length < 8) return null;
  const parsed = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function dateToTs(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

function normalizePrices(prices: PricePoint[]): NormalizedPrice[] {
  const normalized = prices
    .map((entry) => {
      const iso = toIsoDate(entry.date);
      if (!iso) return null;
      if (typeof entry.close !== 'number' || !Number.isFinite(entry.close) || entry.close <= 0) {
        return null;
      }
      return {
        date: iso,
        ts: dateToTs(iso),
        close: entry.close,
      };
    })
    .filter((entry): entry is NormalizedPrice => entry !== null)
    .sort((a, b) => a.ts - b.ts);

  if (normalized.length <= 1) return normalized;

  const deduped: NormalizedPrice[] = [];
  for (const point of normalized) {
    const previous = deduped[deduped.length - 1];
    if (!previous || previous.date !== point.date) {
      deduped.push(point);
    } else {
      deduped[deduped.length - 1] = point;
    }
  }
  return deduped;
}

function normalizeDividends(dividends: DividendPoint[]): NormalizedDividend[] {
  return dividends
    .map((entry) => {
      const iso = toIsoDate(entry.date);
      if (!iso) return null;
      if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount) || entry.amount <= 0) {
        return null;
      }
      return {
        date: iso,
        ts: dateToTs(iso),
        amount: entry.amount,
      };
    })
    .filter((entry): entry is NormalizedDividend => entry !== null)
    .sort((a, b) => a.ts - b.ts);
}

function firstDayOfNextMonth(ts: number): number {
  const date = new Date(ts);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function addMonth(ts: number): number {
  const date = new Date(ts);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function roundTo(value: number, decimals = 6): number {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

function computeXirrPercent(cashflows: CashflowPoint[]): number | null {
  if (cashflows.length < 2) return null;

  const firstTs = dateToTs(cashflows[0].date);
  if (!Number.isFinite(firstTs)) return null;

  const values = cashflows.map((entry) => ({
    amount: entry.amount,
    years: (dateToTs(entry.date) - firstTs) / MS_PER_YEAR,
  }));

  const hasPositive = values.some((entry) => entry.amount > 0);
  const hasNegative = values.some((entry) => entry.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const npv = (rate: number) =>
    values.reduce((sum, entry) => sum + entry.amount / (1 + rate) ** entry.years, 0);
  const dNpv = (rate: number) =>
    values.reduce(
      (sum, entry) => sum - (entry.years * entry.amount) / (1 + rate) ** (entry.years + 1),
      0,
    );

  let rate = 0.1;
  for (let i = 0; i < 50; i += 1) {
    if (rate <= -0.9999) return null;
    const value = npv(rate);
    const derivative = dNpv(rate);
    if (!Number.isFinite(value) || !Number.isFinite(derivative) || derivative === 0) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) {
      rate = next;
      return Number.isFinite(rate) ? roundTo(rate * 100, 6) : null;
    }
    rate = next;
  }

  let low = -0.999;
  let high = 10;
  let lowValue = npv(low);
  let highValue = npv(high);
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) {
    return null;
  }

  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    const midValue = npv(mid);
    if (!Number.isFinite(midValue)) return null;
    if (Math.abs(midValue) < 1e-7) return roundTo(mid * 100, 6);
    if (lowValue * midValue < 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
    if (Math.abs(high - low) < 1e-7 || Math.abs(highValue - lowValue) < 1e-7) {
      return roundTo(((low + high) / 2) * 100, 6);
    }
  }

  return roundTo(((low + high) / 2) * 100, 6);
}

function normalizeNonNegativeNumber(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

function noPriceDataError(): BacktestOutcome {
  return {
    ok: false,
    error: {
      kind: 'data',
      code: 'NO_PRICE_DATA',
      message: 'No usable price data is available for the selected range.',
    },
  };
}

function inputError(code: string, message: string): BacktestOutcome {
  return {
    ok: false,
    error: {
      kind: 'input',
      code,
      message,
    },
  };
}

export function runBacktestCalculation(
  input: BacktestInput,
  priceSeries: PricePoint[],
  dividendSeries: DividendPoint[],
): BacktestOutcome {
  const normalizedPrices = normalizePrices(priceSeries);
  if (normalizedPrices.length === 0) return noPriceDataError();

  const requestedStartIso = toIsoDate(input.startDate);
  const requestedEndIso = toIsoDate(input.endDate);
  if (!requestedStartIso || !requestedEndIso) {
    return inputError('INVALID_DATE_RANGE', 'Start and end dates must be valid ISO date values.');
  }

  const requestedStartTs = dateToTs(requestedStartIso);
  const requestedEndTs = dateToTs(requestedEndIso);
  if (requestedStartTs > requestedEndTs) {
    return inputError('INVALID_DATE_RANGE', 'The start date must be on or before the end date.');
  }

  const providerStartTs = normalizedPrices[0].ts;
  const providerEndTs = normalizedPrices[normalizedPrices.length - 1].ts;
  const targetStartTs = Math.max(requestedStartTs, providerStartTs);
  const targetEndTs = Math.min(requestedEndTs, providerEndTs);

  if (targetEndTs < targetStartTs) return noPriceDataError();

  const pricesInWindow = normalizedPrices.filter(
    (entry) => entry.ts >= targetStartTs && entry.ts <= targetEndTs,
  );
  if (pricesInWindow.length === 0) return noPriceDataError();

  const appliedWindow = {
    start: pricesInWindow[0].date,
    end: pricesInWindow[pricesInWindow.length - 1].date,
  };

  const requestedWindow = {
    start: requestedStartIso,
    end: requestedEndIso,
  };

  const providerLimitedHistory =
    appliedWindow.start !== requestedWindow.start || appliedWindow.end !== requestedWindow.end;
  const rangeAdjusted = providerLimitedHistory;

  const normalizedDividends = normalizeDividends(dividendSeries).filter(
    (entry) => entry.ts >= targetStartTs && entry.ts <= targetEndTs,
  );

  const initialAmount = normalizeNonNegativeNumber(input.initialAmount);
  const monthlyAmount = normalizeNonNegativeNumber(input.monthlyAmount);
  const reinvestDividends = Boolean(input.reinvestDividends);

  let totalShares = 0;
  let totalInvested = 0;
  let dividendsCash = 0;
  let dividendsReinvested = 0;
  let cashDividendBalance = 0;
  let dividendIndex = 0;
  let nextMonthlyContributionTs = firstDayOfNextMonth(targetStartTs);

  const portfolioHistory: PortfolioPoint[] = [];
  const cashflows: CashflowPoint[] = [];

  const firstPrice = pricesInWindow[0];
  if (initialAmount > 0) {
    totalShares += initialAmount / firstPrice.close;
    totalInvested += initialAmount;
    cashflows.push({
      date: firstPrice.date,
      amount: -initialAmount,
      type: 'initial_investment',
    });
  }

  for (const point of pricesInWindow) {
    while (monthlyAmount > 0 && point.ts >= nextMonthlyContributionTs && nextMonthlyContributionTs <= targetEndTs) {
      totalShares += monthlyAmount / point.close;
      totalInvested += monthlyAmount;
      cashflows.push({
        date: point.date,
        amount: -monthlyAmount,
        type: 'monthly_contribution',
      });
      nextMonthlyContributionTs = addMonth(nextMonthlyContributionTs);
    }

    while (dividendIndex < normalizedDividends.length && normalizedDividends[dividendIndex].ts <= point.ts) {
      const dividend = normalizedDividends[dividendIndex];
      const payout = totalShares * dividend.amount;
      if (payout > 0 && Number.isFinite(payout)) {
        if (reinvestDividends) {
          totalShares += payout / point.close;
          dividendsReinvested += payout;
        } else {
          cashDividendBalance += payout;
          dividendsCash += payout;
          cashflows.push({
            date: dividend.date,
            amount: payout,
            type: 'dividend_cash',
          });
        }
      }
      dividendIndex += 1;
    }

    portfolioHistory.push({
      date: point.date,
      value: totalShares * point.close + cashDividendBalance,
    });
  }

  const finalValue = portfolioHistory.length > 0 ? portfolioHistory[portfolioHistory.length - 1].value : 0;
  const finalDate = portfolioHistory.length > 0 ? portfolioHistory[portfolioHistory.length - 1].date : appliedWindow.end;

  cashflows.push({
    date: finalDate,
    amount: finalValue,
    type: 'terminal_value',
  });

  const xirrPct = computeXirrPercent(cashflows);
  const twrPct =
    totalInvested > 0 ? roundTo(((finalValue - totalInvested) / totalInvested) * 100, 6) : null;

  return {
    ok: true,
    result: {
      symbol: input.symbol,
      requestedWindow,
      appliedWindow,
      rangeAdjusted,
      providerLimitedHistory,
      totalInvested: roundTo(totalInvested, 6),
      finalValue: roundTo(finalValue, 6),
      totalShares: roundTo(totalShares, 8),
      dividendsCash: roundTo(dividendsCash, 6),
      dividendsReinvested: roundTo(dividendsReinvested, 6),
      xirrPct,
      twrPct,
      portfolioHistory: portfolioHistory.map((entry) => ({
        date: entry.date,
        value: roundTo(entry.value, 6),
      })),
      cashflows: cashflows.map((entry) => ({
        date: entry.date,
        amount: roundTo(entry.amount, 6),
        type: entry.type,
      })),
    },
  };
}
