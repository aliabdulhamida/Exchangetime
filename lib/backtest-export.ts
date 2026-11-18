export type BacktestExportContext = {
  symbols: string; allocation: string; currency: string; start: string; end: string;
  initialAmount: number; monthlyAmount: number; feePct: number; slippagePct: number;
  dividendTaxPct: number; reinvest: boolean; calculatedAt: string;
};

export function backtestExportRows(history: {date: string; value: number}[], context: BacktestExportContext) {
  return [
    ['Date (UTC)', 'Simulated value', 'Currency', 'Symbols', 'Allocation', 'Requested start', 'Requested end',
      'Initial capital', 'Monthly deposit', 'Purchase fee (%)', 'Slippage (%)', 'Dividend withholding (%)',
      'Dividend treatment', 'Calculated at', 'Price source'],
    ...history.map(point => [point.date, point.value, context.currency, context.symbols, context.allocation,
      context.start, context.end, context.initialAmount, context.monthlyAmount, context.feePct, context.slippagePct,
      context.dividendTaxPct, context.reinvest ? 'Reinvested' : 'Held in cash', context.calculatedAt, 'Yahoo Finance']),
  ];
}
