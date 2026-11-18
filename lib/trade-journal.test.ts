import { expect, it } from 'vitest';

import { filterJournal, journalStats, tradeProfit } from './trade-journal';

const long = {symbol: 'AAA', setup: 'Breakout', currency: 'USD', date: '2026-01-02',
  side: 'long' as const, entry: 10, exit: 12, quantity: 10, fees: 2};
const short = {...long, symbol: 'BBB', date: '2026-01-03', side: 'short' as const};
const filters = {currency: 'USD', query: '', side: '', from: '', to: ''};
it('includes fees and handles short losses', () => {
  expect(tradeProfit(long)).toBe(18);
  expect(tradeProfit(short)).toBe(-22);
  expect(journalStats([long, short])).toMatchObject({net: -4, winRate: 50, average: -2, fees: 4});
});
it('keeps currencies isolated and does not mutate stored order', () => {
  const records = [long, short, {...long, currency: 'EUR'}];
  expect(filterJournal(records, filters)).toEqual([short, long]);
  expect(records[0]).toBe(long);
});
it('matches setup or ticker and inclusive date bounds', () => {
  expect(filterJournal([long, short], {...filters, query: 'aaa'})).toEqual([long]);
  expect(filterJournal([long, short], {...filters, query: 'breakout', side: 'short', from: short.date, to: short.date})).toEqual([short]);
  expect(filterJournal([long], {...filters, from: '2026-02-01', to: '2026-01-01'})).toEqual([]);
});
it('does not invent ratios for empty or zero-loss samples', () => {
  expect(journalStats([])).toMatchObject({winRate: null, profitFactor: null, best: null});
  expect(journalStats([long]).profitFactor).toBeNull();
});
