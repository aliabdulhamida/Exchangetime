export const valuationMeasures = {
  trailingPE: 'Trailing P/E',
  forwardPE: 'Forward P/E (estimate)',
  priceToBook: 'Price / book',
} as const;
export type Measure = keyof typeof valuationMeasures;
export type Trend = 'any' | 'above' | 'below';

export type ScreenerRow = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  exchange: string | null;
  currency: string | null;
  regularMarketTime: number | null;
  twoHundredDayAverage: number | null;
} & Record<Measure, number | null>;

export function matchesValuationTrend(
  row: Pick<ScreenerRow, Measure | 'price' | 'twoHundredDayAverage'>,
  measure: Measure, ceiling: string, trend: Trend,
) {
  if (ceiling !== '') {
    const max = Number(ceiling);
    const value = row[measure];
    if (!Number.isFinite(max) || max <= 0 || value === null || !(value > 0 && value <= max)) return false;
  }
  if (trend === 'any') return true;
  const { price, twoHundredDayAverage: average } = row;
  return price !== null && average !== null && average > 0 &&
    (trend === 'above' ? price > average : price < average);
}
