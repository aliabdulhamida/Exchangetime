export type LegType = 'stock' | 'call' | 'put';
export type LegSide = 'long' | 'short';
export type PnlDisplayMode = 'total' | 'per_share' | 'per_contract';

export interface OptionLeg {
  id: string;
  type: LegType;
  side: LegSide;
  strike?: number;
  premium: number;
  qty: number;
  multiplier?: number;
  entryPrice?: number;
}

export interface NormalizedOptionLeg extends OptionLeg {
  multiplier: number;
}

export interface TradingCostInput {
  feePerContract?: number;
  feePerShare?: number;
  slippagePct?: number;
}

export interface ChartDomain {
  min: number;
  max: number;
}

export interface CurvePoint {
  price: number;
  pnl: number;
}

export interface ScenarioRow {
  key: string;
  movePct: number;
  price: number;
  pnl: number;
}

export interface PayoffEnvelope {
  maxProfit: number;
  maxLoss: number;
  unboundedProfit: boolean;
  unboundedLoss: boolean;
}

export interface PnlScaler {
  divisor: number;
  scale: (value: number) => number;
}

export interface PriceInterval {
  lower: number | null;
  upper: number | null;
}

export interface LognormalInput {
  spot: number;
  volatility: number;
  riskFreeRate: number;
  dividendYield: number;
  timeToExpiryYears: number;
}

export interface EarlyExerciseLegRisk {
  legId: string;
  strike: number;
  intrinsicValue: number;
  extrinsicValue: number;
}

export type StrategyPresetKey =
  | 'long_call'
  | 'long_put'
  | 'covered_call'
  | 'cash_secured_put'
  | 'bull_call_spread'
  | 'bear_put_spread'
  | 'straddle'
  | 'strangle'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'ratio_call_spread'
  | 'custom';

export const STRATEGY_PRESET_LABEL: Record<Exclude<StrategyPresetKey, 'custom'>, string> = {
  long_call: 'Long Call',
  long_put: 'Long Put',
  covered_call: 'Covered Call',
  cash_secured_put: 'Cash-Secured Put',
  bull_call_spread: 'Bull Call Spread',
  bear_put_spread: 'Bear Put Spread',
  straddle: 'Long Straddle',
  strangle: 'Long Strangle',
  iron_condor: 'Iron Condor',
  iron_butterfly: 'Iron Butterfly',
  ratio_call_spread: 'Ratio Call Spread',
};

export const OPTION_CONTRACT_MULTIPLIER = 100;

function clampNumber(value: number, minValue = 0): number {
  if (!Number.isFinite(value)) return minValue;
  return Math.max(minValue, value);
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function signedDirection(side: LegSide): 1 | -1 {
  return side === 'long' ? 1 : -1;
}

function toStrike(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Math.max(0.01, value);
}

function defaultMultiplier(type: LegType): number {
  return type === 'stock' ? 1 : OPTION_CONTRACT_MULTIPLIER;
}

export function normalizeLeg(leg: OptionLeg): NormalizedOptionLeg {
  const type: LegType = leg.type === 'stock' || leg.type === 'call' || leg.type === 'put' ? leg.type : 'call';
  const side: LegSide = leg.side === 'short' ? 'short' : 'long';
  const qty = Math.max(1, Math.round(clampNumber(leg.qty, 1)));
  const multiplier = Math.max(
    1,
    Math.round(clampNumber(leg.multiplier ?? defaultMultiplier(type), 1)),
  );
  const premium = clampNumber(leg.premium, 0);

  return {
    ...leg,
    type,
    side,
    qty,
    multiplier,
    premium,
    strike: type === 'stock' ? undefined : toStrike(leg.strike),
    entryPrice: leg.entryPrice !== undefined ? clampNumber(leg.entryPrice, 0) : undefined,
  };
}

export function normalizeLegs(legs: OptionLeg[]): NormalizedOptionLeg[] {
  return legs.map(normalizeLeg);
}

function stockBasis(leg: NormalizedOptionLeg): number {
  return clampNumber(leg.entryPrice ?? leg.premium, 0);
}

function legPayoffPerShareAtExpiry(underlyingPrice: number, leg: NormalizedOptionLeg): number {
  const s = clampNumber(underlyingPrice, 0);
  const direction = signedDirection(leg.side);

  if (leg.type === 'stock') {
    return direction * (s - stockBasis(leg));
  }

  const strike = clampNumber(leg.strike ?? 0.01, 0.01);
  const intrinsic = leg.type === 'call' ? Math.max(s - strike, 0) : Math.max(strike - s, 0);
  return direction * (intrinsic - leg.premium);
}

export function payoffAtExpiry(underlyingPrice: number, legs: OptionLeg[]): number {
  const normalized = normalizeLegs(legs);
  return normalized.reduce((sum, leg) => {
    const perShare = legPayoffPerShareAtExpiry(underlyingPrice, leg);
    return sum + perShare * leg.qty * leg.multiplier;
  }, 0);
}

export function calculateTradingCosts(legs: OptionLeg[], costs: TradingCostInput): number {
  const normalized = normalizeLegs(legs);
  const feePerContract = clampNumber(costs.feePerContract ?? 0, 0);
  const feePerShare = clampNumber(costs.feePerShare ?? 0, 0);
  const slippagePct = clampNumber(costs.slippagePct ?? 0, 0);

  let optionContracts = 0;
  let stockShares = 0;
  let entryNotional = 0;

  for (const leg of normalized) {
    if (leg.type === 'stock') {
      const shares = leg.qty * leg.multiplier;
      stockShares += shares;
      entryNotional += stockBasis(leg) * shares;
      continue;
    }

    optionContracts += leg.qty;
    entryNotional += leg.premium * leg.qty * leg.multiplier;
  }

  const roundTripFees = optionContracts * feePerContract * 2 + stockShares * feePerShare * 2;
  const slippage = entryNotional * (slippagePct / 100);
  return roundToCents(roundTripFees + slippage);
}

export function payoffAtExpiryAfterCosts(
  underlyingPrice: number,
  legs: OptionLeg[],
  costs: TradingCostInput,
): number {
  return payoffAtExpiry(underlyingPrice, legs) - calculateTradingCosts(legs, costs);
}

export function inferPayoffDomain(spot: number, legs: OptionLeg[], rangePct: number): ChartDomain {
  const s = clampNumber(spot, 1);
  const safeRangePct = Number.isFinite(rangePct) ? rangePct : 20;
  const range = Math.max(0.05, Math.max(5, safeRangePct) / 100);
  void legs;
  const domainMin = Math.max(0.01, s * (1 - range));
  const domainMax = Math.max(domainMin + 0.01, s * (1 + range));

  if (domainMax <= domainMin) {
    return { min: Math.max(0, s * 0.8), max: Math.max(1, s * 1.2) };
  }

  return {
    min: domainMin,
    max: domainMax,
  };
}

export function sampleCurve(
  domain: ChartDomain,
  points: number,
  valueAtPrice: (price: number) => number,
): CurvePoint[] {
  const safePoints = Math.min(1000, Math.max(25, Math.round(points)));
  const minPrice = clampNumber(domain.min, 0);
  const maxPrice = Math.max(minPrice + 0.01, clampNumber(domain.max, minPrice + 0.01));

  return Array.from({ length: safePoints }, (_, index) => {
    const ratio = index / (safePoints - 1);
    const price = minPrice + (maxPrice - minPrice) * ratio;
    return {
      price,
      pnl: valueAtPrice(price),
    };
  });
}

export function samplePayoffCurveAtExpiry(
  legs: OptionLeg[],
  domain: ChartDomain,
  points: number,
  costs: TradingCostInput,
): CurvePoint[] {
  return sampleCurve(domain, points, (price) => payoffAtExpiryAfterCosts(price, legs, costs));
}

export function interpolateCurvePnl(curve: CurvePoint[], price: number): number {
  if (curve.length === 0) return 0;
  if (price <= curve[0].price) return curve[0].pnl;
  if (price >= curve[curve.length - 1].price) return curve[curve.length - 1].pnl;

  let low = 0;
  let high = curve.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (curve[mid].price < price) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const rightIndex = Math.min(curve.length - 1, low);
  const leftIndex = Math.max(0, rightIndex - 1);
  const left = curve[leftIndex];
  const right = curve[rightIndex];
  const span = right.price - left.price;
  if (span <= 0) return left.pnl;
  const ratio = (price - left.price) / span;
  return left.pnl + (right.pnl - left.pnl) * ratio;
}

export function deriveBreakEvens(curve: CurvePoint[]): number[] {
  if (curve.length < 2) return [];
  const roots: number[] = [];

  for (let index = 0; index < curve.length - 1; index += 1) {
    const left = curve[index];
    const right = curve[index + 1];

    if (left.pnl === 0) roots.push(left.price);

    if (left.pnl * right.pnl < 0) {
      const slope = right.pnl - left.pnl;
      if (slope !== 0) {
        const t = -left.pnl / slope;
        roots.push(left.price + (right.price - left.price) * t);
      }
    }
  }

  const deduped = roots
    .sort((a, b) => a - b)
    .filter((value, index, list) => index === 0 || Math.abs(value - list[index - 1]) > 0.05)
    .map((value) => roundToCents(value));

  return deduped;
}

function highSideSlope(legs: NormalizedOptionLeg[]): number {
  return legs.reduce((sum, leg) => {
    const scale = leg.qty * leg.multiplier;
    if (leg.type === 'stock') return sum + signedDirection(leg.side) * scale;
    if (leg.type === 'call') return sum + signedDirection(leg.side) * scale;
    return sum;
  }, 0);
}

export function summarizePayoffEnvelope(curve: CurvePoint[], legs: OptionLeg[]): PayoffEnvelope {
  if (curve.length === 0) {
    return {
      maxProfit: 0,
      maxLoss: 0,
      unboundedProfit: false,
      unboundedLoss: false,
    };
  }

  const normalized = normalizeLegs(legs);
  const maxSample = Math.max(...curve.map((point) => point.pnl));
  const minSample = Math.min(...curve.map((point) => point.pnl));

  const slope = highSideSlope(normalized);
  const unboundedProfit = slope > 0;
  const unboundedLoss = slope < 0;

  return {
    maxProfit: unboundedProfit ? Number.POSITIVE_INFINITY : maxSample,
    maxLoss: unboundedLoss ? Number.NEGATIVE_INFINITY : minSample,
    unboundedProfit,
    unboundedLoss,
  };
}

export function positionNotionalAtSpot(spot: number, legs: OptionLeg[]): number {
  const s = clampNumber(spot, 0);
  return normalizeLegs(legs).reduce((sum, leg) => sum + Math.abs(s * leg.qty * leg.multiplier), 0);
}

export function grossShareCount(legs: OptionLeg[]): number {
  return normalizeLegs(legs).reduce((sum, leg) => sum + Math.abs(leg.qty * leg.multiplier), 0);
}

export function optionContractCount(legs: OptionLeg[]): number {
  return normalizeLegs(legs)
    .filter((leg) => leg.type !== 'stock')
    .reduce((sum, leg) => sum + Math.abs(leg.qty), 0);
}

export function pnlDisplayDivisor(mode: PnlDisplayMode, legs: OptionLeg[]): number {
  if (mode === 'total') return 1;
  if (mode === 'per_share') return Math.max(1, grossShareCount(legs));

  const optionContracts = optionContractCount(legs);
  return Math.max(1, optionContracts);
}

export function scalePnl(value: number, mode: PnlDisplayMode, legs: OptionLeg[]): number {
  return value / pnlDisplayDivisor(mode, legs);
}

export function createPnlScaler(mode: PnlDisplayMode, legs: OptionLeg[]): PnlScaler {
  const divisor = pnlDisplayDivisor(mode, legs);
  return {
    divisor,
    scale: (value: number) => value / divisor,
  };
}

export function pnlDisplayLabel(mode: PnlDisplayMode): string {
  if (mode === 'per_share') return 'Per Share';
  if (mode === 'per_contract') return 'Per Option Contract';
  return 'Total';
}

const SCENARIO_FACTORS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1] as const;

export function scenarioRowsFromCurve(
  curve: CurvePoint[],
  spot: number,
  scenarioRangePct: number,
): ScenarioRow[] {
  if (curve.length === 0) return [];

  const s = clampNumber(spot, 0.01);
  const domainMin = curve[0].price;
  const domainMax = curve[curve.length - 1].price;
  const safeRangePct = Number.isFinite(scenarioRangePct) ? scenarioRangePct : 20;
  const range = Math.max(5, safeRangePct);

  return SCENARIO_FACTORS.map((factor) => {
    const targetMovePct = factor * range;
    const targetPrice = s * (1 + targetMovePct / 100);
    const price = Math.max(domainMin, Math.min(domainMax, targetPrice));
    const movePct = s > 0 ? ((price - s) / s) * 100 : targetMovePct;
    const pnl = interpolateCurvePnl(curve, price);

    return {
      key: `${factor}-${price.toFixed(4)}`,
      movePct,
      price,
      pnl,
    };
  });
}

function erfApprox(value: number): number {
  const sign = value >= 0 ? 1 : -1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

export function normalCdf(value: number): number {
  return 0.5 * (1 + erfApprox(value / Math.SQRT2));
}

export function lognormalCdfAtPrice(price: number, input: LognormalInput): number {
  const safePrice = clampNumber(price, 0);
  if (safePrice <= 0) return 0;

  const safeSpot = clampNumber(input.spot, 0.01);
  const safeTime = Math.max(0, input.timeToExpiryYears);
  const safeVol = Math.max(0, input.volatility);
  const drift = input.riskFreeRate - input.dividendYield;

  if (safeTime <= 0 || safeVol <= 0) {
    const terminalSpot = safeSpot * Math.exp(drift * safeTime);
    return terminalSpot <= safePrice ? 1 : 0;
  }

  const sigmaT = safeVol * Math.sqrt(safeTime);
  const mu = Math.log(safeSpot) + (drift - 0.5 * safeVol * safeVol) * safeTime;
  const z = (Math.log(safePrice) - mu) / sigmaT;
  return Math.max(0, Math.min(1, normalCdf(z)));
}

function crossingPrice(x0: number, y0: number, x1: number, y1: number): number {
  if (y0 === 0) return x0;
  if (y1 === 0) return x1;
  const denom = y1 - y0;
  if (denom === 0) return x0;
  return x0 - (y0 * (x1 - x0)) / denom;
}

export function profitableIntervalsFromCurve(curve: CurvePoint[]): PriceInterval[] {
  if (curve.length < 2) return [];

  const intervals: PriceInterval[] = [];
  let open = curve[0].pnl > 0;
  let currentLower: number | null = open ? null : null;

  for (let index = 0; index < curve.length - 1; index += 1) {
    const left = curve[index];
    const right = curve[index + 1];
    const leftPositive = left.pnl > 0;
    const rightPositive = right.pnl > 0;

    if (!open && !leftPositive && rightPositive) {
      currentLower = crossingPrice(left.price, left.pnl, right.price, right.pnl);
      open = true;
      continue;
    }

    if (open && leftPositive && !rightPositive) {
      const upper = crossingPrice(left.price, left.pnl, right.price, right.pnl);
      intervals.push({ lower: currentLower, upper });
      open = false;
      currentLower = null;
      continue;
    }

    if (!open && left.pnl === 0 && rightPositive) {
      currentLower = left.price;
      open = true;
      continue;
    }

    if (open && leftPositive && right.pnl === 0) {
      intervals.push({ lower: currentLower, upper: right.price });
      open = false;
      currentLower = null;
    }
  }

  if (open) {
    intervals.push({ lower: currentLower, upper: null });
  }

  return intervals
    .filter((interval) => interval.lower !== interval.upper)
    .map((interval) => ({
      lower: interval.lower !== null ? Math.max(0, interval.lower) : null,
      upper: interval.upper !== null ? Math.max(0, interval.upper) : null,
    }));
}

export function probabilityOfProfitAtExpiry(
  intervals: PriceInterval[],
  input: LognormalInput,
): number {
  if (intervals.length === 0) return 0;

  const probability = intervals.reduce((sum, interval) => {
    const lowerCdf = interval.lower === null ? 0 : lognormalCdfAtPrice(interval.lower, input);
    const upperCdf = interval.upper === null ? 1 : lognormalCdfAtPrice(interval.upper, input);
    return sum + Math.max(0, upperCdf - lowerCdf);
  }, 0);

  return Math.max(0, Math.min(1, probability));
}

export function detectShortCallEarlyExerciseRisks(
  legs: OptionLeg[],
  spot: number,
  dividendYield: number,
  dteDays: number,
  modelPriceByLegId: Record<string, number>,
): EarlyExerciseLegRisk[] {
  const normalized = normalizeLegs(legs);
  if (dividendYield <= 0 || dteDays < 2) {
    return [];
  }

  const safeSpot = clampNumber(spot, 0.01);

  return normalized
    .filter((leg) => leg.type === 'call' && leg.side === 'short')
    .flatMap((leg) => {
      const strike = clampNumber(leg.strike ?? safeSpot, 0.01);
      const intrinsic = Math.max(safeSpot - strike, 0);
      if (intrinsic <= 0) {
        return [];
      }

      const modelPrice = clampNumber(modelPriceByLegId[leg.id] ?? leg.premium, leg.premium);
      const extrinsic = Math.max(0, modelPrice - intrinsic);
      const deepItm = safeSpot > strike * 1.03;
      const lowExtrinsic = extrinsic <= Math.max(0.05, safeSpot * 0.0025);
      const elevated = deepItm || lowExtrinsic;

      return elevated
        ? [
            {
              legId: leg.id,
              strike,
              intrinsicValue: intrinsic,
              extrinsicValue: extrinsic,
            },
          ]
        : [];
    });
}

function roundedStrike(value: number): number {
  const base = Math.max(1, value);
  return Math.round(base);
}

export function createPresetLegs(
  preset: Exclude<StrategyPresetKey, 'custom'>,
  spot: number,
): OptionLeg[] {
  const s = clampNumber(spot, 100);
  const atm = roundedStrike(s);
  const lower = roundedStrike(s * 0.95);
  const lowerWide = roundedStrike(s * 0.9);
  const upper = roundedStrike(s * 1.05);
  const upperWide = roundedStrike(s * 1.1);

  if (preset === 'long_call') {
    return [
      {
        id: 'leg-long-call',
        type: 'call',
        side: 'long',
        strike: upper,
        premium: 4.2,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'long_put') {
    return [
      {
        id: 'leg-long-put',
        type: 'put',
        side: 'long',
        strike: lower,
        premium: 3.8,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'covered_call') {
    return [
      {
        id: 'leg-covered-stock',
        type: 'stock',
        side: 'long',
        premium: roundToCents(s * 0.98),
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-covered-short-call',
        type: 'call',
        side: 'short',
        strike: upper,
        premium: 2.3,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'cash_secured_put') {
    return [
      {
        id: 'leg-csp-short-put',
        type: 'put',
        side: 'short',
        strike: lower,
        premium: 2.9,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'bull_call_spread') {
    return [
      {
        id: 'leg-bull-long-call',
        type: 'call',
        side: 'long',
        strike: atm,
        premium: 5.1,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-bull-short-call',
        type: 'call',
        side: 'short',
        strike: upper,
        premium: 2.4,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'bear_put_spread') {
    return [
      {
        id: 'leg-bear-long-put',
        type: 'put',
        side: 'long',
        strike: atm,
        premium: 5.3,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-bear-short-put',
        type: 'put',
        side: 'short',
        strike: lower,
        premium: 2.7,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'straddle') {
    return [
      {
        id: 'leg-straddle-call',
        type: 'call',
        side: 'long',
        strike: atm,
        premium: 4.4,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-straddle-put',
        type: 'put',
        side: 'long',
        strike: atm,
        premium: 4.2,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'strangle') {
    return [
      {
        id: 'leg-strangle-put',
        type: 'put',
        side: 'long',
        strike: lower,
        premium: 2.6,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-strangle-call',
        type: 'call',
        side: 'long',
        strike: upper,
        premium: 2.4,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'iron_condor') {
    return [
      {
        id: 'leg-condor-long-put',
        type: 'put',
        side: 'long',
        strike: lowerWide,
        premium: 1.1,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-condor-short-put',
        type: 'put',
        side: 'short',
        strike: lower,
        premium: 2.2,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-condor-short-call',
        type: 'call',
        side: 'short',
        strike: upper,
        premium: 2.1,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-condor-long-call',
        type: 'call',
        side: 'long',
        strike: upperWide,
        premium: 1.0,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  if (preset === 'iron_butterfly') {
    return [
      {
        id: 'leg-fly-long-put',
        type: 'put',
        side: 'long',
        strike: lower,
        premium: 1.5,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-fly-short-put',
        type: 'put',
        side: 'short',
        strike: atm,
        premium: 3.1,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-fly-short-call',
        type: 'call',
        side: 'short',
        strike: atm,
        premium: 3.0,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
      {
        id: 'leg-fly-long-call',
        type: 'call',
        side: 'long',
        strike: upper,
        premium: 1.4,
        qty: 1,
        multiplier: OPTION_CONTRACT_MULTIPLIER,
      },
    ];
  }

  return [
    {
      id: 'leg-ratio-long-call',
      type: 'call',
      side: 'long',
      strike: atm,
      premium: 4.8,
      qty: 1,
      multiplier: OPTION_CONTRACT_MULTIPLIER,
    },
    {
      id: 'leg-ratio-short-call',
      type: 'call',
      side: 'short',
      strike: upper,
      premium: 2.3,
      qty: 2,
      multiplier: OPTION_CONTRACT_MULTIPLIER,
    },
  ];
}

export function createCurrencyFormatter(
  currency: string,
  locale = 'en-US',
): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
}

export function createPercentFormatter(locale = 'en-US'): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
