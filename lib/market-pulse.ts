type Series = {prices: number[]; timestamps: number[]};

function dailyPrices(series?: Series) {
  const days = new Map<string, number>();
  series?.prices.forEach((price, index) => {
    const stamp = series.timestamps[index];
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(stamp) || stamp <= 0 || stamp > 8.64e15) return;
    days.set(new Date(stamp).toISOString().slice(0, 10), price);
  });
  return days;
}

export function calculateMarketPulse(spy?: Series, volatility?: Series, sectors: (Series | undefined)[] = []) {
  const index = dailyPrices(spy);
  const vixPrices = dailyPrices(volatility);
  const sectorPrices = sectors.map(dailyPrices);
  const dates = [...index.keys()].sort();
  const changesOn = (date: string) => sectorPrices.flatMap(prices => {
    const close = prices.get(date);
    const previous = [...prices.keys()].filter(day => day < date).sort().at(-1);
    return close !== undefined && previous ? [close / prices.get(previous)! - 1] : [];
  });
  const date = [...dates].reverse().find(day => vixPrices.has(day) && changesOn(day).length >= 8) ?? dates.at(-1);
  const changes = date ? changesOn(date) : [];
  const sectorCount = changes.length;
  const breadth = sectorCount >= 8 ? changes.filter(value => value > 0).length / sectorCount * 100 : null;
  const history = date ? dates.filter(day => day <= date).slice(-50).map(day => index.get(day)!) : [];
  const sma = history.length === 50 ? history.reduce((sum, price) => sum + price, 0) / 50 : null;
  const positiveTrend = sma !== null && history.at(-1)! > sma;
  const vix = date ? vixPrices.get(date) : undefined;
  const score = breadth !== null && sma !== null && vix !== undefined ?
    Math.round(breadth * .4 + (positiveTrend ? 30 : 0) + (vix < 20 ? 30 : vix < 30 ? 15 : 0)) : null;
  const missing = [
    ...(!date ? ['S&P 500 observations unavailable'] : []),
    ...(date && sma === null ? ['S&P 500 needs 50 daily observations'] : []),
    ...(sectorCount < 8 ? ['Sector coverage: ' + sectorCount + '/8 required'] : []),
    ...(vix === undefined ? ['VIX unavailable for the selected session'] : []),
  ];
  return {asOf: date ?? null, sectorCount, breadth, sma, positiveTrend, vix, score, missing};
}
