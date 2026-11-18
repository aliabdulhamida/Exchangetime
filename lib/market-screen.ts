import { z } from 'zod';

export const valuationMeasures = {
  trailingPE: 'Trailing P/E',
  forwardPE: 'Forward P/E (estimate)',
  priceToBook: 'Price / book',
} as const;
export type Measure = keyof typeof valuationMeasures;
export type Trend = 'any' | 'above' | 'below';

export const savedScreensSchema = z.array(z.object({
  name: z.string().trim().min(1).max(64),
  tab: z.enum(['gainers', 'losers', 'movers', 'mostActive']),
  query: z.string(),
  volume: z.enum(['0', '1000000', '10000000']),
  relative: z.enum(['0', '1', '2', '3']),
  order: z.enum(['provider', 'volume', 'move']),
  measure: z.enum(['trailingPE', 'forwardPE', 'priceToBook']).optional(),
  ceiling: z.string().refine(value => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0)).optional(),
  trend: z.enum(['any', 'above', 'below']).optional(),
})).refine(screens => new Set(screens.map(screen => screen.name)).size === screens.length);
export type SavedScreen = z.infer<typeof savedScreensSchema>[number];

export function filterMarketRows(rows: ScreenerRow[], filters: {
  query: string; volume: string; relative: string; order: string;
  measure: Measure; ceiling: string; trend: Trend;
}) {
  const needle = filters.query.trim().toLowerCase();
  const matches = rows.filter(row => {
    const relative = row.volume !== null && row.averageVolume !== null && row.averageVolume > 0
      ? row.volume / row.averageVolume : null;
    return matchesValuationTrend(row, filters.measure, filters.ceiling, filters.trend) &&
      (row.symbol.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle)) &&
      (Number(filters.volume) === 0 || (row.volume !== null && row.volume >= Number(filters.volume))) &&
      (Number(filters.relative) === 0 || (relative !== null && relative >= Number(filters.relative)));
  });
  if (filters.order === 'volume') matches.sort((left, right) => (right.volume ?? -1) - (left.volume ?? -1));
  if (filters.order === 'move') matches.sort((left, right) =>
    (right.changePercent === null ? -1 : Math.abs(right.changePercent)) -
    (left.changePercent === null ? -1 : Math.abs(left.changePercent)));
  return matches;
}

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
