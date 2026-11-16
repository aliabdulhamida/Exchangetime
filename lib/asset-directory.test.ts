import { describe, expect, it } from 'vitest';

import { isPriceSymbol, parseAssetMatches } from './asset-directory';
import { alignMarketCloses } from './market-observations';
import { matchesValuationTrend } from './market-screen';

describe('instrument directory', () => {
  it('accepts quoted instrument identifiers but not paths or free text', () => {
    for (const symbol of ['BRK-B', 'EURUSD=X', 'JPY=X', 'BTC-USD', 'SAP.DE', '^GSPC', '6E=F']) {
      expect(isPriceSymbol(symbol)).toBe(true);
    }
    for (const symbol of ['../x', '', 'Apple Inc.', 'USD=X?']) expect(isPriceSymbol(symbol)).toBe(false);
  });
  it('preserves distinct listings, drops unsupported entries and does not invent names', () => {
    const entry = { quoteType: 'EQUITY', symbol: 'AAPL', shortname: 'Apple Inc.', exchange: 'NMS' };
    const rows = parseAssetMatches({ quotes: [entry, entry, { ...entry, symbol: 'APC.DE' }, {}, { ...entry, quoteType: 'OPTION', symbol: 'OPT' }] });
    expect(rows.map(row => row.symbol)).toEqual(['AAPL', 'APC.DE']);
    expect(rows[0].exchange).toBe('NMS');
    expect(parseAssetMatches({ quotes: [] })).toEqual([]);
    expect(() => parseAssetMatches({})).toThrow();
  });
  it('does not shift a later price onto an earlier missing observation', () => {
    expect(alignMarketCloses([10, 20, 30, null, 50], [0, null, -2, 40, 60])).toEqual({
      timestamps: [10, 30, 50], prices: [0, -2, 60],
    });
  });
});

describe('valuation and trend screens', () => {
  const row = { price: 11, twoHundredDayAverage: 10, trailingPE: 20, forwardPE: null, priceToBook: -1 };
  it('accepts the boundary and rejects losses or unavailable estimates', () => {
    expect(matchesValuationTrend(row, 'trailingPE', '20', 'above')).toBe(true);
    expect(matchesValuationTrend(row, 'trailingPE', '19', 'any')).toBe(false);
    expect(matchesValuationTrend(row, 'priceToBook', '10', 'any')).toBe(false);
    expect(matchesValuationTrend(row, 'forwardPE', '20', 'any')).toBe(false);
  });
  it('requires an observed average only when a trend filter is used', () => {
    expect(matchesValuationTrend(row, 'forwardPE', '', 'below')).toBe(false);
    expect(matchesValuationTrend({ ...row, twoHundredDayAverage: null }, 'forwardPE', '', 'above')).toBe(false);
    expect(matchesValuationTrend({ ...row, twoHundredDayAverage: null }, 'forwardPE', '', 'any')).toBe(true);
  });
});
