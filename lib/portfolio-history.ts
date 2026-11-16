type Close = { date: string; close: number };
type Trade = { date: string; symbol: string; shares: number; side: 'BUY' | 'SELL' };

export function buildPortfolioHistory(
  trades: readonly Trade[],
  prices: Record<string, Close[]>,
  toBase: (price: number, symbol: string, date: string) => number,
) {
  if (!trades.length) return [];
  const ledger = [...trades].sort((left, right) => left.date.localeCompare(right.date));
  const symbols = [...new Set(ledger.map(trade => trade.symbol))];
  const dates = [...new Set(symbols.flatMap(symbol => (prices[symbol] ?? []).map(point => point.date)))].sort();
  const positions = new Map<string, number>();
  const cursors = new Map<string, number>();
  const history: { date: string; value: number }[] = [];
  let tradeIndex = 0;
  for (const date of dates) {
    if (date < ledger[0].date) continue;
    while (tradeIndex < ledger.length && ledger[tradeIndex].date <= date) {
      const trade = ledger[tradeIndex++];
      positions.set(trade.symbol, (positions.get(trade.symbol) ?? 0) + (trade.side === 'BUY' ? trade.shares : -trade.shares));
    }
    let total = 0;
    for (const [symbol, quantity] of positions) {
      if (quantity <= 0) continue;
      const series = prices[symbol] ?? [];
      let index = cursors.get(symbol) ?? -1;
      while (index + 1 < series.length && series[index + 1].date <= date) index++;
      cursors.set(symbol, index);
      if (index < 0) { total = NaN; break; }
      total += quantity * toBase(series[index].close, symbol, date);
    }
    if (Number.isFinite(total)) history.push({ date, value: total });
  }
  return history;
}
