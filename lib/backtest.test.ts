import { describe, expect, it } from 'vitest';

import { runBacktestCalculation, type PricePoint, type DividendPoint } from './backtest';

function buildPriceSeries(
  startIso: string,
  days: number,
  startClose = 100,
  dailyStep = 0.2,
): PricePoint[] {
  const base = new Date(`${startIso}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(base.getTime() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
      date,
      close: Number((startClose + index * dailyStep).toFixed(4)),
    };
  });
}

function buildDividendSeries(entries: Array<{ offsetDays: number; amount: number }>, startIso: string): DividendPoint[] {
  const base = new Date(`${startIso}T00:00:00Z`);
  return entries.map((entry) => ({
    date: new Date(base.getTime() + entry.offsetDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    amount: entry.amount,
  }));
}

describe('runBacktestCalculation', () => {
  it('returns deterministic metrics for valid input data', () => {
    const prices = buildPriceSeries('2020-01-01', 220, 100, 0.3);
    const dividends = buildDividendSeries(
      [
        { offsetDays: 60, amount: 0.4 },
        { offsetDays: 120, amount: 0.5 },
        { offsetDays: 180, amount: 0.45 },
      ],
      '2020-01-01',
    );

    const outcome = runBacktestCalculation(
      {
        symbol: 'AAPL',
        startDate: '2020-01-01',
        endDate: '2020-07-31',
        initialAmount: 10_000,
        monthlyAmount: 500,
        reinvestDividends: true,
      },
      prices,
      dividends,
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const history = outcome.result.portfolioHistory;
    expect(history.length).toBeGreaterThan(30);
    expect(outcome.result.finalValue).toBeGreaterThanOrEqual(0);
    expect(outcome.result.totalInvested).toBeGreaterThan(0);
    expect(outcome.result.xirrPct).not.toBeNull();
    expect(outcome.result.twrPct).not.toBeNull();

    for (let i = 1; i < history.length; i += 1) {
      expect(history[i].date >= history[i - 1].date).toBe(true);
    }

    const lastCashflow = outcome.result.cashflows[outcome.result.cashflows.length - 1];
    expect(lastCashflow.type).toBe('terminal_value');
    expect(lastCashflow.amount).toBeGreaterThan(0);
  });

  it('returns typed no-data error for invalid or empty price series', () => {
    const outcome = runBacktestCalculation(
      {
        symbol: 'XXXX',
        startDate: '2020-01-01',
        endDate: '2021-01-01',
        initialAmount: 10_000,
        monthlyAmount: 0,
        reinvestDividends: false,
      },
      [],
      [],
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    expect(outcome.error.kind).toBe('data');
    expect(outcome.error.code).toBe('NO_PRICE_DATA');
  });

  it('slices to requested date range and marks adjusted range when provider data is narrower', () => {
    const prices = buildPriceSeries('2020-03-01', 120, 80, 0.1);
    const outcome = runBacktestCalculation(
      {
        symbol: 'SPY',
        startDate: '2020-01-01',
        endDate: '2020-06-30',
        initialAmount: 5_000,
        monthlyAmount: 200,
        reinvestDividends: false,
      },
      prices,
      [],
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.result.rangeAdjusted).toBe(true);
    expect(outcome.result.providerLimitedHistory).toBe(true);
    expect(outcome.result.appliedWindow.start).toBe('2020-03-01');
    expect(outcome.result.portfolioHistory[0].date).toBe(outcome.result.appliedWindow.start);
    expect(outcome.result.portfolioHistory[outcome.result.portfolioHistory.length - 1].date).toBe(
      outcome.result.appliedWindow.end,
    );
  });

  it('keeps shares unchanged in cash mode and increases shares in reinvest mode', () => {
    const prices = buildPriceSeries('2021-01-01', 140, 100, 0);
    const dividends = buildDividendSeries(
      [
        { offsetDays: 35, amount: 1 },
        { offsetDays: 70, amount: 1 },
        { offsetDays: 105, amount: 1 },
      ],
      '2021-01-01',
    );

    const reinvest = runBacktestCalculation(
      {
        symbol: 'MSFT',
        startDate: '2021-01-01',
        endDate: '2021-05-20',
        initialAmount: 1_000,
        monthlyAmount: 0,
        reinvestDividends: true,
      },
      prices,
      dividends,
    );
    const cash = runBacktestCalculation(
      {
        symbol: 'MSFT',
        startDate: '2021-01-01',
        endDate: '2021-05-20',
        initialAmount: 1_000,
        monthlyAmount: 0,
        reinvestDividends: false,
      },
      prices,
      dividends,
    );

    expect(reinvest.ok).toBe(true);
    expect(cash.ok).toBe(true);
    if (!reinvest.ok || !cash.ok) return;

    expect(reinvest.result.totalShares).toBeGreaterThan(cash.result.totalShares);
    expect(reinvest.result.dividendsCash).toBe(0);
    expect(reinvest.result.dividendsReinvested).toBeGreaterThan(0);

    expect(cash.result.dividendsCash).toBeGreaterThan(0);
    expect(cash.result.dividendsReinvested).toBe(0);
    expect(cash.result.cashflows.some((entry) => entry.type === 'dividend_cash')).toBe(true);
  });
});
