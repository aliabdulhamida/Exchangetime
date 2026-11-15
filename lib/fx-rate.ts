export function getSeriesFxRate(series: readonly { date: string; close: number }[] | null | undefined, date?: string) {
  if (!series) return null;
  for (let index = series.length - 1; index >= 0; index--) {
    const point = series[index];
    if ((!date || point.date <= date) && Number.isFinite(point.close) && point.close > 0) return point.close;
  }
  return null;
}
