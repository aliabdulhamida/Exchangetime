import { expect, it } from 'vitest';

import { normalizeMarketView } from './market-view';

const instruments = [{symbol: '^GSPC', region: 'United States'}, {symbol: '^GDAXI', region: 'Europe'}];
it('restores valid selections without changing their time range', () => {
  expect(normalizeMarketView({selected: '^GDAXI', region: 'Europe', range: 21}, instruments))
    .toEqual({selected: '^GDAXI', region: 'Europe', range: 21});
});
it('cannot retain a hidden or unsupported symbol', () => {
  expect(normalizeMarketView({selected: '^GSPC', region: 'Europe', range: 'bad'}, instruments))
    .toEqual({selected: '^GDAXI', region: 'Europe', range: 0});
});
it('falls back safely for malformed saved preferences', () => {
  expect(normalizeMarketView(null, instruments)).toEqual({selected: '^GSPC', region: 'United States', range: 0});
});
