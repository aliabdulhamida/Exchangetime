export type JournalTrade = {
  symbol: string; setup: string; currency: string; date: string; side: 'long' | 'short';
  entry: number; exit: number; quantity: number; fees: number;
};
export type JournalFilters = { currency: string; query: string; side: string; from: string; to: string };

export function tradeProfit(trade: JournalTrade) {
  return (trade.exit - trade.entry) * (trade.side === 'long' ? 1 : -1) * trade.quantity - trade.fees;
}

export function filterJournal<T extends JournalTrade>(records: T[], filters: JournalFilters): T[] {
  const term = filters.query.trim().toLowerCase();
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return records.filter(trade => trade.currency === filters.currency &&
    (!filters.side || trade.side === filters.side) &&
    (!filters.from || trade.date >= filters.from) && (!filters.to || trade.date <= filters.to) &&
    (trade.symbol + ' ' + trade.setup).toLowerCase().includes(term))
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function journalStats(records: JournalTrade[]) {
  const results = records.map(tradeProfit);
  const gains = results.filter(value => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = -results.filter(value => value < 0).reduce((sum, value) => sum + value, 0);
  const net = gains - losses;
  return {net, count: records.length,
    winRate: records.length ? results.filter(value => value > 0).length / records.length * 100 : null,
    profitFactor: losses > 0 ? gains / losses : null,
    average: records.length ? net / records.length : null,
    best: records.length ? Math.max(...results) : null,
    worst: records.length ? Math.min(...results) : null,
    fees: records.reduce((sum, trade) => sum + trade.fees, 0)};
}
