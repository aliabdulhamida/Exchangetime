'use client';

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Copy,
  FileUp,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { blackScholes } from '@/lib/options/blackScholes';
import {
  calculateTradingCosts,
  createPnlScaler,
  createCurrencyFormatter,
  createPercentFormatter,
  createPresetLegs,
  detectShortCallEarlyExerciseRisks,
  deriveBreakEvens,
  inferPayoffDomain,
  normalizeLeg,
  normalizeLegs,
  optionContractCount,
  payoffAtExpiryAfterCosts,
  pnlDisplayLabel,
  positionNotionalAtSpot,
  probabilityOfProfitAtExpiry,
  profitableIntervalsFromCurve,
  sampleCurve,
  samplePayoffCurveAtExpiry,
  scenarioRowsFromCurve,
  STRATEGY_PRESET_LABEL,
  summarizePayoffEnvelope,
  type OptionLeg,
  type PnlDisplayMode,
  type StrategyPresetKey,
  type TradingCostInput,
} from '@/lib/options/payoff';

type ValuationView = 'expiry' | 'today';

interface PersistedLabState {
  spot: number;
  expiryPrice: number;
  scenarioRangePct: number;
  displayMode: PnlDisplayMode;
  presetKey: StrategyPresetKey;
  legs: OptionLeg[];
  expiryDate: string;
  asOfDateTime: string;
  valuationView: ValuationView;
  valuationHorizonDays: number;
  volatilityPct: number;
  riskFreeRatePct: number;
  dividendYieldPct: number;
  feePerContract: number;
  feePerShare: number;
  slippagePct: number;
  stressMode: StressMode;
  stressSpotSteps: number;
  ivShockRangePct: number;
  ivShockSteps: number;
  timeShockMaxDays: number;
  timeShockSteps: number;
  includePremiumCreditInCashNeeded: boolean;
}

interface GreekRow {
  id: string;
  label: string;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  modelPrice: number;
}

type StressMode = 'spot_iv' | 'spot_time';

const SETTINGS_STORAGE_KEY = 'exchangetime.options-payoff-lab.v3.settings';

const DEFAULT_SPOT = 185;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_VOLATILITY_PCT = 25;
const DEFAULT_RISK_FREE_RATE_PCT = 4;
const DEFAULT_DIVIDEND_YIELD_PCT = 0.5;
const DEFAULT_DTE_DAYS = 30;

function clampNumber(value: number, fallback: number, min = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function clampInt(value: number, fallback: number, min = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.round(value));
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocalValue(date: Date): string {
  const localOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

function parseExpiryDateInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateTimeLocalInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function legLabel(leg: OptionLeg): string {
  const side = leg.side === 'long' ? 'Long' : 'Short';
  if (leg.type === 'stock') return `${side} Stock`;
  return `${side} ${leg.type === 'call' ? 'Call' : 'Put'} @ ${leg.strike ?? '-'}`;
}

function intrinsicOptionValue(type: 'call' | 'put', spot: number, strike: number): number {
  if (type === 'call') return Math.max(spot - strike, 0);
  return Math.max(strike - spot, 0);
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

interface ModelPricingInput {
  spot: number;
  timeToExpiryYears: number;
  volatility: number;
  riskFreeRate: number;
  dividendYield: number;
}

function modelPricePerShare(leg: OptionLeg, input: ModelPricingInput): number {
  if (leg.type === 'stock') return input.spot;

  const strike = leg.strike ?? input.spot;
  if (input.timeToExpiryYears <= 0 || input.volatility <= 0) {
    return intrinsicOptionValue(leg.type, input.spot, strike);
  }

  return blackScholes({
    type: leg.type,
    spot: input.spot,
    strike,
    timeToExpiryYears: input.timeToExpiryYears,
    volatility: input.volatility,
    riskFreeRate: input.riskFreeRate,
    dividendYield: input.dividendYield,
  }).price;
}

const presetOptions = Object.entries(STRATEGY_PRESET_LABEL).map(([key, label]) => ({
  key: key as Exclude<StrategyPresetKey, 'custom'>,
  label,
}));

function applyModelDefaultsToPresetLegs(
  preset: Exclude<StrategyPresetKey, 'custom'>,
  spot: number,
  pricing: ModelPricingInput,
): OptionLeg[] {
  return createPresetLegs(preset, spot).map((leg) => {
    const normalized = normalizeLeg(leg);
    if (normalized.type === 'stock') {
      const basis = roundToCents(spot);
      return normalizeLeg({ ...normalized, premium: basis, entryPrice: basis });
    }

    const modelPx = modelPricePerShare(normalized, pricing);
    return normalizeLeg({ ...normalized, premium: roundToCents(modelPx) });
  });
}

export default function OptionsPayoffLab({ onClose: _onClose }: { onClose?: () => void }) {
  const [mobilePanel, setMobilePanel] = useState<'inputs' | 'results'>('inputs');
  const [desktopPanel, setDesktopPanel] = useState<'inputs' | 'results'>('inputs');
  const [showMobileAdvancedResults, setShowMobileAdvancedResults] = useState(false);
  const [spot, setSpot] = useState(DEFAULT_SPOT);
  const [expiryPrice, setExpiryPrice] = useState(DEFAULT_SPOT);
  const [scenarioRangePct, setScenarioRangePct] = useState(20);
  const [displayMode, setDisplayMode] = useState<PnlDisplayMode>('total');
  const [presetKey, setPresetKey] = useState<StrategyPresetKey>('long_call');
  const [legs, setLegs] = useState<OptionLeg[]>(() =>
    applyModelDefaultsToPresetLegs('long_call', DEFAULT_SPOT, {
      spot: DEFAULT_SPOT,
      timeToExpiryYears: DEFAULT_DTE_DAYS / 365,
      volatility: DEFAULT_VOLATILITY_PCT / 100,
      riskFreeRate: DEFAULT_RISK_FREE_RATE_PCT / 100,
      dividendYield: DEFAULT_DIVIDEND_YIELD_PCT / 100,
    }),
  );

  const nowDefault = useMemo(() => new Date(), []);
  const [expiryDate, setExpiryDate] = useState(() =>
    toDateInputValue(new Date(nowDefault.getTime() + DEFAULT_DTE_DAYS * 24 * 60 * 60 * 1000)),
  );
  const [asOfDateTime, setAsOfDateTime] = useState(() => toDateTimeLocalValue(nowDefault));
  const [valuationView, setValuationView] = useState<ValuationView>('expiry');
  const [valuationHorizonDays, setValuationHorizonDays] = useState(0);

  const [volatilityPct, setVolatilityPct] = useState(DEFAULT_VOLATILITY_PCT);
  const [riskFreeRatePct, setRiskFreeRatePct] = useState(DEFAULT_RISK_FREE_RATE_PCT);
  const [dividendYieldPct, setDividendYieldPct] = useState(DEFAULT_DIVIDEND_YIELD_PCT);

  const [feePerContract, setFeePerContract] = useState(0.65);
  const [feePerShare, setFeePerShare] = useState(0);
  const [slippagePct, setSlippagePct] = useState(0);
  const [stressMode, setStressMode] = useState<StressMode>('spot_iv');
  const [stressSpotSteps, setStressSpotSteps] = useState(3);
  const [ivShockRangePct, setIvShockRangePct] = useState(10);
  const [ivShockSteps, setIvShockSteps] = useState(2);
  const [timeShockMaxDays, setTimeShockMaxDays] = useState(30);
  const [timeShockSteps, setTimeShockSteps] = useState(3);
  const [includePremiumCreditInCashNeeded, setIncludePremiumCreditInCashNeeded] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const currencyFormatter = useMemo(() => createCurrencyFormatter(DEFAULT_CURRENCY), []);
  const percentFormatter = useMemo(() => createPercentFormatter(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawState = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawState) {
        const parsed = JSON.parse(rawState) as Partial<PersistedLabState>;

        if (typeof parsed.spot === 'number') setSpot(clampNumber(parsed.spot, DEFAULT_SPOT, 0.01));
        if (typeof parsed.expiryPrice === 'number')
          setExpiryPrice(clampNumber(parsed.expiryPrice, DEFAULT_SPOT, 0.01));
        if (typeof parsed.scenarioRangePct === 'number')
          setScenarioRangePct(clampInt(parsed.scenarioRangePct, 20, 5));
        if (
          parsed.displayMode === 'total' ||
          parsed.displayMode === 'per_share' ||
          parsed.displayMode === 'per_contract'
        ) {
          setDisplayMode(parsed.displayMode);
        }
        if (parsed.presetKey) {
          setPresetKey(parsed.presetKey);
        }
        if (Array.isArray(parsed.legs) && parsed.legs.length > 0) {
          setLegs(parsed.legs.map(normalizeLeg));
        }
        if (typeof parsed.expiryDate === 'string' && parseExpiryDateInput(parsed.expiryDate)) {
          setExpiryDate(parsed.expiryDate);
        }
        if (typeof parsed.asOfDateTime === 'string' && parseDateTimeLocalInput(parsed.asOfDateTime)) {
          setAsOfDateTime(parsed.asOfDateTime);
        }
        if (parsed.valuationView === 'expiry' || parsed.valuationView === 'today') {
          setValuationView(parsed.valuationView);
        }
        if (typeof parsed.valuationHorizonDays === 'number') {
          setValuationHorizonDays(clampInt(parsed.valuationHorizonDays, 0, 0));
        }
        if (typeof parsed.volatilityPct === 'number') {
          setVolatilityPct(clampNumber(parsed.volatilityPct, DEFAULT_VOLATILITY_PCT, 0));
        }
        if (typeof parsed.riskFreeRatePct === 'number') {
          setRiskFreeRatePct(parsed.riskFreeRatePct);
        }
        if (typeof parsed.dividendYieldPct === 'number') {
          setDividendYieldPct(parsed.dividendYieldPct);
        }
        if (typeof parsed.feePerContract === 'number') {
          setFeePerContract(clampNumber(parsed.feePerContract, 0.65, 0));
        }
        if (typeof parsed.feePerShare === 'number') {
          setFeePerShare(clampNumber(parsed.feePerShare, 0, 0));
        }
        if (typeof parsed.slippagePct === 'number') {
          setSlippagePct(clampNumber(parsed.slippagePct, 0, 0));
        }
        if (parsed.stressMode === 'spot_iv' || parsed.stressMode === 'spot_time') {
          setStressMode(parsed.stressMode);
        }
        if (typeof parsed.stressSpotSteps === 'number') {
          setStressSpotSteps(Math.min(5, Math.max(1, clampInt(parsed.stressSpotSteps, 3, 1))));
        }
        if (typeof parsed.ivShockRangePct === 'number') {
          setIvShockRangePct(Math.min(40, Math.max(1, clampNumber(parsed.ivShockRangePct, 10, 0))));
        }
        if (typeof parsed.ivShockSteps === 'number') {
          setIvShockSteps(Math.min(5, Math.max(1, clampInt(parsed.ivShockSteps, 2, 1))));
        }
        if (typeof parsed.timeShockMaxDays === 'number') {
          setTimeShockMaxDays(Math.min(365, Math.max(1, clampInt(parsed.timeShockMaxDays, 30, 1))));
        }
        if (typeof parsed.timeShockSteps === 'number') {
          setTimeShockSteps(Math.min(5, Math.max(1, clampInt(parsed.timeShockSteps, 3, 1))));
        }
        if (typeof parsed.includePremiumCreditInCashNeeded === 'boolean') {
          setIncludePremiumCreditInCashNeeded(parsed.includePremiumCreditInCashNeeded);
        }
      }

    } catch {
      // Ignore localStorage parsing issues to keep module resilient.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;

    const stateToPersist: PersistedLabState = {
      spot,
      expiryPrice,
      scenarioRangePct,
      displayMode,
      presetKey,
      legs,
      expiryDate,
      asOfDateTime,
      valuationView,
      valuationHorizonDays,
      volatilityPct,
      riskFreeRatePct,
      dividendYieldPct,
      feePerContract,
      feePerShare,
      slippagePct,
      stressMode,
      stressSpotSteps,
      ivShockRangePct,
      ivShockSteps,
      timeShockMaxDays,
      timeShockSteps,
      includePremiumCreditInCashNeeded,
    };

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stateToPersist));
  }, [
    asOfDateTime,
    displayMode,
    dividendYieldPct,
    expiryDate,
    expiryPrice,
    feePerContract,
    feePerShare,
    hydrated,
    legs,
    presetKey,
    riskFreeRatePct,
    scenarioRangePct,
    slippagePct,
    spot,
    stressMode,
    stressSpotSteps,
    ivShockRangePct,
    ivShockSteps,
    timeShockMaxDays,
    timeShockSteps,
    includePremiumCreditInCashNeeded,
    valuationHorizonDays,
    valuationView,
    volatilityPct,
  ]);

  const normalizedLegs = useMemo(() => normalizeLegs(legs), [legs]);

  const tradingCostInput = useMemo<TradingCostInput>(
    () => ({
      feePerContract,
      feePerShare,
      slippagePct,
    }),
    [feePerContract, feePerShare, slippagePct],
  );

  const totalTradingCosts = useMemo(
    () => calculateTradingCosts(normalizedLegs, tradingCostInput),
    [normalizedLegs, tradingCostInput],
  );

  const dte = useMemo(() => {
    const nowDate = parseDateTimeLocalInput(asOfDateTime);
    const expDate = parseExpiryDateInput(expiryDate);
    if (!nowDate || !expDate) return null;
    return Math.max(0, (expDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [asOfDateTime, expiryDate]);

  const effectiveTYears = useMemo(() => {
    if (dte === null) return null;
    return Math.max(0, (dte - valuationHorizonDays) / 365);
  }, [dte, valuationHorizonDays]);

  const asOfYears = useMemo(() => {
    if (dte === null) return 30 / 365;
    return Math.max(0, dte / 365);
  }, [dte]);

  const modelVolatility = useMemo(() => Math.max(0, volatilityPct / 100), [volatilityPct]);
  const modelRiskFreeRate = useMemo(() => riskFreeRatePct / 100, [riskFreeRatePct]);
  const modelDividendYield = useMemo(() => dividendYieldPct / 100, [dividendYieldPct]);

  const domain = useMemo(
    () => inferPayoffDomain(spot, normalizedLegs, scenarioRangePct),
    [normalizedLegs, scenarioRangePct, spot],
  );

  const expiryCurve = useMemo(
    () => samplePayoffCurveAtExpiry(normalizedLegs, domain, 200, tradingCostInput),
    [domain, normalizedLegs, tradingCostInput],
  );

  const markToModelWithInputs = useMemo(() => {
    return (underlyingPrice: number, yearsToExpiry: number, volatility: number): number => {
      const safePrice = Math.max(0, underlyingPrice);
      const safeYears = Math.max(0, yearsToExpiry);
      const safeVolatility = Math.max(0, volatility);

      const modeled = normalizedLegs.reduce((sum, leg) => {
        const direction = leg.side === 'long' ? 1 : -1;
        const size = leg.qty * leg.multiplier;
        const paidPrice = leg.type === 'stock' ? leg.entryPrice ?? leg.premium : leg.premium;
        const modelPx = modelPricePerShare(leg, {
          spot: safePrice,
          timeToExpiryYears: safeYears,
          volatility: safeVolatility,
          riskFreeRate: modelRiskFreeRate,
          dividendYield: modelDividendYield,
        });

        return sum + direction * (modelPx - paidPrice) * size;
      }, 0);

      return modeled - totalTradingCosts;
    };
  }, [modelDividendYield, modelRiskFreeRate, normalizedLegs, totalTradingCosts]);

  const markToModelAtPrice = useMemo(() => {
    return (underlyingPrice: number): number =>
      markToModelWithInputs(underlyingPrice, effectiveTYears ?? 0, modelVolatility);
  }, [effectiveTYears, markToModelWithInputs, modelVolatility]);

  const todayCurve = useMemo(
    () => sampleCurve(domain, 200, markToModelAtPrice),
    [domain, markToModelAtPrice],
  );

  const activeCurve = valuationView === 'expiry' ? expiryCurve : todayCurve;
  const activeBreakEvens = useMemo(() => deriveBreakEvens(activeCurve), [activeCurve]);
  const expiryBreakEvens = useMemo(() => deriveBreakEvens(expiryCurve), [expiryCurve]);
  const todayBreakEvens = useMemo(() => deriveBreakEvens(todayCurve), [todayCurve]);

  const payoffEnvelope = useMemo(
    () => summarizePayoffEnvelope(expiryCurve, normalizedLegs),
    [expiryCurve, normalizedLegs],
  );

  const expiryPnL = useMemo(
    () => payoffAtExpiryAfterCosts(expiryPrice, normalizedLegs, tradingCostInput),
    [expiryPrice, normalizedLegs, tradingCostInput],
  );

  const todayPnL = useMemo(() => markToModelAtPrice(spot), [markToModelAtPrice, spot]);

  const notional = useMemo(() => positionNotionalAtSpot(spot, normalizedLegs), [normalizedLegs, spot]);

  const rrEstimate = useMemo(() => {
    if (!Number.isFinite(payoffEnvelope.maxProfit)) return null;
    if (!Number.isFinite(payoffEnvelope.maxLoss)) return null;
    if (payoffEnvelope.maxLoss >= 0) return null;
    const risk = Math.abs(payoffEnvelope.maxLoss);
    if (risk === 0) return null;
    return payoffEnvelope.maxProfit / risk;
  }, [payoffEnvelope.maxLoss, payoffEnvelope.maxProfit]);

  const pnlScaler = useMemo(() => createPnlScaler(displayMode, normalizedLegs), [displayMode, normalizedLegs]);
  const displayDivisor = pnlScaler.divisor;
  const scalePnlValue = pnlScaler.scale;
  const totalOptionContractsAbs = useMemo(() => optionContractCount(normalizedLegs), [normalizedLegs]);

  const displayLabel = useMemo(() => pnlDisplayLabel(displayMode), [displayMode]);
  const displayDivisorText = useMemo(() => {
    if (displayMode === 'total') return 'No scaling divisor';
    if (displayMode === 'per_share') return `Gross shares (abs): ${displayDivisor}`;
    if (totalOptionContractsAbs > 0) {
      return `Total option contracts (abs): ${totalOptionContractsAbs} (divisor ${displayDivisor})`;
    }
    return 'Total option contracts (abs): 0 (fallback divisor 1 because no option legs)';
  }, [displayDivisor, displayMode, totalOptionContractsAbs]);

  const legModelPriceById = useMemo(() => {
    const map = new Map<string, number>();
    for (const leg of normalizedLegs) {
      const modelPx = modelPricePerShare(leg, {
        spot,
        timeToExpiryYears: asOfYears,
        volatility: modelVolatility,
        riskFreeRate: modelRiskFreeRate,
        dividendYield: modelDividendYield,
      });
      map.set(leg.id, modelPx);
    }
    return map;
  }, [asOfYears, modelDividendYield, modelRiskFreeRate, modelVolatility, normalizedLegs, spot]);

  const paidVsModelAtSpot = useMemo(() => {
    return normalizedLegs.reduce((sum, leg) => {
      const direction = leg.side === 'long' ? 1 : -1;
      const paid = leg.type === 'stock' ? leg.entryPrice ?? leg.premium : leg.premium;
      const modelPx = legModelPriceById.get(leg.id) ?? paid;
      return sum + direction * (modelPx - paid) * leg.qty * leg.multiplier;
    }, 0);
  }, [legModelPriceById, normalizedLegs]);

  const scaledExpiryPnL = useMemo(() => scalePnlValue(expiryPnL), [expiryPnL, scalePnlValue]);
  const scaledTodayPnL = useMemo(() => scalePnlValue(todayPnL), [scalePnlValue, todayPnL]);
  const scaledPaidVsModelAtSpot = useMemo(
    () => scalePnlValue(paidVsModelAtSpot),
    [paidVsModelAtSpot, scalePnlValue],
  );
  const scaledMaxProfit = useMemo(() => {
    if (!Number.isFinite(payoffEnvelope.maxProfit)) return payoffEnvelope.maxProfit;
    return scalePnlValue(payoffEnvelope.maxProfit);
  }, [payoffEnvelope.maxProfit, scalePnlValue]);
  const scaledMaxLoss = useMemo(() => {
    if (!Number.isFinite(payoffEnvelope.maxLoss)) return payoffEnvelope.maxLoss;
    return scalePnlValue(payoffEnvelope.maxLoss);
  }, [payoffEnvelope.maxLoss, scalePnlValue]);
  const scenarioSummaryTotalPnl = useMemo(
    () => (valuationView === 'expiry' ? expiryPnL : markToModelAtPrice(expiryPrice)),
    [valuationView, expiryPnL, markToModelAtPrice, expiryPrice],
  );
  const scenarioSummaryDisplayPnl = useMemo(
    () => scalePnlValue(scenarioSummaryTotalPnl),
    [scalePnlValue, scenarioSummaryTotalPnl],
  );

  const legModelPriceRecord = useMemo(() => {
    const record: Record<string, number> = {};
    for (const [id, value] of legModelPriceById.entries()) {
      record[id] = value;
    }
    return record;
  }, [legModelPriceById]);

  const chartData = useMemo(
    () =>
      activeCurve.map((row) => ({
        price: row.price,
        pnl: scalePnlValue(row.pnl),
      })),
    [activeCurve, scalePnlValue],
  );

  const scenarioRows = useMemo(
    () =>
      scenarioRowsFromCurve(activeCurve, spot, scenarioRangePct).map((row) => ({
        ...row,
        pnlDisplay: scalePnlValue(row.pnl),
      })),
    [activeCurve, scenarioRangePct, scalePnlValue, spot],
  );

  const maxAbsScenarioPnlDisplay = useMemo(() => {
    const maxValue = Math.max(...scenarioRows.map((row) => Math.abs(row.pnlDisplay)), 1);
    return Number.isFinite(maxValue) ? maxValue : 1;
  }, [scenarioRows]);

  const scenarioMoveSpan = useMemo(() => {
    if (scenarioRows.length === 0) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.min(...scenarioRows.map((row) => row.movePct)),
      max: Math.max(...scenarioRows.map((row) => row.movePct)),
    };
  }, [scenarioRows]);

  const mobileScenarioRows = useMemo(() => {
    if (scenarioRows.length <= 7) {
      return scenarioRows;
    }

    const lastIndex = scenarioRows.length - 1;
    const indexSet = new Set<number>([
      0,
      Math.round(lastIndex * 0.17),
      Math.round(lastIndex * 0.33),
      Math.round(lastIndex * 0.5),
      Math.round(lastIndex * 0.67),
      Math.round(lastIndex * 0.83),
      lastIndex,
    ]);

    const zeroIndex = scenarioRows.findIndex((row) => Math.abs(row.movePct) < 0.0001);
    if (zeroIndex >= 0) {
      indexSet.add(zeroIndex);
    }

    const sortedIndexes = Array.from(indexSet).sort((a, b) => a - b);
    const centerIndex = Math.floor(sortedIndexes.length / 2);

    while (sortedIndexes.length > 7) {
      const candidate = sortedIndexes[centerIndex];
      if (candidate !== 0 && candidate !== lastIndex && candidate !== zeroIndex) {
        sortedIndexes.splice(centerIndex, 1);
      } else {
        sortedIndexes.splice(centerIndex - 1, 1);
      }
    }

    return sortedIndexes.map((index) => scenarioRows[index]);
  }, [scenarioRows]);

  const mobileScenarioGridTemplate = useMemo(
    () => `4.75rem repeat(${Math.max(mobileScenarioRows.length, 1)}, minmax(0, 1fr))`,
    [mobileScenarioRows.length],
  );

  const strikeMarkers = useMemo(() => {
    const strikes = normalizedLegs
      .filter((leg) => leg.type !== 'stock' && leg.strike !== undefined)
      .map((leg) => leg.strike as number);
    return Array.from(new Set(strikes)).sort((a, b) => a - b);
  }, [normalizedLegs]);

  const popCurveDomain = useMemo(() => {
    const minStrike = strikeMarkers.length > 0 ? Math.min(...strikeMarkers) : spot;
    const maxStrike = strikeMarkers.length > 0 ? Math.max(...strikeMarkers) : spot;
    return {
      min: Math.max(0.01, Math.min(spot * 0.05, minStrike * 0.5)),
      max: Math.max(spot * 4, maxStrike * 2.5),
    };
  }, [spot, strikeMarkers]);

  const popCurve = useMemo(
    () => samplePayoffCurveAtExpiry(normalizedLegs, popCurveDomain, 900, tradingCostInput),
    [normalizedLegs, popCurveDomain, tradingCostInput],
  );

  const profitableExpiryIntervals = useMemo(
    () => profitableIntervalsFromCurve(popCurve),
    [popCurve],
  );

  const expiryPoP = useMemo(() => {
    if (dte === null) return null;
    if (spot <= 0) return null;
    return probabilityOfProfitAtExpiry(profitableExpiryIntervals, {
      spot,
      volatility: modelVolatility,
      riskFreeRate: modelRiskFreeRate,
      dividendYield: modelDividendYield,
      timeToExpiryYears: Math.max(0, dte / 365),
    });
  }, [dte, modelDividendYield, modelRiskFreeRate, modelVolatility, profitableExpiryIntervals, spot]);

  const stressSpotMoveLevels = useMemo(() => {
    const steps = Math.min(5, Math.max(1, stressSpotSteps));
    return Array.from({ length: steps * 2 + 1 }, (_, index) => ((index - steps) / steps) * scenarioRangePct);
  }, [scenarioRangePct, stressSpotSteps]);

  const stressIvShockLevels = useMemo(() => {
    const steps = Math.min(5, Math.max(1, ivShockSteps));
    return Array.from(
      { length: steps * 2 + 1 },
      (_, index) => ((index - steps) / steps) * ivShockRangePct,
    );
  }, [ivShockRangePct, ivShockSteps]);

  const stressTimeLevels = useMemo(() => {
    const steps = Math.min(5, Math.max(1, timeShockSteps));
    const maxDays = Math.max(1, Math.min(365, timeShockMaxDays));
    return Array.from({ length: steps + 1 }, (_, index) => Math.round((index / steps) * maxDays));
  }, [timeShockMaxDays, timeShockSteps]);

  const spotIvStressMatrix = useMemo(() => {
    const baseYears = Math.max(0, effectiveTYears ?? 0);
    return stressSpotMoveLevels.map((movePct) => {
      const stressedSpot = Math.max(0.01, spot * (1 + movePct / 100));
      const cells = stressIvShockLevels.map((ivShockAbsPct) => {
        const stressedVol = Math.max(0.0001, modelVolatility + ivShockAbsPct / 100);
        const totalPnl = markToModelWithInputs(stressedSpot, baseYears, stressedVol);
        return {
          key: `${movePct.toFixed(3)}-${ivShockAbsPct.toFixed(3)}`,
          pnlTotal: totalPnl,
          pnlDisplay: scalePnlValue(totalPnl),
          ivShockAbsPct,
        };
      });
      return { movePct, stressedSpot, cells };
    });
  }, [
    effectiveTYears,
    markToModelWithInputs,
    modelVolatility,
    scalePnlValue,
    spot,
    stressIvShockLevels,
    stressSpotMoveLevels,
  ]);

  const spotTimeStressMatrix = useMemo(() => {
    return stressSpotMoveLevels.map((movePct) => {
      const stressedSpot = Math.max(0.01, spot * (1 + movePct / 100));
      const cells = stressTimeLevels.map((dayShift) => {
        const years = dte === null ? Math.max(0, asOfYears - dayShift / 365) : Math.max(0, (dte - dayShift) / 365);
        const totalPnl = markToModelWithInputs(stressedSpot, years, modelVolatility);
        return {
          key: `${movePct.toFixed(3)}-${dayShift}`,
          pnlTotal: totalPnl,
          pnlDisplay: scalePnlValue(totalPnl),
          dayShift,
        };
      });
      return { movePct, stressedSpot, cells };
    });
  }, [asOfYears, dte, markToModelWithInputs, modelVolatility, scalePnlValue, spot, stressSpotMoveLevels, stressTimeLevels]);

  const activeStressCells = useMemo(
    () =>
      (stressMode === 'spot_iv' ? spotIvStressMatrix : spotTimeStressMatrix).flatMap((row) =>
        row.cells.map((cell) => cell.pnlDisplay),
      ),
    [spotIvStressMatrix, spotTimeStressMatrix, stressMode],
  );

  const maxAbsStressPnl = useMemo(() => {
    const max = Math.max(...activeStressCells.map((value) => Math.abs(value)), 1);
    return Number.isFinite(max) ? max : 1;
  }, [activeStressCells]);

  const greeksReady = useMemo(() => {
    return (
      effectiveTYears !== null &&
      effectiveTYears > 0 &&
      spot > 0 &&
      volatilityPct > 0 &&
      Number.isFinite(riskFreeRatePct) &&
      Number.isFinite(dividendYieldPct)
    );
  }, [dividendYieldPct, effectiveTYears, riskFreeRatePct, spot, volatilityPct]);

  const greekRows = useMemo<GreekRow[]>(() => {
    const years = Math.max(0, effectiveTYears ?? 0);
    const sigma = Math.max(0, volatilityPct / 100);
    const riskFreeRate = riskFreeRatePct / 100;
    const dividendYield = dividendYieldPct / 100;

    return normalizedLegs.map((leg) => {
      const direction = leg.side === 'long' ? 1 : -1;
      const size = leg.qty * leg.multiplier;

      if (leg.type === 'stock') {
        return {
          id: leg.id,
          label: legLabel(leg),
          delta: direction * size,
          gamma: 0,
          theta: 0,
          vega: 0,
          modelPrice: spot,
        };
      }

      const strike = leg.strike ?? spot;
      const model =
        greeksReady && years > 0
          ? blackScholes({
              type: leg.type,
              spot,
              strike,
              timeToExpiryYears: years,
              volatility: sigma,
              riskFreeRate,
              dividendYield,
            })
          : {
              price: intrinsicOptionValue(leg.type, spot, strike),
              delta: 0,
              gamma: 0,
              theta: 0,
              vega: 0,
              d1: 0,
              d2: 0,
            };

      return {
        id: leg.id,
        label: legLabel(leg),
        delta: direction * model.delta * size,
        gamma: direction * model.gamma * size,
        theta: direction * model.theta * size,
        vega: direction * model.vega * size,
        modelPrice: model.price,
      };
    });
  }, [
    dividendYieldPct,
    effectiveTYears,
    greeksReady,
    normalizedLegs,
    riskFreeRatePct,
    spot,
    volatilityPct,
  ]);

  const greekTotals = useMemo(() => {
    return greekRows.reduce(
      (acc, row) => {
        acc.delta += row.delta;
        acc.gamma += row.gamma;
        acc.theta += row.theta;
        acc.vega += row.vega;
        return acc;
      },
      { delta: 0, gamma: 0, theta: 0, vega: 0 },
    );
  }, [greekRows]);

  const earlyExerciseRisks = useMemo(
    () =>
      detectShortCallEarlyExerciseRisks(
        normalizedLegs,
        spot,
        modelDividendYield,
        dte ?? 0,
        legModelPriceRecord,
      ),
    [dte, legModelPriceRecord, modelDividendYield, normalizedLegs, spot],
  );

  const cashAndMargin = useMemo(() => {
    let longStockShares = 0;
    let shortCallShares = 0;
    let shortPutShares = 0;
    let shortPutNotional = 0;
    let shortPutCredit = 0;
    let shortOptionRegTApprox = 0;

    for (const leg of normalizedLegs) {
      const shares = leg.qty * leg.multiplier;

      if (leg.type === 'stock' && leg.side === 'long') {
        longStockShares += shares;
      }

      if (leg.type === 'call' && leg.side === 'short') {
        shortCallShares += shares;
        const strike = leg.strike ?? spot;
        const otmAmount = Math.max(0, strike - spot);
        const regTPerShare = leg.premium + Math.max(0.2 * spot - otmAmount, 0.1 * spot);
        shortOptionRegTApprox += regTPerShare * shares;
      }

      if (leg.type === 'put' && leg.side === 'short') {
        const strike = leg.strike ?? spot;
        shortPutShares += shares;
        shortPutNotional += strike * shares;
        shortPutCredit += leg.premium * shares;
        const otmAmount = Math.max(0, spot - strike);
        const regTPerShare = leg.premium + Math.max(0.2 * spot - otmAmount, 0.1 * strike);
        shortOptionRegTApprox += regTPerShare * shares;
      }
    }

    const stockCashNeeded = longStockShares * spot;
    const cashSecuredPutNeeded = Math.max(
      0,
      shortPutNotional - (includePremiumCreditInCashNeeded ? shortPutCredit : 0),
    );

    const finiteRiskMargin = Number.isFinite(payoffEnvelope.maxLoss) ? Math.max(0, -payoffEnvelope.maxLoss) : null;
    const hasUnboundedRisk = payoffEnvelope.unboundedLoss;

    return {
      stockCashNeeded,
      cashSecuredPutNeeded,
      totalCashNeeded: stockCashNeeded + cashSecuredPutNeeded,
      coveredCallShares: Math.min(longStockShares, shortCallShares),
      uncoveredShortCallShares: Math.max(0, shortCallShares - longStockShares),
      shortPutShares,
      finiteRiskMargin,
      regTApproxMargin: shortOptionRegTApprox + totalTradingCosts,
      hasUnboundedRisk,
    };
  }, [
    includePremiumCreditInCashNeeded,
    normalizedLegs,
    payoffEnvelope.maxLoss,
    payoffEnvelope.unboundedLoss,
    spot,
    totalTradingCosts,
  ]);

  const riskNotes = useMemo(() => {
    const notes: string[] = [];

    if (payoffEnvelope.unboundedLoss) {
      notes.push('This structure has unlimited upside risk on the right tail (typically uncovered short calls).');
    }

    if (payoffEnvelope.unboundedProfit) {
      notes.push('This structure has uncapped upside payoff. Validate position sizing for volatility spikes.');
    }

    if (dte !== null && dte <= 7) {
      notes.push('DTE is under 7 days. Gamma risk and assignment probability can accelerate quickly.');
    }

    for (const leg of normalizedLegs) {
      if (leg.type === 'put' && leg.side === 'short' && (leg.strike ?? 0) > spot) {
        notes.push('Short put is ITM. Be prepared for assignment and cash collateral usage.');
      }
    }

    if (earlyExerciseRisks.length > 0) {
      notes.push(
        `Early exercise risk elevated for ${earlyExerciseRisks.length} short call leg(s). Model uses a European approximation.`,
      );
    }

    if (notes.length === 0) {
      notes.push('No structural red flags detected. Validate implied volatility and liquidity before execution.');
    }

    return notes;
  }, [dte, earlyExerciseRisks.length, normalizedLegs, payoffEnvelope.unboundedLoss, payoffEnvelope.unboundedProfit, spot]);

  const applyPreset = (nextPreset: Exclude<StrategyPresetKey, 'custom'>): void => {
    setPresetKey(nextPreset);
    const presetLegs = applyModelDefaultsToPresetLegs(nextPreset, spot, {
      spot,
      timeToExpiryYears: asOfYears,
      volatility: modelVolatility,
      riskFreeRate: modelRiskFreeRate,
      dividendYield: modelDividendYield,
    });
    setLegs(presetLegs);
  };

  const setLegPatch = (index: number, patch: Partial<OptionLeg>, markAsCustom = true): void => {
    setLegs((prev) =>
      prev.map((leg, legIndex) => {
        if (legIndex !== index) return leg;
        return normalizeLeg({ ...leg, ...patch, id: leg.id });
      }),
    );
    if (markAsCustom) setPresetKey('custom');
  };

  const removeLeg = (index: number): void => {
    setLegs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, legIndex) => legIndex !== index);
    });
    setPresetKey('custom');
  };

  const duplicateLeg = (index: number): void => {
    setLegs((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const clone = normalizeLeg({
        ...source,
        id: `leg-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      });
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
    setPresetKey('custom');
  };

  const moveLeg = (index: number, delta: -1 | 1): void => {
    setLegs((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setPresetKey('custom');
  };

  const addLeg = (): void => {
    const nextLeg: OptionLeg = normalizeLeg({
      id: `leg-${Date.now()}`,
      type: 'call',
      side: 'long',
      strike: Math.round(spot),
      premium: 2,
      qty: 1,
      multiplier: 100,
    });
    setLegs((prev) => [...prev, nextLeg]);
    setPresetKey('custom');
  };

  const maxProfitLabel = Number.isFinite(payoffEnvelope.maxProfit)
    ? currencyFormatter.format(payoffEnvelope.maxProfit)
    : 'Unlimited';
  const maxLossLabel = Number.isFinite(payoffEnvelope.maxLoss)
    ? currencyFormatter.format(payoffEnvelope.maxLoss)
    : 'Unlimited';
  const scaledMaxProfitLabel = Number.isFinite(scaledMaxProfit)
    ? currencyFormatter.format(scaledMaxProfit)
    : 'Unlimited';
  const scaledMaxLossLabel = Number.isFinite(scaledMaxLoss)
    ? currencyFormatter.format(scaledMaxLoss)
    : 'Unlimited';

  return (
    <div className="w-full max-w-full" id="options-payoff-lab-container">
      <div className="px-4 pb-0 pt-0 pr-16 sm:px-5 sm:pr-20">
        <h2 className="text-lg font-semibold text-foreground">Options Payoff Lab</h2>
      </div>

      <div className="space-y-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="md:hidden">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => {
                setMobilePanel('inputs');
                setShowMobileAdvancedResults(false);
              }}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                mobilePanel === 'inputs'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={mobilePanel === 'inputs'}
            >
              Inputs
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel('results')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                mobilePanel === 'results'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={mobilePanel === 'results'}
            >
              Results
            </button>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="grid w-full max-w-xs grid-cols-2 gap-2 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setDesktopPanel('inputs')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                desktopPanel === 'inputs'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={desktopPanel === 'inputs'}
            >
              Inputs
            </button>
            <button
              type="button"
              onClick={() => setDesktopPanel('results')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                desktopPanel === 'results'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={desktopPanel === 'results'}
            >
              Results
            </button>
          </div>
        </div>

        <div
          className={`${mobilePanel === 'inputs' ? 'space-y-4' : 'hidden'} ${
            desktopPanel === 'inputs' ? 'md:block md:space-y-4' : 'md:hidden'
          }`}
        >
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto] sm:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Strategy Preset</span>
                <select
                  value={presetKey}
                  onChange={(event) => {
                    const nextPreset = event.target.value as StrategyPresetKey;
                    if (nextPreset === 'custom') {
                      setPresetKey('custom');
                      return;
                    }
                    applyPreset(nextPreset);
                  }}
                  className="et-tool-select h-9 w-full min-w-0 sm:min-w-[15rem] text-sm"
                >
                  {presetOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </label>
              {presetKey !== 'custom' && (
                <button
                  type="button"
                  onClick={() => applyPreset(presetKey as Exclude<StrategyPresetKey, 'custom'>)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40 sm:w-auto"
                >
                  Re-apply Preset
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={addLeg}
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40 sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Leg
              </button>
              <button
                type="button"
                disabled
                title="Chain import integration stub for future API wiring"
                className="inline-flex h-9 w-full cursor-not-allowed items-center justify-center gap-1 rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground sm:w-auto"
              >
                <FileUp className="h-3.5 w-3.5" />
                Import Chain (Soon)
              </button>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {normalizedLegs.map((leg, index) => (
              <div key={`mobile-leg-${leg.id}`} className="rounded-lg border border-border/80 bg-background/70 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.11em] text-muted-foreground">Leg {index + 1}</p>
                    <p className="truncate text-xs font-medium text-foreground">{legLabel(leg)}</p>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveLeg(index, -1)}
                      disabled={index === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Move leg up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLeg(index, 1)}
                      disabled={index === normalizedLegs.length - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Move leg down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateLeg(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30"
                      aria-label="Duplicate leg"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLeg(index)}
                      disabled={normalizedLegs.length <= 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Remove leg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</span>
                    <select
                      value={leg.type}
                      onChange={(event) => {
                        const nextType = event.target.value as OptionLeg['type'];
                        const nextMultiplier = nextType === 'stock' ? 100 : leg.multiplier;
                        setLegPatch(
                          index,
                          {
                            type: nextType,
                            strike: nextType === 'stock' ? undefined : leg.strike ?? Math.round(spot),
                            multiplier: nextMultiplier,
                          },
                          true,
                        );
                      }}
                      className="et-tool-select h-8"
                    >
                      <option value="stock">Stock</option>
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Side</span>
                    <select
                      value={leg.side}
                      onChange={(event) => setLegPatch(index, { side: event.target.value as OptionLeg['side'] })}
                      className="et-tool-select h-8"
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Strike</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0.01}
                      disabled={leg.type === 'stock'}
                      value={leg.type === 'stock' ? '' : leg.strike ?? ''}
                      onChange={(event) =>
                        setLegPatch(index, {
                          strike: clampNumber(Number(event.target.value), leg.strike ?? spot, 0.01),
                        })
                      }
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-right text-xs disabled:opacity-50"
                      placeholder="n/a"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid Price/Basis</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={leg.type === 'stock' ? leg.entryPrice ?? leg.premium : leg.premium}
                      onChange={(event) => {
                        const nextValue = clampNumber(Number(event.target.value), 0, 0);
                        if (leg.type === 'stock') {
                          setLegPatch(index, { premium: nextValue, entryPrice: nextValue });
                        } else {
                          setLegPatch(index, { premium: nextValue });
                        }
                      }}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-right text-xs"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Model Px (As-of)</span>
                    <input
                      type="text"
                      readOnly
                      value={(legModelPriceById.get(leg.id) ?? 0).toFixed(4)}
                      title={`Model Px (European Black-Scholes approx)\nSpot=${spot.toFixed(2)}, IV=${volatilityPct.toFixed(2)}%, r=${riskFreeRatePct.toFixed(2)}%, q=${dividendYieldPct.toFixed(2)}%, DTE=${dte !== null ? dte.toFixed(2) : 'n/a'}\nFull precision: ${(legModelPriceById.get(leg.id) ?? 0).toFixed(8)}`}
                      className="h-8 w-full rounded-md border border-border bg-muted/30 px-2 text-right font-mono text-xs text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</span>
                    <input
                      type="number"
                      step={1}
                      min={1}
                      value={leg.qty}
                      onChange={(event) =>
                        setLegPatch(index, { qty: clampInt(Number(event.target.value), leg.qty, 1) })
                      }
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-right text-xs"
                    />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Multiplier</span>
                    <input
                      type="number"
                      step={1}
                      min={1}
                      value={leg.multiplier}
                      onChange={(event) =>
                        setLegPatch(index, {
                          multiplier: clampInt(Number(event.target.value), leg.multiplier ?? 100, 1),
                        })
                      }
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-right text-xs"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-border/80 md:block">
            <table className="min-w-full text-xs">
              <thead className="bg-background/90 text-muted-foreground">
                <tr className="border-b border-border/80">
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Type</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Side</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Strike</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Paid Price/Basis</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Model Px (As-of)</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Qty</th>
                  <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Multiplier</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {normalizedLegs.map((leg, index) => (
                  <tr key={leg.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-2 py-2">
                      <select
                        value={leg.type}
                        onChange={(event) => {
                          const nextType = event.target.value as OptionLeg['type'];
                          const nextMultiplier = nextType === 'stock' ? 100 : leg.multiplier;
                          setLegPatch(
                            index,
                            {
                              type: nextType,
                              strike: nextType === 'stock' ? undefined : leg.strike ?? Math.round(spot),
                              multiplier: nextMultiplier,
                            },
                            true,
                          );
                        }}
                        className="et-tool-select h-8 min-w-[5.5rem]"
                      >
                        <option value="stock">Stock</option>
                        <option value="call">Call</option>
                        <option value="put">Put</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={leg.side}
                        onChange={(event) => setLegPatch(index, { side: event.target.value as OptionLeg['side'] })}
                        className="et-tool-select h-8 min-w-[5.5rem]"
                      >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        disabled={leg.type === 'stock'}
                        value={leg.type === 'stock' ? '' : leg.strike ?? ''}
                        onChange={(event) =>
                          setLegPatch(index, {
                            strike: clampNumber(Number(event.target.value), leg.strike ?? spot, 0.01),
                          })
                        }
                        className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-xs disabled:opacity-50"
                        placeholder="n/a"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={leg.type === 'stock' ? leg.entryPrice ?? leg.premium : leg.premium}
                        onChange={(event) => {
                          const nextValue = clampNumber(Number(event.target.value), 0, 0);
                          if (leg.type === 'stock') {
                            setLegPatch(index, { premium: nextValue, entryPrice: nextValue });
                          } else {
                            setLegPatch(index, { premium: nextValue });
                          }
                        }}
                        className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        readOnly
                        value={(legModelPriceById.get(leg.id) ?? 0).toFixed(4)}
                        title={`Model Px (European Black-Scholes approx)\nSpot=${spot.toFixed(2)}, IV=${volatilityPct.toFixed(2)}%, r=${riskFreeRatePct.toFixed(2)}%, q=${dividendYieldPct.toFixed(2)}%, DTE=${dte !== null ? dte.toFixed(2) : 'n/a'}\nFull precision: ${(legModelPriceById.get(leg.id) ?? 0).toFixed(8)}`}
                        className="h-8 w-28 rounded-md border border-border bg-muted/30 px-2 text-right font-mono text-xs text-foreground"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step={1}
                        min={1}
                        value={leg.qty}
                        onChange={(event) =>
                          setLegPatch(index, { qty: clampInt(Number(event.target.value), leg.qty, 1) })
                        }
                        className="h-8 w-16 rounded-md border border-border bg-background px-2 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step={1}
                        min={1}
                        value={leg.multiplier}
                        onChange={(event) =>
                          setLegPatch(index, {
                            multiplier: clampInt(Number(event.target.value), leg.multiplier ?? 100, 1),
                          })
                        }
                        className="h-8 w-20 rounded-md border border-border bg-background px-2 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLeg(index, -1)}
                          disabled={index === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Move leg up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLeg(index, 1)}
                          disabled={index === normalizedLegs.length - 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Move leg down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateLeg(index)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30"
                          aria-label="Duplicate leg"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLeg(index)}
                          disabled={normalizedLegs.length <= 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Remove leg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Paid Price/Basis is your entered fill or stock basis. Model Px (As-of) uses spot, IV, r, q, and DTE with
            European Black-Scholes approximation.
            <span className="ml-1 inline-flex items-center gap-1">
              <Info className="h-3 w-3" />
              Hover model cells for full precision and assumptions.
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/70 p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Valuation Settings</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Spot</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                value={spot}
                onChange={(event) => setSpot(clampNumber(Number(event.target.value), spot, 0.01))}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Test Expiry Price</span>
              <input
                type="number"
                step="0.01"
                min={0.01}
                value={expiryPrice}
                onChange={(event) => setExpiryPrice(clampNumber(Number(event.target.value), expiryPrice, 0.01))}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Expiry Date</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">As-of Time</span>
              <input
                type="datetime-local"
                value={asOfDateTime}
                onChange={(event) => setAsOfDateTime(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">IV (%)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={volatilityPct}
                onChange={(event) =>
                  setVolatilityPct(clampNumber(Number(event.target.value), volatilityPct, 0))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">r / q (%)</span>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={riskFreeRatePct}
                  onChange={(event) => setRiskFreeRatePct(Number(event.target.value))}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  title="Risk-free rate"
                />
                <input
                  type="number"
                  step="0.1"
                  value={dividendYieldPct}
                  onChange={(event) => setDividendYieldPct(Number(event.target.value))}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  title="Dividend yield"
                />
              </div>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Scenario Range (%)</span>
              <input
                type="number"
                min={5}
                max={50}
                step={5}
                value={scenarioRangePct}
                onChange={(event) =>
                  setScenarioRangePct(Math.min(50, Math.max(5, clampInt(Number(event.target.value), 20, 5))))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">T+X (days)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={valuationHorizonDays}
                onChange={(event) =>
                  setValuationHorizonDays(clampInt(Number(event.target.value), valuationHorizonDays, 0))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Fee / Contract</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={feePerContract}
                onChange={(event) =>
                  setFeePerContract(clampNumber(Number(event.target.value), feePerContract, 0))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Fee / Share</span>
              <input
                type="number"
                min={0}
                step="0.001"
                value={feePerShare}
                onChange={(event) => setFeePerShare(clampNumber(Number(event.target.value), feePerShare, 0))}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Slippage (%)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={slippagePct}
                onChange={(event) => setSlippagePct(clampNumber(Number(event.target.value), slippagePct, 0))}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['total', 'per_share', 'per_contract'] as PnlDisplayMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplayMode(mode)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  displayMode === mode
                    ? 'border-foreground/40 bg-foreground text-background'
                    : 'border-border bg-background text-foreground hover:bg-muted/40'
                }`}
              >
                {pnlDisplayLabel(mode)}
              </button>
            ))}
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              DTE: {dte !== null ? dte.toFixed(2) : 'n/a'} days
            </span>
          </div>
          {displayMode === 'per_contract' && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Per option contract scaling divisor: total option contracts (abs) = {totalOptionContractsAbs}
              {totalOptionContractsAbs === 0 ? ' (fallback divisor = 1 because no option legs).' : '.'}
            </p>
          )}
          </div>
        </div>

        <div
          className={`${mobilePanel === 'results' ? 'space-y-4' : 'hidden'} ${
            desktopPanel === 'results' ? 'md:block md:space-y-4' : 'md:hidden'
          }`}
        >
          <Tabs
            value={valuationView}
            onValueChange={(value) => setValuationView(value as ValuationView)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-muted/60">
              <TabsTrigger value="expiry">Expiry Payoff</TabsTrigger>
              <TabsTrigger value="today">Today (T+0 / T+X)</TabsTrigger>
            </TabsList>
            <TabsContent value="expiry" className="mt-0" />
            <TabsContent value="today" className="mt-0" />
          </Tabs>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 md:hidden">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quick Snapshot</p>
                <p className="text-[10px] text-muted-foreground">
                  {valuationView === 'expiry' ? 'Expiry view' : `Today view (T+${valuationHorizonDays})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileAdvancedResults((prev) => !prev)}
                aria-expanded={showMobileAdvancedResults}
                className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/40"
              >
                {showMobileAdvancedResults ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expiry P/L</p>
                <p
                  className={`text-xs font-semibold ${
                    expiryPnL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {currencyFormatter.format(expiryPnL)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today P/L</p>
                <p
                  className={`text-xs font-semibold ${
                    todayPnL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {currencyFormatter.format(todayPnL)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max Loss</p>
                <p className="text-xs font-semibold text-foreground">{maxLossLabel}</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">PoP (Expiry)</p>
                <p className="text-xs font-semibold text-foreground">
                  {expiryPoP !== null ? `${(expiryPoP * 100).toFixed(1)}%` : 'n/a'}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">R:R</p>
                <p className="text-xs font-semibold text-foreground">{rrEstimate !== null ? `${rrEstimate.toFixed(2)}R` : '-'}</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Notional</p>
                <p className="text-xs font-semibold text-foreground">{currencyFormatter.format(notional)}</p>
              </div>
            </div>
          </div>

        <div
          className={`rounded-lg border border-border/70 bg-muted/20 p-2.5 ${
            showMobileAdvancedResults ? 'block' : 'hidden'
          } md:block`}
        >
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Headline Metrics (Total)</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expiry B/E(s) (Price)</p>
              <p className="text-sm font-semibold text-foreground">
                {expiryBreakEvens.length > 0
                  ? expiryBreakEvens.map((value) => currencyFormatter.format(value)).join(', ')
                  : '-'}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Mark-to-model B/E(s) (Price)</p>
              <p className="text-sm font-semibold text-foreground">
                {todayBreakEvens.length > 0
                  ? todayBreakEvens.map((value) => currencyFormatter.format(value)).join(', ')
                  : '-'}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max Profit (Total)</p>
              <p className="text-sm font-semibold text-foreground">{maxProfitLabel}</p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max Loss (Total)</p>
              <p className="text-sm font-semibold text-foreground">{maxLossLabel}</p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">PoP (Expiry)</p>
              <p className="text-sm font-semibold text-foreground">
                {expiryPoP !== null ? `${(expiryPoP * 100).toFixed(1)}%` : 'n/a'}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Lognormal assumption under current IV/r/q.</p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Expiry P/L @ Test Expiry Price (Total)
              </p>
              <p
                className={`text-sm font-semibold ${
                  expiryPnL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {currencyFormatter.format(expiryPnL)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Today P/L (Mark-to-model @ Spot, Total)
              </p>
              <p
                className={`text-sm font-semibold ${
                  todayPnL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {currencyFormatter.format(todayPnL)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Paid vs Model @ Spot (Total)
              </p>
              <p
                className={`text-sm font-semibold ${
                  paidVsModelAtSpot >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {currencyFormatter.format(paidVsModelAtSpot)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">R:R / Notional (Total)</p>
              <p className="text-sm font-semibold text-foreground">{rrEstimate !== null ? `${rrEstimate.toFixed(2)}R` : '-'}</p>
              <p className="text-[11px] text-muted-foreground">{currencyFormatter.format(notional)}</p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg border border-border/70 bg-muted/20 p-2.5 ${
            showMobileAdvancedResults ? 'block' : 'hidden'
          } md:block`}
        >
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Scaled Metrics ({displayLabel})
          </p>
          <p className="mb-2 text-[10px] text-muted-foreground">{displayDivisorText}</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max Profit (Scaled)</p>
              <p className="text-sm font-semibold text-foreground">{scaledMaxProfitLabel}</p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max Loss (Scaled)</p>
              <p className="text-sm font-semibold text-foreground">{scaledMaxLossLabel}</p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Expiry P/L @ Test Expiry Price (Scaled)
              </p>
              <p
                className={`text-sm font-semibold ${
                  scaledExpiryPnL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {currencyFormatter.format(scaledExpiryPnL)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Today P/L (Mark-to-model @ Spot, Scaled)
              </p>
              <p
                className={`text-sm font-semibold ${
                  scaledTodayPnL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {currencyFormatter.format(scaledTodayPnL)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Paid vs Model @ Spot (Scaled)
              </p>
              <p
                className={`text-sm font-semibold ${
                  scaledPaidVsModelAtSpot >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {currencyFormatter.format(scaledPaidVsModelAtSpot)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Expiry P/L (test) depends on the Test Expiry Price input. Today values are model mark-to-model at current
            spot.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-gradient-to-b from-background/90 to-muted/20 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {valuationView === 'expiry' ? 'Expiry Payoff Chart' : 'Mark-to-Model Chart'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Display mode: {displayLabel}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {displayDivisorText}
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Trading Costs Applied: {currencyFormatter.format(totalTradingCosts)}
            </div>
          </div>

          <div className="h-[280px] w-full sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 16, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  type="number"
                  dataKey="price"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  tickFormatter={(value: number) => currencyFormatter.format(value)}
                  domain={[domain.min, domain.max]}
                >
                  <Label
                    value="Underlying Price"
                    position="insideBottom"
                    offset={-6}
                    style={{ fill: '#a1a1aa', fontSize: 11 }}
                  />
                </XAxis>
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  tickFormatter={(value: number) => currencyFormatter.format(value)}
                  width={72}
                >
                  <Label
                    value="P/L after fees/slippage"
                    angle={-90}
                    position="insideLeft"
                    style={{ fill: '#a1a1aa', fontSize: 11, textAnchor: 'middle' }}
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{
                    background: '#050505',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#f4f4f5',
                  }}
                  formatter={(value: number) => [currencyFormatter.format(value), `P/L (${displayLabel})`]}
                  labelFormatter={(label: number) => `Underlying: ${currencyFormatter.format(label)}`}
                />

                <ReferenceLine y={0} stroke="rgba(245,245,245,0.36)" strokeDasharray="5 4" />

                {strikeMarkers.map((strike) => (
                  <ReferenceLine
                    key={`strike-${strike}`}
                    x={strike}
                    stroke="rgba(99,102,241,0.45)"
                    strokeDasharray="2 2"
                  />
                ))}

                {activeBreakEvens.map((breakEven) => (
                  <ReferenceLine
                    key={`be-${breakEven}`}
                    x={breakEven}
                    stroke="rgba(16,185,129,0.6)"
                    strokeDasharray="3 3"
                  />
                ))}

                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className={`rounded-xl border border-border/80 bg-gradient-to-b from-background/80 to-muted/20 p-3 sm:p-4 ${
            showMobileAdvancedResults ? 'block' : 'hidden'
          } md:block`}
        >
          <div className="w-full">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Scenario Matrix</h3>
                <p className="mt-0.5 text-[11px] tracking-wide text-muted-foreground">
                  Exact curve samples ({displayLabel})
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Input ±{percentFormatter.format(scenarioRangePct)}% · Span {percentFormatter.format(scenarioMoveSpan.min)}% to{' '}
                {scenarioMoveSpan.max >= 0 ? '+' : ''}
                {percentFormatter.format(scenarioMoveSpan.max)}%
              </div>
            </div>

            <div className="sm:hidden overflow-hidden rounded-lg border border-border/80 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div
                className="grid border-b border-border/80 bg-background/90 text-muted-foreground"
                style={{ gridTemplateColumns: mobileScenarioGridTemplate }}
              >
                <div className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.11em]">
                  Move
                </div>
                {mobileScenarioRows.map((row) => (
                  <div key={`mobile-head-${row.key}`} className="px-1 py-1.5 text-center">
                    <span
                      className={
                        row.movePct >= 0
                          ? 'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300'
                          : 'inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-700 dark:text-rose-300'
                      }
                    >
                      {row.movePct > 0 ? '+' : ''}
                      {percentFormatter.format(row.movePct)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid border-b border-border/70" style={{ gridTemplateColumns: mobileScenarioGridTemplate }}>
                <div className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                  Underlying
                </div>
                {mobileScenarioRows.map((row) => (
                  <div
                    key={`mobile-underlying-${row.key}`}
                    className={`px-1 py-1.5 text-center text-[11px] font-medium tabular-nums text-foreground ${
                      row.movePct === 0 ? 'bg-muted/25' : ''
                    }`}
                  >
                    {currencyFormatter.format(row.price)}
                  </div>
                ))}
              </div>

              <div className="grid" style={{ gridTemplateColumns: mobileScenarioGridTemplate }}>
                <div className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                  P/L
                </div>
                {mobileScenarioRows.map((row) => {
                  const normalized = Math.min(Math.abs(row.pnlDisplay) / maxAbsScenarioPnlDisplay, 1);

                  return (
                    <div
                      key={`mobile-pnl-${row.key}`}
                      className={`px-1 py-1.5 text-center text-[11px] font-semibold tabular-nums ${
                        row.pnlDisplay >= 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-700 dark:text-rose-300'
                      } ${row.movePct === 0 ? 'ring-1 ring-inset ring-border/70' : ''}`}
                      style={{
                        backgroundColor:
                          row.pnlDisplay >= 0
                            ? `rgba(16, 185, 129, ${0.08 + normalized * 0.28})`
                            : `rgba(244, 63, 94, ${0.08 + normalized * 0.24})`,
                      }}
                    >
                      {currencyFormatter.format(row.pnlDisplay)}
                    </div>
                  );
                })}
              </div>

              {scenarioRows.length > mobileScenarioRows.length && (
                <div className="border-t border-border/70 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
                  Mobile view shows key levels for readability.
                </div>
              )}
            </div>

            <div className="hidden overflow-auto rounded-lg border border-border/80 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:block">
              <table className="w-full min-w-[740px] table-fixed text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-background/90 text-muted-foreground">
                    <th className="sticky left-0 z-10 w-36 bg-background/95 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.11em]">
                      Metric
                    </th>
                    {scenarioRows.map((row) => (
                      <th key={`head-${row.key}`} className="px-2 py-2 text-center">
                        <span
                          className={
                            row.movePct >= 0
                              ? 'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300'
                              : 'inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-700 dark:text-rose-300'
                          }
                        >
                          {row.movePct > 0 ? '+' : ''}
                          {percentFormatter.format(row.movePct)}%
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/70">
                    <th className="sticky left-0 z-10 bg-background/95 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                      Underlying
                    </th>
                    {scenarioRows.map((row) => (
                      <td
                        key={`underlying-${row.key}`}
                        className={`px-2 py-2 text-center font-medium tabular-nums text-foreground ${
                          row.movePct === 0 ? 'bg-muted/25' : ''
                        }`}
                      >
                        {currencyFormatter.format(row.price)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-10 bg-background/95 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                      P/L ({displayLabel})
                    </th>
                    {scenarioRows.map((row) => {
                      const normalized = Math.min(Math.abs(row.pnlDisplay) / maxAbsScenarioPnlDisplay, 1);

                      return (
                        <td
                          key={`pnl-${row.key}`}
                          className={`px-2 py-2 text-center font-semibold tabular-nums ${
                            row.pnlDisplay >= 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                          } ${row.movePct === 0 ? 'ring-1 ring-inset ring-border/70' : ''}`}
                          style={{
                            backgroundColor:
                              row.pnlDisplay >= 0
                                ? `rgba(16, 185, 129, ${0.08 + normalized * 0.28})`
                                : `rgba(244, 63, 94, ${0.08 + normalized * 0.24})`,
                          }}
                        >
                          {currencyFormatter.format(row.pnlDisplay)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-md border border-border/80 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              {valuationView === 'expiry' ? 'Expiry' : `Today (T+${valuationHorizonDays})`} at{' '}
              {currencyFormatter.format(expiryPrice)} implies{' '}
              <span
                className={
                  scenarioSummaryDisplayPnl >= 0
                    ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                    : 'font-semibold text-rose-700 dark:text-rose-300'
                }
              >
                {currencyFormatter.format(scenarioSummaryDisplayPnl)}
              </span>{' '}
              P/L ({displayLabel}) after estimated costs.
            </div>
          </div>
        </div>

        <div
          className={`rounded-xl border border-border/80 bg-gradient-to-b from-background/90 to-muted/20 p-3 sm:p-4 ${
            showMobileAdvancedResults ? 'block' : 'hidden'
          } md:block`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">2D Stress Matrix (Today / Mark-to-model)</h3>
              <p className="text-[11px] text-muted-foreground">
                Cells show P/L ({displayLabel}) after fees/slippage. {displayDivisorText}
              </p>
            </div>
            <div className="inline-flex rounded-md border border-border/80 bg-background/70 p-0.5">
              <button
                type="button"
                onClick={() => setStressMode('spot_iv')}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  stressMode === 'spot_iv'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                Spot vs IV Shock
              </button>
              <button
                type="button"
                onClick={() => setStressMode('spot_time')}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  stressMode === 'spot_time'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                Spot vs T+X
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Spot Steps/Side</span>
              <input
                type="number"
                min={1}
                max={5}
                step={1}
                value={stressSpotSteps}
                onChange={(event) => setStressSpotSteps(Math.min(5, Math.max(1, clampInt(Number(event.target.value), 3, 1))))}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">IV Shock Range (abs %)</span>
              <input
                type="number"
                min={1}
                max={40}
                step={1}
                value={ivShockRangePct}
                onChange={(event) => setIvShockRangePct(Math.min(40, Math.max(1, clampNumber(Number(event.target.value), 10, 0))))}
                disabled={stressMode !== 'spot_iv'}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">IV Shock Steps/Side</span>
              <input
                type="number"
                min={1}
                max={5}
                step={1}
                value={ivShockSteps}
                onChange={(event) => setIvShockSteps(Math.min(5, Math.max(1, clampInt(Number(event.target.value), 2, 1))))}
                disabled={stressMode !== 'spot_iv'}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">T+X Max/Steps</span>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={timeShockMaxDays}
                  onChange={(event) =>
                    setTimeShockMaxDays(Math.min(365, Math.max(1, clampInt(Number(event.target.value), 30, 1))))
                  }
                  disabled={stressMode !== 'spot_time'}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
                />
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  value={timeShockSteps}
                  onChange={(event) =>
                    setTimeShockSteps(Math.min(5, Math.max(1, clampInt(Number(event.target.value), 3, 1))))
                  }
                  disabled={stressMode !== 'spot_time'}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
                />
              </div>
            </label>
          </div>

          <div className="mt-3 overflow-auto rounded-lg border border-border/80 bg-background/70">
            <table className="min-w-[680px] w-full text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-background/95 text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-background/95 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.11em]">
                    Spot Move
                  </th>
                  {stressMode === 'spot_iv'
                    ? stressIvShockLevels.map((shock) => (
                        <th key={`iv-col-${shock}`} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.11em]">
                          {shock > 0 ? '+' : ''}
                          {percentFormatter.format(shock)} IV
                        </th>
                      ))
                    : stressTimeLevels.map((day) => (
                        <th key={`day-col-${day}`} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.11em]">
                          T+{day}d
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {(stressMode === 'spot_iv' ? spotIvStressMatrix : spotTimeStressMatrix).map((row) => (
                  <tr key={`stress-row-${row.movePct}`} className="border-b border-border/70 last:border-b-0">
                    <th className="sticky left-0 z-10 bg-background/95 px-2 py-2 text-left text-[11px] font-semibold tabular-nums text-foreground">
                      {row.movePct > 0 ? '+' : ''}
                      {percentFormatter.format(row.movePct)}% · {currencyFormatter.format(row.stressedSpot)}
                    </th>
                    {row.cells.map((cell) => {
                      const normalized = Math.min(Math.abs(cell.pnlDisplay) / maxAbsStressPnl, 1);
                      return (
                        <td
                          key={cell.key}
                          className={`px-2 py-2 text-center font-semibold tabular-nums ${
                            cell.pnlDisplay >= 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                          }`}
                          style={{
                            backgroundColor:
                              cell.pnlDisplay >= 0
                                ? `rgba(16, 185, 129, ${0.08 + normalized * 0.28})`
                                : `rgba(244, 63, 94, ${0.08 + normalized * 0.24})`,
                          }}
                        >
                          {currencyFormatter.format(cell.pnlDisplay)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

          <div
            className={`grid grid-cols-1 gap-4 xl:grid-cols-2 ${
              showMobileAdvancedResults ? 'grid' : 'hidden'
            } md:grid`}
          >
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Greeks (Aggregated & Per Leg)</h3>
            {!greeksReady ? (
              <div className="rounded-md border border-dashed border-border/80 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                Greeks unavailable. Set valid DTE &gt; 0 and IV &gt; 0 to calculate Black-Scholes Greeks.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-md border border-border bg-background/70 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Delta</p>
                    <p className="text-sm font-semibold text-foreground">{greekTotals.delta.toFixed(3)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/70 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gamma</p>
                    <p className="text-sm font-semibold text-foreground">{greekTotals.gamma.toFixed(4)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/70 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Theta / day</p>
                    <p className="text-sm font-semibold text-foreground">{greekTotals.theta.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/70 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vega / 1%</p>
                    <p className="text-sm font-semibold text-foreground">{greekTotals.vega.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-2 max-h-[220px] overflow-auto rounded-md border border-border/80">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-background/95 text-muted-foreground">
                      <tr className="border-b border-border/80">
                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Leg</th>
                        <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">
                          Model Px (Valuation)
                        </th>
                        <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Delta</th>
                        <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Gamma</th>
                        <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Theta</th>
                        <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Vega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {greekRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/70 last:border-b-0">
                          <td className="px-2 py-2 text-foreground">{row.label}</td>
                          <td className="px-2 py-2 text-right font-mono text-foreground">
                            {currencyFormatter.format(row.modelPrice)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-foreground">{row.delta.toFixed(3)}</td>
                          <td className="px-2 py-2 text-right font-mono text-foreground">{row.gamma.toFixed(4)}</td>
                          <td className="px-2 py-2 text-right font-mono text-foreground">{row.theta.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right font-mono text-foreground">{row.vega.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Risk, Assignment & Collateral</h3>
            <div className="mb-2 rounded-md border border-border/80 bg-background/70 px-2.5 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Early Exercise Indicator (Short Calls)
              </p>
              <p
                className={`text-sm font-semibold ${
                  earlyExerciseRisks.length > 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {earlyExerciseRisks.length > 0
                  ? `Elevated on ${earlyExerciseRisks.length} leg(s)`
                  : 'No elevated short-call signal'}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Model Px (As-of) uses European approximation (Black-Scholes), not a full American exercise model.
              </p>
            </div>

            <div className="space-y-1.5">
              {riskNotes.map((warning, index) => (
                <div
                  key={`${warning}-${index}`}
                  className="rounded-md border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="mr-1 inline-flex align-middle">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  {warning}
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cash Needed (Est.)</p>
                <p className="text-sm font-semibold text-foreground">
                  {currencyFormatter.format(cashAndMargin.totalCashNeeded)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Stock: {currencyFormatter.format(cashAndMargin.stockCashNeeded)} · CSP:{' '}
                  {currencyFormatter.format(cashAndMargin.cashSecuredPutNeeded)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Est. Margin</p>
                <p className="text-sm font-semibold text-foreground">
                  {currencyFormatter.format(
                    cashAndMargin.hasUnboundedRisk
                      ? cashAndMargin.regTApproxMargin
                      : cashAndMargin.finiteRiskMargin ?? 0,
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {cashAndMargin.hasUnboundedRisk
                    ? 'Potentially large/unbounded; broker dependent. Showing conservative Reg-T style approximation.'
                    : 'Defined-risk estimate based on max loss (plus fees).'}
                </p>
              </div>
            </div>

            <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={includePremiumCreditInCashNeeded}
                onChange={(event) => setIncludePremiumCreditInCashNeeded(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-border bg-background"
              />
              Subtract premium credits from cash-needed estimate (cash-secured puts)
            </label>

            {cashAndMargin.uncoveredShortCallShares > 0 && (
              <div className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">
                Uncovered short-call exposure detected ({Math.round(cashAndMargin.uncoveredShortCallShares)} shares
                equivalent). Margin requirements can expand rapidly.
              </div>
            )}
          </div>
        </div>

        </div>

      </div>
    </div>
  );
}
