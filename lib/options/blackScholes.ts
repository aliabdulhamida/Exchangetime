export type OptionFlavor = 'call' | 'put';

export interface BlackScholesInput {
  type: OptionFlavor;
  spot: number;
  strike: number;
  timeToExpiryYears: number;
  volatility: number;
  riskFreeRate: number;
  dividendYield: number;
}

export interface BlackScholesResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  d1: number;
  d2: number;
}

function erfApprox(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erfApprox(x / Math.SQRT2));
}

function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function intrinsicValue(type: OptionFlavor, spot: number, strike: number): number {
  if (type === 'call') return Math.max(spot - strike, 0);
  return Math.max(strike - spot, 0);
}

function deterministicDelta(type: OptionFlavor, spot: number, strike: number): number {
  if (type === 'call') {
    return spot > strike ? 1 : 0;
  }
  return spot < strike ? -1 : 0;
}

export function blackScholes(input: BlackScholesInput): BlackScholesResult {
  const type: OptionFlavor = input.type === 'put' ? 'put' : 'call';
  const spot = Math.max(input.spot, 0.0001);
  const strike = Math.max(input.strike, 0.0001);
  const timeToExpiryYears = Math.max(input.timeToExpiryYears, 0);
  const volatility = Math.max(input.volatility, 0);
  const riskFreeRate = input.riskFreeRate;
  const dividendYield = input.dividendYield;

  if (timeToExpiryYears <= 0 || volatility <= 0) {
    return {
      price: intrinsicValue(type, spot, strike),
      delta: deterministicDelta(type, spot, strike),
      gamma: 0,
      theta: 0,
      vega: 0,
      d1: 0,
      d2: 0,
    };
  }

  const sqrtT = Math.sqrt(timeToExpiryYears);
  const sigmaSqrtT = volatility * sqrtT;
  const discountedSpot = spot * Math.exp(-dividendYield * timeToExpiryYears);
  const discountedStrike = strike * Math.exp(-riskFreeRate * timeToExpiryYears);

  const d1Numerator =
    Math.log(spot / strike) + (riskFreeRate - dividendYield + 0.5 * volatility * volatility) * timeToExpiryYears;
  const d1 = d1Numerator / sigmaSqrtT;
  const d2 = d1 - sigmaSqrtT;

  const callPrice = discountedSpot * normalCdf(d1) - discountedStrike * normalCdf(d2);
  const putPrice = discountedStrike * normalCdf(-d2) - discountedSpot * normalCdf(-d1);
  const price = type === 'call' ? callPrice : putPrice;

  const delta =
    type === 'call'
      ? Math.exp(-dividendYield * timeToExpiryYears) * normalCdf(d1)
      : Math.exp(-dividendYield * timeToExpiryYears) * (normalCdf(d1) - 1);

  const gamma = (Math.exp(-dividendYield * timeToExpiryYears) * normalPdf(d1)) / (spot * sigmaSqrtT);

  const vegaAnnual = spot * Math.exp(-dividendYield * timeToExpiryYears) * normalPdf(d1) * sqrtT;
  const vega = vegaAnnual / 100;

  const callThetaAnnual =
    (-spot * Math.exp(-dividendYield * timeToExpiryYears) * normalPdf(d1) * volatility) / (2 * sqrtT) -
    riskFreeRate * discountedStrike * normalCdf(d2) +
    dividendYield * discountedSpot * normalCdf(d1);
  const putThetaAnnual =
    (-spot * Math.exp(-dividendYield * timeToExpiryYears) * normalPdf(d1) * volatility) / (2 * sqrtT) +
    riskFreeRate * discountedStrike * normalCdf(-d2) -
    dividendYield * discountedSpot * normalCdf(-d1);

  return {
    price,
    delta,
    gamma,
    theta: (type === 'call' ? callThetaAnnual : putThetaAnnual) / 365,
    vega,
    d1,
    d2,
  };
}
