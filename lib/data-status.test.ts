import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DataFreshness from '../components/exchangetime/data-freshness';
import PortfolioRecords from '../components/exchangetime/portfolio-records';

describe('transparent data and recovery views', () => {
  it('shows the observation date, stale warning and source details', () => {
    const markup = renderToStaticMarkup(
      createElement(DataFreshness, {
        source: 'Test source',
        updatedAt: '2020-01-01T12:00:00Z',
        stale: true,
        estimated: true,
        frequency: 'Daily',
      }),
    );
    expect(markup).toContain('2020');
    expect(markup).toContain('Stale data');
    expect(markup).toContain('Model estimate');
    expect(markup).toContain('Test source');
    expect(markup).toContain('<summary>Data details</summary>');
  });
  it('does not invent a time for a missing observation', () => {
    expect(renderToStaticMarkup(createElement(DataFreshness, { source: 'Test source' }))).toContain(
      'Update pending',
    );
  });
  it('retains native-currency records and units without a portfolio total', () => {
    const record = {
      id: '1',
      symbol: 'TEST',
      side: 'BUY' as const,
      shares: 2,
      price: 10,
      fees: 1,
      taxes: 0,
      currency: 'EUR',
      date: '2020-01-01',
    };
    const markup = renderToStaticMarkup(
      createElement(PortfolioRecords, {
        records: [record],
        onUpdate: () => {},
        onDelete: () => {},
      }),
    );
    expect(markup).toContain('Holdings · units');
    expect(markup).toContain('10 EUR');
    expect(markup).toContain('Edit TEST transaction');
    expect(markup).toContain('Export CSV');
    expect(markup).not.toContain('Total value');
  });
});
