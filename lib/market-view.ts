type Instrument = {symbol: string; region: string};
export type MarketView = {region: string; selected: string; range: number};

export function normalizeMarketView(value: unknown, instruments: Instrument[]): MarketView {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const regions = [...new Set(instruments.map(item => item.region)), 'All'];
  const region = typeof input.region === 'string' && regions.includes(input.region) ? input.region : 'United States';
  const visible = instruments.filter(item => region === 'All' || item.region === region);
  const selected = visible.find(item => item.symbol === input.selected)?.symbol ?? visible[0]?.symbol ?? instruments[0].symbol;
  return {region, selected, range: [0, 5, 21].includes(Number(input.range)) ? Number(input.range) : 0};
}
