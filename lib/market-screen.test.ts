import { describe, expect, it } from 'vitest';

import { filterMarketRows, savedScreensSchema, type ScreenerRow } from './market-screen';

const base: ScreenerRow = {
  symbol: 'AAA', name: 'Alpha', price: 10, change: 0, changePercent: 0, volume: 2000000,
  averageVolume: 1000000, marketCap: null, exchange: null, currency: 'USD', regularMarketTime: null,
  twoHundredDayAverage: 9, trailingPE: 15, forwardPE: null, priceToBook: null,
};
const filters = {query: '', volume: '0', relative: '0', order: 'provider', measure: 'trailingPE' as const, ceiling: '', trend: 'any' as const};
describe('market screen filters', () => {
  it('matches company names and trims symbol searches', () => {
    expect(filterMarketRows([base], {...filters, query: ' alpha '})).toEqual([base]);
    expect(filterMarketRows([base], {...filters, query: ' AAA '})).toEqual([base]);
  });
  it('excludes missing volume only when the corresponding filter is enabled', () => {
    const missing = {...base, volume: null, averageVolume: null};
    expect(filterMarketRows([missing], filters)).toEqual([missing]);
    expect(filterMarketRows([missing], {...filters, relative: '1'})).toEqual([]);
    expect(filterMarketRows([missing], {...filters, volume: '1000000'})).toEqual([]);
    expect(filterMarketRows([{...base, averageVolume: 0}], {...filters, relative: '1'})).toEqual([]);
  });
  it('combines valuation and trend without including missing or negative multiples', () => {
    expect(filterMarketRows([base, {...base, trailingPE: -5}, {...base, trailingPE: null}], {...filters, ceiling: '20', trend: 'above'})).toEqual([base]);
    expect(filterMarketRows([base], {...filters, ceiling: '0'})).toEqual([]);
  });
  it('sorts absolute moves with unknown values last without mutating provider order', () => {
    const rows = [{...base, symbol: 'UNKNOWN', changePercent: null}, base, {...base, symbol: 'DOWN', changePercent: -5}];
    expect(filterMarketRows(rows, {...filters, order: 'move'}).map(row => row.symbol)).toEqual(['DOWN', 'AAA', 'UNKNOWN']);
    expect(rows[0].symbol).toBe('UNKNOWN');
  });
  it('validates saved screens including old records without optional fields', () => {
    const screen = {name: 'My screen', tab: 'gainers', query: '', volume: '0', relative: '0', order: 'provider'};
    expect(savedScreensSchema.safeParse([screen]).success).toBe(true);
    expect(savedScreensSchema.safeParse([screen, screen]).success).toBe(false);
    expect(savedScreensSchema.safeParse([{...screen, ceiling: '-1'}]).success).toBe(false);
    expect(savedScreensSchema.safeParse([{...screen, measure: 'unknown'}]).success).toBe(false);
  });
});
