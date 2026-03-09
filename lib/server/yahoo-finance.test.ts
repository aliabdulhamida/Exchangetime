import { describe, expect, it } from 'vitest';

import {
  mapYahooAnalystConsensus,
  mapYahooInsiderTrades,
  mapYahooMetrics,
  normalizeYahooSymbol,
  toFiniteNumber,
} from './yahoo-finance';

describe('yahoo-finance helpers', () => {
  it('normalizes stock and fx symbols safely', () => {
    expect(normalizeYahooSymbol(' aapl ')).toBe('AAPL');
    expect(normalizeYahooSymbol('eurusd=x', { allowFxWithSuffix: true })).toBe('EURUSD=X');
    expect(normalizeYahooSymbol('eurusd', { allowFxPair: true })).toBe('EURUSD');
    expect(normalizeYahooSymbol('')).toBeNull();
    expect(normalizeYahooSymbol('@@@')).toBeNull();
  });

  it('extracts finite numbers from raw wrappers', () => {
    expect(toFiniteNumber(10)).toBe(10);
    expect(toFiniteNumber({ raw: 12.5 })).toBe(12.5);
    expect(toFiniteNumber({ raw: '12.5' })).toBeNull();
    expect(toFiniteNumber(null)).toBeNull();
  });

  it('maps yahoo metrics into existing API contract', () => {
    const payload = mapYahooMetrics(
      {
        symbol: 'AAPL',
        price: 200,
        previousClose: 198,
        currency: 'USD',
        meta: {},
        chartResult: null,
        chartRaw: null,
        quoteResult: {
          trailingPE: 30,
          priceToBook: 45,
          pegRatio: 2,
          longName: 'Apple Inc.',
        },
        summaryResult: {},
        summaryProfile: {},
        summaryDetail: {
          dividendYield: { raw: 0.005 },
        },
        defaultKeyStats: {
          earningsQuarterlyGrowth: { raw: 0.18 },
        },
        financialData: {
          returnOnEquity: { raw: 0.25 },
          profitMargins: { raw: 0.19 },
          debtToEquity: { raw: 150 },
          currentRatio: { raw: 1.2 },
          freeCashflow: { raw: 120_000_000_000 },
          revenueGrowth: { raw: 0.12 },
          earningsGrowth: { raw: 0.15 },
        },
      },
      'AAPL',
    );

    expect(payload.source).toBe('yahoo');
    expect(payload.companyName).toBe('Apple Inc.');
    expect(payload.peRatio).toBe(30);
    expect(payload.pbRatio).toBe(45);
    expect(payload.roe).toBe(25);
    expect(payload.revenueGrowth).toBe(12);
    expect(payload.earningsGrowth).toBe(15);
    expect(payload.freeCashFlow).toBe(120);
    expect(payload.dividendYield).toBe(0.5);
  });

  it('maps analyst consensus from yahoo recommendation fields', () => {
    const payload = mapYahooAnalystConsensus(
      {
        symbol: 'MSFT',
        price: 400,
        previousClose: 390,
        currency: 'USD',
        meta: {},
        chartResult: null,
        chartRaw: null,
        quoteResult: {},
        summaryResult: {},
        summaryProfile: {},
        summaryDetail: {},
        defaultKeyStats: {},
        financialData: {
          recommendationKey: 'buy',
          targetMeanPrice: { raw: 455.23 },
        },
      },
      'MSFT',
    );

    expect(payload.source).toBe('yahoo');
    expect(payload.analystRecommendation).toBe('Buy');
    expect(payload.rating).toBe('B');
    expect(payload.targetPrice).toBe('455.23');
  });

  it('maps insider transactions to normalized trades', () => {
    const payload = mapYahooInsiderTrades(
      {
        symbol: 'NVDA',
        price: 100,
        previousClose: 98,
        currency: 'USD',
        meta: {},
        chartResult: null,
        chartRaw: null,
        quoteResult: { longName: 'NVIDIA Corporation' },
        summaryResult: {
          insiderTransactions: {
            transactions: [
              {
                filerName: { fmt: 'Jane Doe' },
                filerRelation: { fmt: 'Officer' },
                transactionText: { fmt: 'Sale' },
                startDate: { raw: 1730764800 },
                shares: { raw: 1000 },
                transactionPrice: { raw: 125.5 },
              },
            ],
          },
        },
        summaryProfile: {},
        summaryDetail: {},
        defaultKeyStats: {},
        financialData: {},
      },
      'NVDA',
    );

    expect(payload.source).toBe('yahoo');
    expect(payload.company).toBe('NVIDIA Corporation');
    expect(payload.trades).toHaveLength(1);
    expect(payload.trades[0].insider).toBe('Jane Doe');
    expect(payload.trades[0].transaction).toBe('Sale');
    expect(payload.trades[0].shares).toBe(1000);
    expect(payload.trades[0].value).toBe(125500);
  });
});
