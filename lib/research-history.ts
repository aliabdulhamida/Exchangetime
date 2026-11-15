export type PriceObservation = { date: Date; price: number };

export type ChartRange = '1M' | '3M' | '6M' | '1Y' | '52W' | 'YTD';

export function filterChartPointsByRange(points: PriceObservation[], range: ChartRange) {
  if (!points.length) return [];
  const start = new Date(points[points.length - 1].date);
  start.setUTCHours(0, 0, 0, 0);
  if (range === 'YTD') start.setUTCMonth(0, 1);
  else if (range === '52W') start.setUTCDate(start.getUTCDate() - 364);
  else {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range];
    const day = start.getUTCDate();
    start.setUTCMonth(start.getUTCMonth() - months, 1);
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDay));
  }
  return points.filter(point => point.date >= start);
}

export function priceCsv(points: PriceObservation[], currency?: string) {
  const unit = currency && /^[A-Za-z]{3}$/.test(currency) ? currency : '';
  return ['Timestamp (UTC),Close,Quote unit', ...points.map(point =>
    [point.date.toISOString(), point.price, unit].join(',')
  )].join('\r\n');
}

export function formatQuote(value: number, unit?: string, compact = false) {
  const options: Intl.NumberFormatOptions = {
    maximumFractionDigits: compact ? 1 : 4,
    notation: compact ? 'compact' : 'standard',
  };
  if (unit && /^[A-Z]{3}$/.test(unit)) {
    return value.toLocaleString(undefined, { ...options, style: 'currency', currency: unit });
  }
  return [value.toLocaleString(undefined, options), unit].filter(Boolean).join(' ');
}
