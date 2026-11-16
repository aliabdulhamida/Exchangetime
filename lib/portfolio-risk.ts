export type PortfolioObservation = { date: string; value: number };
export type DatedAmount = { date: string; amount: number };

export function comparePortfolio(portfolio: PortfolioObservation[], benchmark: PortfolioObservation[]) {
  const prices = new Map(benchmark.map(point => [point.date, point.value]));
  const shared = portfolio.flatMap(point => {
    const price = prices.get(point.date);
    return price !== undefined && price > 0 && Number.isFinite(price) && Number.isFinite(point.value) && point.value >= 0
      ? [{ date: point.date, portfolio: point.value, benchmark: price }]
      : [];
  });
  if (shared.length < 2 || shared[0].portfolio <= 0) return [];
  const first = shared[0];
  return shared.map(point => ({
    date: point.date,
    portfolio: 100 * (point.portfolio / first.portfolio),
    benchmark: 100 * (point.benchmark / first.benchmark),
  }));
}

export function portfolioReturnIndex(
  history: PortfolioObservation[],
  flows: DatedAmount[],
  income: DatedAmount[] = [],
) {
  const observations = history
    .filter((point) => Number.isFinite(point.value))
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  if (!observations.length) return [];
  let index = 100;
  return observations.map((point, position) => {
    if (position === 0) return { ...point, value: index };
    const previous = observations[position - 1];
    if (previous.value <= 0) return { ...point, value: index };
    const flow = flows
      .filter((item) => item.date > previous.date && item.date <= point.date)
      .reduce((sum, item) => sum + item.amount, 0);
    const distributions = income
      .filter((item) => item.date > previous.date && item.date <= point.date)
      .reduce((sum, item) => sum + item.amount, 0);
    index *= 1 + (point.value - previous.value - flow + distributions) / previous.value;
    return { date: point.date, value: index };
  });
}

export function portfolioRisk(index: PortfolioObservation[], riskFreePct = 0) {
  const returns = index
    .slice(1)
    .flatMap((point, position) =>
      index[position].value > 0 ? [point.value / index[position].value - 1] : [],
    );
  const years =
    index.length > 1
      ? (Date.parse(index[index.length - 1].date) - Date.parse(index[0].date)) / (365.25 * 86400000)
      : 0;
  const enough = returns.length >= 20 && years > 0;
  const periods = years > 0 ? returns.length / years : 0;
  const mean = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)
      : 0;
  const volatility = enough ? Math.sqrt(variance * periods) : null;
  const periodRiskFree = periods > 0 ? Math.pow(1 + riskFreePct / 100, 1 / periods) - 1 : 0;
  const downside = returns.length
    ? Math.sqrt(
        (returns.reduce((sum, value) => sum + Math.min(0, value - periodRiskFree) ** 2, 0) /
          returns.length) *
          periods,
      )
    : 0;
  let peak = index[0]?.value || 100;
  let drawdown = 0;
  index.forEach((point) => {
    peak = Math.max(peak, point.value);
    if (peak > 0) drawdown = Math.min(drawdown, point.value / peak - 1);
  });
  const final = index[index.length - 1]?.value;
  const initial = index[0]?.value;
  const total = index.length > 1 && initial > 0 && Number.isFinite(final) ? final / initial - 1 : null;
  return {
    totalReturnPct: total === null ? null : total * 100,
    cagrPct:
      enough && total !== null && total >= -1 ? (Math.pow(1 + total, 1 / years) - 1) * 100 : null,
    volatilityPct: volatility === null ? null : volatility * 100,
    sharpe:
      volatility && volatility > 1e-10 ? ((mean - periodRiskFree) * periods) / volatility : null,
    sortino: enough && downside > 1e-10 ? ((mean - periodRiskFree) * periods) / downside : null,
    maxDrawdownPct: index.length > 1 ? drawdown * 100 : null,
    observations: returns.length,
  };
}
