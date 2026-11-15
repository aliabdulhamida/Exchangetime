import { describe, expect, it } from 'vitest';

import { filterChartPointsByRange, formatQuote, priceCsv } from './research-history';

describe('research price history', () => {
  it('uses calendar months, including leap years, instead of counting sessions', () => {
    const points = ['2024-02-28', '2024-02-29', '2024-03-31'].map(date => ({ date: new Date(date), price: 100 }));
    expect(filterChartPointsByRange(points, '1M')).toEqual(points.slice(1));
  });
  it('exports observations in UTC with their quote unit', () => {
    expect(priceCsv([{ date: new Date('2026-11-10T16:30:00Z'), price: 168.125 }], 'EUR'))
      .toBe('Timestamp (UTC),Close,Quote unit\r\n2026-11-10T16:30:00.000Z,168.125,EUR');
  });
  it('keeps subunits distinct from major currencies', () => {
    expect(formatQuote(150, 'GBp')).toContain('GBp');
    expect(formatQuote(150, 'EUR')).toContain('€');
  });
  it('does not invent a currency when the provider omits it', () => {
    expect(formatQuote(150)).toBe('150');
  });
});
