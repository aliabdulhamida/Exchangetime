"use client";
import { Info } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ToastAction } from '@/components/ui/toast';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

function parseNumber(v: any, cur: string) {
  let s = String(v).trim();
  const isUSLike = cur === 'USD' || cur === 'GBP';
  if (isUSLike) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(/\./g, '').replace(/,/g, '.');
  }
  return Number(s);
}

function numeric(v: any, cur: string) {
  const n = parseNumber(v, cur);
  return Number.isFinite(n) ? n : 0;
}

function finiteNumber(v: any) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLegacyFcfUnits(fcfValues: number[], shares: number) {
  if (!Array.isArray(fcfValues) || fcfValues.length === 0) return fcfValues;
  const maxAbs = Math.max(...fcfValues.map((v) => Math.abs(v || 0)));
  // Older local state used small "demo" FCF numbers with full raw share counts.
  // Promote to raw units so per-share math is consistent.
  if (shares > 1_000_000 && maxAbs > 0 && maxAbs <= 10_000) {
    return fcfValues.map((v) => Math.round(v * 1_000_000 * 100) / 100);
  }
  return fcfValues;
}

function numberArraysEqual(a: number[], b: number[], epsilon = 1e-9) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > epsilon) return false;
  }
  return true;
}

function decisionToneClasses(tone: 'positive' | 'neutral' | 'negative') {
  if (tone === 'positive') return 'bg-green-500/10 text-green-400';
  if (tone === 'negative') return 'bg-red-500/10 text-red-400';
  return 'bg-zinc-500/10 text-zinc-300';
}

export default function DcfCalculator() {
  const [mobilePanel, setMobilePanel] = useState<'inputs' | 'results'>('inputs');
  const [desktopPanel, setDesktopPanel] = useState<'inputs' | 'results'>('inputs');
  const [discountRate, setDiscountRate] = useState(10);
  const [simpleMode, setSimpleMode] = useState(true);
  // WACC inputs
  const [useWacc, setUseWacc] = useState(false);
  const [riskFreeRate, setRiskFreeRate] = useState(4.0);
  const [beta, setBeta] = useState(1.11);
  const [marketRiskPremium, setMarketRiskPremium] = useState(5.5);
  const [costOfDebt, setCostOfDebt] = useState(4.0);
  const [taxRate, setTaxRate] = useState(25);
  const [debtRatio, setDebtRatio] = useState(20);
  const [terminalGrowth, setTerminalGrowth] = useState(2);
  const [terminalMultiple, setTerminalMultiple] = useState(12);
  const [useMultiple, setUseMultiple] = useState(false);
  const [sharesOutstanding, setSharesOutstanding] = useState(100_000_000);
  const [cash, setCash] = useState(0);
  const [debt, setDebt] = useState(0);
  const [fcfList, setFcfList] = useState<number[]>([100_000_000, 110_000_000, 121_000_000, 133_100_000, 146_410_000]);
  const [preset, setPreset] = useState<'conservative' | 'base' | 'aggressive' | null>('base');
  const [showSensitivity, setShowSensitivity] = useState(false);
  // Automated FCF generation mode: 'manual' | 'constant' | 'per-year'
  const [fcfMode, setFcfMode] = useState<'manual' | 'constant' | 'per-year'>('constant');
  const [fcfStart, setFcfStart] = useState<number | string>(fcfList[0] ?? 0);
  const [fcfGrowthConstant, setFcfGrowthConstant] = useState(5);
  const [fcfGrowths, setFcfGrowths] = useState<number[]>([]); // per-year growths (%)
  // Scenario management
  const [scenarioName, setScenarioName] = useState('');
  const [scenarios, setScenarios] = useState<Array<{ name: string; state: any }>>([]);
  const [highlightedScenario, setHighlightedScenario] = useState<string | null>(null);
  const scenarioRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevFcfModeRef = useRef<'manual' | 'constant' | 'per-year'>(fcfMode);
  // Currency selection and formatting (define early to avoid TDZ when loading persistence)
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'CHF' | 'GBP'>('USD');
  const [currentPrice, setCurrentPrice] = useState<number | string>(0);
  const [ticker, setTicker] = useState<string>('');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchingFmp, setFetchingFmp] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const lastFetchRef = useRef<{ symbol: string; time: number; price: number; currency?: string } | null>(null);
  const [displayScale, setDisplayScale] = useState<'auto' | 'raw' | 'K' | 'M' | 'B' | 'T'>('auto');
  const [sparkline, setSparkline] = useState<number[] | null>(null);
  const [sparklineLoading, setSparklineLoading] = useState(false);
  const [marginOfSafetyPct, setMarginOfSafetyPct] = useState(25);
  const [useMidYearConvention] = useState(false);
  const [detailView, setDetailView] = useState<'chart' | 'mechanics'>('chart');

  function formatCurrency(v: number) {
    const cur = currency || 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v);
    } catch (e) {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v) + ' ' + cur;
    }
  }

  function formatLarge(v: number) {
    // Returns { short: '1.2B', full: '$1,200,000,000.00' }
    const abs = Math.abs(v || 0);
    const cur = currency || 'USD';
    const full = formatCurrency(v);
    const scale = displayScale === 'auto' ? (abs >= 1e12 ? 'T' : abs >= 1e9 ? 'B' : abs >= 1e6 ? 'M' : abs >= 1e3 ? 'K' : 'raw') : displayScale;
    const sign = v < 0 ? '-' : '';
    const symbol = full.charAt(0) === '-' ? full.charAt(1) : full.charAt(0); // extract currency symbol
    if (scale === 'raw') return { short: `${sign}${Number(v).toLocaleString()}`, full };
    if (scale === 'K') return { short: `${sign}${symbol}${(abs / 1e3).toFixed(2)}K`, full };
    if (scale === 'M') return { short: `${sign}${symbol}${(abs / 1e6).toFixed(2)}M`, full };
    if (scale === 'B') return { short: `${sign}${symbol}${(abs / 1e9).toFixed(2)}B`, full };
    if (scale === 'T') return { short: `${sign}${symbol}${(abs / 1e12).toFixed(2)}T`, full };
    return { short: `${sign}${symbol}${Number(abs).toLocaleString()}`, full };
  }

  // WACC calculation (defined before it's used)
  const wacc = useMemo(() => {
    try {
      const rf = numeric(riskFreeRate, currency) / 100;
      const b = numeric(beta, currency);
      const mrp = numeric(marketRiskPremium, currency) / 100;
      const coe = rf + b * mrp;
      const cod = numeric(costOfDebt, currency) / 100;
      const afterTaxCod = cod * (1 - numeric(taxRate, currency) / 100);
      const dToV = numeric(debtRatio, currency) / 100;
      const eToV = 1 - dToV;
      if (dToV + eToV === 0) return null;
      return (eToV * coe + dToV * afterTaxCod) * 100; // return in percent
    } catch (e) {
      return null;
    }
  }, [riskFreeRate, beta, marketRiskPremium, costOfDebt, taxRate, debtRatio, currency]);

  const effectiveRatePct = useMemo(() => numeric(useWacc ? (wacc ?? discountRate) : discountRate, currency), [useWacc, wacc, discountRate, currency]);
  const terminalDiscountPeriod = useMemo(
    () => Math.max(0.5, fcfList.length - (useMidYearConvention ? 0.5 : 0)),
    [fcfList.length, useMidYearConvention],
  );

  const npv = useMemo(() => {
    const r = effectiveRatePct / 100;
    if (!Number.isFinite(r) || r <= -0.99) return 0;
    let pv = 0;
    for (let i = 0; i < fcfList.length; i++) {
      const f = numeric(fcfList[i], currency);
      const period = useMidYearConvention ? i + 0.5 : i + 1;
      pv += f / Math.pow(1 + r, period);
    }
    return pv;
  }, [fcfList, effectiveRatePct, currency, useMidYearConvention]);

  const terminalValue = useMemo(() => {
    const lastFcf = numeric(fcfList[fcfList.length - 1], currency);
    const g = numeric(terminalGrowth, currency) / 100;
    const r = effectiveRatePct / 100;
    if (!useMultiple) {
      if (r <= g) return 0;
      return (lastFcf * (1 + g)) / (r - g);
    } else {
      return lastFcf * numeric(terminalMultiple, currency);
    }
  }, [fcfList, effectiveRatePct, terminalGrowth, terminalMultiple, useMultiple, currency]);

  const pvTerminal = useMemo(() => {
    const r = effectiveRatePct / 100;
    if (!Number.isFinite(r) || r <= -0.99) return 0;
    return terminalValue / Math.pow(1 + r, terminalDiscountPeriod);
  }, [terminalValue, effectiveRatePct, terminalDiscountPeriod]);

  const enterpriseValue = useMemo(() => npv + pvTerminal, [npv, pvTerminal]);

  const equityValue = useMemo(() => enterpriseValue + numeric(cash, currency) - numeric(debt, currency), [
    enterpriseValue,
    cash,
    debt,
    currency,
  ]);

  const perShare = useMemo(() => equityValue / Math.max(1, numeric(sharesOutstanding, currency)), [
    equityValue,
    sharesOutstanding,
    currency,
  ]);

  const upsidePct = useMemo(() => {
    const cp = numeric(currentPrice, currency);
    if (!cp || !isFinite(cp) || cp <= 0) return null;
    return ((perShare - cp) / Math.abs(cp)) * 100;
  }, [perShare, currentPrice, currency]);

  const netDebt = useMemo(
    () => numeric(debt, currency) - numeric(cash, currency),
    [debt, cash, currency],
  );

  const terminalWeightPct = useMemo(() => {
    if (!Number.isFinite(enterpriseValue) || enterpriseValue === 0) return 0;
    return (pvTerminal / enterpriseValue) * 100;
  }, [enterpriseValue, pvTerminal]);

  const fcfCagrPct = useMemo(() => {
    if (fcfList.length < 2) return null;
    const first = numeric(fcfList[0], currency);
    const last = numeric(fcfList[fcfList.length - 1], currency);
    const periods = fcfList.length - 1;
    if (first <= 0 || last <= 0 || periods <= 0) return null;
    return (Math.pow(last / first, 1 / periods) - 1) * 100;
  }, [fcfList, currency]);

  const buyBelowPrice = useMemo(() => {
    const mos = Math.max(0, Math.min(95, numeric(marginOfSafetyPct, currency))) / 100;
    return perShare * (1 - mos);
  }, [perShare, marginOfSafetyPct, currency]);

  const valuationState = useMemo(() => {
    if (upsidePct === null) return { label: 'No market price', tone: 'neutral' as const };
    if (upsidePct >= 20) return { label: 'Undervalued', tone: 'positive' as const };
    if (upsidePct <= -15) return { label: 'Overvalued', tone: 'negative' as const };
    return { label: 'Fairly Valued', tone: 'neutral' as const };
  }, [upsidePct]);

  const calculationRows = useMemo(() => {
    const r = effectiveRatePct / 100;
    if (!Number.isFinite(r) || r <= -0.99) return [];
    return fcfList.map((value, i) => {
      const fcf = numeric(value, currency);
      const period = useMidYearConvention ? i + 0.5 : i + 1;
      const discountFactor = 1 / Math.pow(1 + r, period);
      const pv = fcf * discountFactor;
      return {
        year: i + 1,
        fcf,
        period,
        discountFactor,
        pv,
      };
    });
  }, [effectiveRatePct, fcfList, currency, useMidYearConvention]);

  // Persistence: save/load to localStorage
  const STORAGE_KEY = 'exchangetime_dcf_v1';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj) {
          setSimpleMode(obj.simpleMode ?? true);
          setDiscountRate(obj.discountRate ?? discountRate);
          setTerminalGrowth(obj.terminalGrowth ?? terminalGrowth);
          setTerminalMultiple(obj.terminalMultiple ?? terminalMultiple);
          setUseMultiple(obj.useMultiple ?? useMultiple);
          setSharesOutstanding(obj.sharesOutstanding ?? sharesOutstanding);
          setCash(obj.cash ?? cash);
          setDebt(obj.debt ?? debt);
          const nextShares = Number(obj.sharesOutstanding ?? sharesOutstanding);
          const nextFcf = Array.isArray(obj.fcfList) ? obj.fcfList : fcfList;
          setFcfList(normalizeLegacyFcfUnits(nextFcf, Number.isFinite(nextShares) ? nextShares : sharesOutstanding));
          setPreset(obj.preset ?? preset);
          setScenarios(Array.isArray(obj.scenarios) ? obj.scenarios : []);
          // new fields
          setUseWacc(obj.useWacc ?? useWacc);
          setRiskFreeRate(obj.riskFreeRate ?? riskFreeRate);
          setBeta(obj.beta ?? beta);
          setMarketRiskPremium(obj.marketRiskPremium ?? marketRiskPremium);
          setCostOfDebt(obj.costOfDebt ?? costOfDebt);
          setTaxRate(obj.taxRate ?? taxRate);
          setDebtRatio(obj.debtRatio ?? debtRatio);
          setFcfMode(obj.fcfMode ?? fcfMode);
          setFcfStart(obj.fcfStart ?? fcfStart);
          setFcfGrowthConstant(obj.fcfGrowthConstant ?? fcfGrowthConstant);
          setFcfGrowths(Array.isArray(obj.fcfGrowths) ? obj.fcfGrowths : fcfGrowths);
          setCurrency(obj.currency ?? currency);
          setDisplayScale(obj.displayScale ?? displayScale);
          setTicker(obj.ticker ?? ticker);
          setMarginOfSafetyPct(obj.marginOfSafetyPct ?? marginOfSafetyPct);
          // Keep discounting convention fixed in the simplified UI.
        }
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const obj = {
        discountRate,
        simpleMode,
        terminalGrowth,
        terminalMultiple,
        useMultiple,
        sharesOutstanding,
        cash,
        debt,
        fcfList,
        preset,
        scenarios,
        // new fields
        useWacc,
        riskFreeRate,
        beta,
        marketRiskPremium,
        costOfDebt,
        taxRate,
        debtRatio,
        fcfMode,
        fcfStart,
        fcfGrowthConstant,
        fcfGrowths,
        currency,
        displayScale,
        ticker,
        marginOfSafetyPct,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }, [discountRate, simpleMode, terminalGrowth, terminalMultiple, useMultiple, sharesOutstanding, cash, debt, fcfList, preset, scenarios, useWacc, riskFreeRate, beta, marketRiskPremium, costOfDebt, taxRate, debtRatio, fcfMode, fcfStart, fcfGrowthConstant, fcfGrowths, currency, displayScale, ticker, marginOfSafetyPct]);

  async function fetchMarketPrice(symbol: string) {
    setFetchError(null);
    const s = String(symbol || '').trim().toUpperCase();
    // normalize input field to uppercase for clarity
    setTicker(s);
    if (!s) {
      setFetchError('Enter a ticker symbol (e.g., AAPL)');
      return;
    }
    // Simple cache: reuse if same symbol fetched within last 5 minutes
    const cached = lastFetchRef.current;
    if (cached && cached.symbol.toUpperCase() === s.toUpperCase() && Date.now() - cached.time < 5 * 60 * 1000) {
      setCurrentPrice(cached.price);
      if (cached.currency) setCurrency(cached.currency as any);
      return;
    }
    setFetchingPrice(true);
    try {
      // Call server-side API to avoid CORS and 401 issues
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(s)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Server API error ${res.status} ${res.statusText} ${txt}`);
      }
      const json = await res.json();
      if (json?.price && typeof json.price === 'number') {
        setCurrentPrice(json.price);
        if (json.currency && ['USD', 'EUR', 'GBP', 'CHF'].includes(json.currency)) setCurrency(json.currency);
        lastFetchRef.current = { symbol: s.toUpperCase(), time: Date.now(), price: json.price, currency: json.currency };
        // Fetch sparkline series (7d) asynchronously
        (async () => {
          try {
            setSparklineLoading(true);
            const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s)}&chart=1`);
            if (!r.ok) {
              setSparkline(null);
              return;
            }
            const j = await r.json();
            const series = Array.isArray(j?.series) ? j.series.filter((v: any) => typeof v === 'number') : null;
            setSparkline(series);
          } catch (e) {
            setSparkline(null);
          } finally {
            setSparklineLoading(false);
          }
        })();
      } else if (json?.error) {
        throw new Error(json.error);
      } else {
        throw new Error('No price returned from server API');
      }
    } catch (e: any) {
      const msg = String(e?.message || e || 'Failed to fetch price');
      if (msg.includes('401') || msg.toLowerCase().includes('unauthor')) {
        setFetchError('Server returned 401 Unauthorized when fetching Yahoo data. Server-side proxy may be blocked.');
      } else if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        setFetchError('Network error or server unreachable. Check server logs and network.');
      } else {
        setFetchError(msg);
      }
    } finally {
      setFetchingPrice(false);
    }
  }

  async function autofillFromFmp(symbol: string) {
    setFetchError(null);
    const s = String(symbol || '').trim().toUpperCase();
    setTicker(s);
    if (!s) {
      setFetchError('Enter a ticker symbol (e.g., AAPL)');
      return;
    }

    setFetchingFmp(true);
    try {
      const res = await fetch(`/api/dcf-inputs?symbol=${encodeURIComponent(s)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`FMP auto-fill failed (${res.status}) ${txt}`);
      }

      const payload = await res.json();
      const inputs = payload?.inputs || {};
      const fcf = payload?.fcf || {};
      const resolvedCurrency = typeof inputs.currency === 'string' ? inputs.currency.toUpperCase() : '';

      if (['USD', 'EUR', 'GBP', 'CHF'].includes(resolvedCurrency)) {
        setCurrency(resolvedCurrency as any);
      }

      const nextPrice = finiteNumber(inputs.currentPrice);
      if (nextPrice !== null && nextPrice > 0) {
        setCurrentPrice(nextPrice);
        lastFetchRef.current = {
          symbol: s,
          time: Date.now(),
          price: nextPrice,
          currency: ['USD', 'EUR', 'GBP', 'CHF'].includes(resolvedCurrency) ? resolvedCurrency : currency,
        };
      }

      const nextShares = finiteNumber(inputs.sharesOutstanding);
      if (nextShares !== null && nextShares > 0) setSharesOutstanding(Math.round(nextShares));

      const nextCash = finiteNumber(inputs.cash);
      if (nextCash !== null) setCash(Math.max(0, nextCash));

      const nextDebt = finiteNumber(inputs.debt);
      if (nextDebt !== null) setDebt(Math.max(0, nextDebt));

      const nextDiscountRate = finiteNumber(inputs.discountRate);
      if (nextDiscountRate !== null && nextDiscountRate > 0) {
        setDiscountRate(Math.round(clamp(nextDiscountRate, 1, 30) * 100) / 100);
      }

      const nextTerminalGrowth = finiteNumber(inputs.terminalGrowth);
      if (nextTerminalGrowth !== null) {
        setTerminalGrowth(Math.round(clamp(nextTerminalGrowth, 0, 10) * 100) / 100);
      }

      const nextBeta = finiteNumber(inputs.beta);
      if (nextBeta !== null && nextBeta > 0) setBeta(Math.round(nextBeta * 100) / 100);

      const nextTaxRate = finiteNumber(inputs.taxRate);
      if (nextTaxRate !== null) setTaxRate(Math.round(clamp(nextTaxRate, 0, 70) * 100) / 100);

      const nextDebtRatio = finiteNumber(inputs.debtRatio);
      if (nextDebtRatio !== null) setDebtRatio(Math.round(clamp(nextDebtRatio, 0, 99) * 100) / 100);

      const nextFcfGrowth = finiteNumber(fcf.growthRatePct);
      const growthPct = Math.round(clamp(nextFcfGrowth ?? fcfGrowthConstant, -15, 25) * 100) / 100;
      setFcfGrowthConstant(growthPct);

      const forecast = Array.isArray(fcf.forecast)
        ? fcf.forecast
            .map((v: any) => finiteNumber(v))
            .filter((v: number | null): v is number => v !== null)
            .slice(0, 10)
            .map((v: number) => Math.round(v * 100) / 100)
        : [];

      const startFromApi = finiteNumber(fcf.start) ?? finiteNumber(fcf.latestHistorical);
      let appliedFcf = false;
      if (forecast.length >= 3) {
        setFcfMode('constant');
        setFcfGrowths([]);
        setFcfList(forecast);
        setFcfStart(forecast[0]);
        appliedFcf = true;
      } else {
        const start = startFromApi;
        if (start !== null) {
          const y1 = Math.round(start * 100) / 100;
          const g = growthPct / 100;
          const generated = Array.from({ length: 5 }, (_, i) => Math.round(y1 * Math.pow(1 + g, i) * 100) / 100);
          setFcfMode('constant');
          setFcfGrowths([]);
          setFcfStart(y1);
          setFcfList(generated);
          appliedFcf = true;
        }
      }

      if (!appliedFcf) {
        throw new Error('FMP did not return usable free cash flow data for this symbol.');
      }

      // Make auto-filled workflow the default and keep valuation model in Gordon mode.
      setSimpleMode(true);
      setUseWacc(false);
      setUseMultiple(false);
      setPreset(null);

      const asOf = typeof payload?.asOf === 'string' && payload.asOf.trim() ? payload.asOf.trim() : null;
      toast?.({
        title: 'FMP auto-fill complete',
        description: asOf ? `${s} assumptions loaded (as of ${asOf}).` : `${s} assumptions loaded from FMP.`,
      });
    } catch (e: any) {
      const msg = String(e?.message || e || 'Failed to auto-fill from FMP');
      setFetchError(msg);
    } finally {
      setFetchingFmp(false);
    }
  }

  // Scenario helpers
  function saveScenario(name: string) {
    if (!name) return toast?.({ title: 'Name required', description: 'Enter a name for the scenario' });
    const s = {
      name,
      state: {
        discountRate,
        terminalGrowth,
        terminalMultiple,
        useMultiple,
        sharesOutstanding,
        cash,
        debt,
        fcfList,
        preset,
        // persist new fields into scenario
        useWacc,
        riskFreeRate,
        beta,
        marketRiskPremium,
        costOfDebt,
        taxRate,
        debtRatio,
        fcfMode,
        fcfStart,
        fcfGrowthConstant,
        fcfGrowths,
        currency,
      },
    };
    setScenarios((cur) => {
      const filtered = cur.filter((c) => c.name !== name);
      return [...filtered, s];
    });
    toast?.({ title: 'Saved', description: `Scenario '${name}' saved` });
    setScenarioName('');
  }

  function loadScenario(name: string) {
    const s = scenarios.find((c) => c.name === name);
    if (!s) return;
    const st = s.state;
    setDiscountRate(st.discountRate ?? discountRate);
    setTerminalGrowth(st.terminalGrowth ?? terminalGrowth);
    setTerminalMultiple(st.terminalMultiple ?? terminalMultiple);
    setUseMultiple(st.useMultiple ?? useMultiple);
    setSharesOutstanding(st.sharesOutstanding ?? sharesOutstanding);
    setCash(st.cash ?? cash);
    setDebt(st.debt ?? debt);
    setFcfList(Array.isArray(st.fcfList) ? st.fcfList : fcfList);
    setPreset(st.preset ?? preset);
    // load new fields if present
    setUseWacc(st.useWacc ?? useWacc);
    setRiskFreeRate(st.riskFreeRate ?? riskFreeRate);
    setBeta(st.beta ?? beta);
    setMarketRiskPremium(st.marketRiskPremium ?? marketRiskPremium);
    setCostOfDebt(st.costOfDebt ?? costOfDebt);
    setTaxRate(st.taxRate ?? taxRate);
    setDebtRatio(st.debtRatio ?? debtRatio);
    setFcfMode(st.fcfMode ?? fcfMode);
    setFcfStart(st.fcfStart ?? fcfStart);
    setFcfGrowthConstant(st.fcfGrowthConstant ?? fcfGrowthConstant);
    setFcfGrowths(Array.isArray(st.fcfGrowths) ? st.fcfGrowths : fcfGrowths);
    setCurrency(st.currency ?? currency);
    toast?.({ title: 'Loaded', description: `Scenario '${name}' loaded` });
  }

  function performDelete(name: string) {
    const s = scenarios.find((c) => c.name === name);
    if (!s) return;
    // remove immediately
    setScenarios((cur) => cur.filter((c) => c.name !== name));
    // provide undo via toast action
    let handle: any = null;
    handle = toast?.({
      title: 'Scenario deleted',
      description: `Deleted '${name}'.`,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => {
            // restore
            setScenarios((cur) => {
              if (cur.find((x) => x.name === s.name)) return cur;
              return [...cur, s];
            });
            // highlight restored item and scroll into view
            setTimeout(() => {
              setHighlightedScenario(s.name);
              const node = scenarioRefs.current[s.name];
              if (node && typeof node.scrollIntoView === 'function') {
                node.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              // focus first actionable element (Load button) for keyboard users
              try {
                const btn = node?.querySelector('button');
                if (btn && typeof (btn as HTMLButtonElement).focus === 'function') {
                  (btn as HTMLButtonElement).focus();
                }
              } catch (e) {
                // ignore
              }
              setTimeout(() => setHighlightedScenario(null), 3000);
            }, 50);
            handle?.dismiss?.();
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  }

  // Sensitivity table calculation (per-share) for a grid of discount / growth or multiple
  const calculatePerShare = useCallback(
    (dr: number, varValue: number, useMult: boolean, fcfArr = fcfList) => {
      const r = dr / 100;
      if (!Number.isFinite(r) || r <= -0.99) return 0;
      let pv = 0;
      for (let i = 0; i < fcfArr.length; i++) {
        const f = numeric(fcfArr[i], currency);
        const period = useMidYearConvention ? i + 0.5 : i + 1;
        pv += f / Math.pow(1 + r, period);
      }
      const lastFcf = numeric(fcfArr[fcfArr.length - 1], currency);
      let tv = 0;
      if (!useMult) {
        const g = varValue / 100;
        if (r > g) tv = (lastFcf * (1 + g)) / (r - g);
      } else {
        tv = lastFcf * varValue;
      }
      const terminalPeriod = Math.max(0.5, fcfArr.length - (useMidYearConvention ? 0.5 : 0));
      const pvTv = tv / Math.pow(1 + r, terminalPeriod);
      const ev = pv + pvTv;
      const eq = ev + numeric(cash, currency) - numeric(debt, currency);
      return eq / Math.max(1, numeric(sharesOutstanding, currency));
    },
    [fcfList, cash, debt, sharesOutstanding, currency, useMidYearConvention],
  );

  // dynamic sensitivity ranges around current assumptions
  const sensitivityDiscounts = useMemo(() => {
    const base = Math.round(discountRate);
    return Array.from({ length: 5 }, (_, i) => Math.max(1, Math.min(30, base - 2 + i)));
  }, [discountRate]);

  const sensitivityGrowths = useMemo(() => {
    const base = Math.round(terminalGrowth);
    return Array.from({ length: 5 }, (_, i) => Math.max(0, base - 2 + i));
  }, [terminalGrowth]);

  const sensitivityMultiples = useMemo(() => {
    const base = Math.round(terminalMultiple);
    return Array.from({ length: 5 }, (_, i) => Math.max(1, base - 4 + i * 2));
  }, [terminalMultiple]);

  const sensitivityVars = useMultiple ? sensitivityMultiples : sensitivityGrowths;

  function formatCurrencyWithSymbol(v: number) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
    } catch (e) {
      return formatCurrency(v) + ' ' + currency;
    }
  }

  const quickCases = useMemo(() => {
    const dr = numeric(discountRate, currency);
    const tg = numeric(terminalGrowth, currency);
    return [
      {
        name: 'Bear',
        perShare: calculatePerShare(Math.min(35, dr + 1.5), Math.max(0, tg - 0.8), false),
      },
      {
        name: 'Base',
        perShare: calculatePerShare(dr, tg, false),
      },
      {
        name: 'Bull',
        perShare: calculatePerShare(Math.max(1, dr - 1.5), tg + 0.8, false),
      },
    ];
  }, [calculatePerShare, discountRate, terminalGrowth, currency]);

  const riskFlags = useMemo(() => {
    const flags: Array<{ id: string; level: 'high' | 'medium' | 'low'; title: string; detail: string }> = [];
    const dr = numeric(discountRate, currency);
    const tg = numeric(terminalGrowth, currency);
    const shares = numeric(sharesOutstanding, currency);
    const ev = enterpriseValue;
    const negativeYears = fcfList.filter((v) => numeric(v, currency) <= 0).length;

    if (!useMultiple && dr <= tg) {
      flags.push({
        id: 'rate-growth',
        level: 'high',
        title: 'Invalid Gordon setup',
        detail: `Discount rate (${dr.toFixed(2)}%) must be above terminal growth (${tg.toFixed(2)}%).`,
      });
    }

    if (terminalWeightPct >= 80) {
      flags.push({
        id: 'terminal-heavy-high',
        level: 'high',
        title: 'Terminal value concentration',
        detail: `Terminal value is ${terminalWeightPct.toFixed(1)}% of enterprise value.`,
      });
    } else if (terminalWeightPct >= 70) {
      flags.push({
        id: 'terminal-heavy-medium',
        level: 'medium',
        title: 'Terminal value is dominant',
        detail: `Terminal value is ${terminalWeightPct.toFixed(1)}% of enterprise value.`,
      });
    }

    if (fcfCagrPct !== null && Math.abs(fcfCagrPct) >= 30) {
      flags.push({
        id: 'fcf-cagr-high',
        level: 'high',
        title: 'Extreme FCF trajectory',
        detail: `Projected FCF CAGR is ${fcfCagrPct.toFixed(1)}%.`,
      });
    } else if (fcfCagrPct !== null && Math.abs(fcfCagrPct) >= 20) {
      flags.push({
        id: 'fcf-cagr-medium',
        level: 'medium',
        title: 'Aggressive FCF trajectory',
        detail: `Projected FCF CAGR is ${fcfCagrPct.toFixed(1)}%.`,
      });
    }

    if (negativeYears >= 2) {
      flags.push({
        id: 'negative-fcf-high',
        level: 'high',
        title: 'Multiple negative FCF years',
        detail: `${negativeYears} forecast years have zero/negative free cash flow.`,
      });
    } else if (negativeYears === 1) {
      flags.push({
        id: 'negative-fcf-medium',
        level: 'medium',
        title: 'Negative FCF year',
        detail: 'One forecast year has zero/negative free cash flow.',
      });
    }

    if (shares <= 0) {
      flags.push({
        id: 'shares-invalid',
        level: 'high',
        title: 'Shares outstanding invalid',
        detail: 'Shares outstanding must be greater than zero.',
      });
    }

    if (ev > 0 && netDebt > ev * 0.6) {
      flags.push({
        id: 'leverage-pressure',
        level: 'medium',
        title: 'High leverage pressure',
        detail: `Net debt is ${((netDebt / ev) * 100).toFixed(1)}% of enterprise value.`,
      });
    }

    const weight = { high: 0, medium: 1, low: 2 } as const;
    return flags.sort((a, b) => weight[a.level] - weight[b.level]).slice(0, 5);
  }, [
    discountRate,
    terminalGrowth,
    sharesOutstanding,
    enterpriseValue,
    fcfList,
    currency,
    useMultiple,
    terminalWeightPct,
    fcfCagrPct,
    netDebt,
  ]);

  const assumptionImpacts = useMemo(() => {
    const base = perShare;
    if (!Number.isFinite(base)) return [] as Array<{ id: string; label: string; delta: number; shockedPerShare: number; width: number }>;

    const dr = numeric(discountRate, currency);
    const tg = numeric(terminalGrowth, currency);
    const tm = numeric(terminalMultiple, currency);
    const shares = Math.max(1, numeric(sharesOutstanding, currency));
    const terminalVar = useMultiple ? tm : tg;
    const shockedFcf = fcfList.map((v) => numeric(v, currency) * 1.1);
    const shockedNetDebt = netDebt * 1.1;

    const raw = [
      {
        id: 'discount-rate',
        label: 'Discount Rate +1.0%',
        shockedPerShare: calculatePerShare(clamp(dr + 1, 1, 60), terminalVar, useMultiple),
      },
      {
        id: 'terminal',
        label: useMultiple ? 'Terminal Multiple +1.0x' : 'Terminal Growth +0.5%',
        shockedPerShare: useMultiple
          ? calculatePerShare(dr, tm + 1, true)
          : calculatePerShare(dr, clamp(tg + 0.5, -5, 20), false),
      },
      {
        id: 'fcf-level',
        label: 'FCF Level +10%',
        shockedPerShare: calculatePerShare(dr, terminalVar, useMultiple, shockedFcf),
      },
      {
        id: 'net-debt',
        label: 'Net Debt +10%',
        shockedPerShare: (enterpriseValue - shockedNetDebt) / shares,
      },
    ].map((item) => ({
      ...item,
      delta: item.shockedPerShare - base,
    }));

    const maxAbsDelta = Math.max(...raw.map((item) => Math.abs(item.delta)), 0);
    return raw.map((item) => ({
      ...item,
      width: maxAbsDelta > 0 ? Math.max(8, (Math.abs(item.delta) / maxAbsDelta) * 100) : 0,
    }));
  }, [
    perShare,
    discountRate,
    terminalGrowth,
    terminalMultiple,
    sharesOutstanding,
    useMultiple,
    fcfList,
    netDebt,
    enterpriseValue,
    currency,
    calculatePerShare,
  ]);

  const currentPriceValue = useMemo(() => {
    const cp = numeric(currentPrice, currency);
    return Number.isFinite(cp) && cp > 0 ? cp : null;
  }, [currentPrice, currency]);

  const mosStatus = useMemo(() => {
    if (currentPriceValue === null) {
      return { label: 'No market price', tone: 'neutral' as const, deltaPct: null as number | null };
    }
    const deltaPct = ((buyBelowPrice - currentPriceValue) / currentPriceValue) * 100;
    if (currentPriceValue <= buyBelowPrice) {
      return { label: 'Inside MoS', tone: 'positive' as const, deltaPct };
    }
    return { label: 'Above MoS', tone: 'negative' as const, deltaPct };
  }, [buyBelowPrice, currentPriceValue]);

  const terminalDependence = useMemo(() => {
    if (terminalWeightPct >= 80) {
      return { label: 'Very high', tone: 'negative' as const };
    }
    if (terminalWeightPct >= 70) {
      return { label: 'Elevated', tone: 'neutral' as const };
    }
    return { label: 'Balanced', tone: 'positive' as const };
  }, [terminalWeightPct]);

  const rateGrowthCheck = useMemo(() => {
    if (useMultiple) {
      return {
        label: 'Multiple model',
        tone: 'neutral' as const,
        detail: 'Gordon spread not required',
      };
    }
    const spread = effectiveRatePct - numeric(terminalGrowth, currency);
    if (spread > 1.5) {
      return {
        label: 'Healthy spread',
        tone: 'positive' as const,
        detail: `${spread.toFixed(2)}%`,
      };
    }
    if (spread > 0) {
      return {
        label: 'Thin spread',
        tone: 'neutral' as const,
        detail: `${spread.toFixed(2)}%`,
      };
    }
    return {
      label: 'Invalid spread',
      tone: 'negative' as const,
      detail: `${spread.toFixed(2)}%`,
    };
  }, [currency, effectiveRatePct, terminalGrowth, useMultiple]);

  const decisionScore = useMemo(() => {
    let score = 100;
    if (mosStatus.tone === 'negative') score -= 20;
    if (mosStatus.tone === 'neutral') score -= 8;

    if (terminalWeightPct >= 80) score -= 25;
    else if (terminalWeightPct >= 70) score -= 15;
    else if (terminalWeightPct >= 60) score -= 8;

    if (!useMultiple && effectiveRatePct <= numeric(terminalGrowth, currency)) score -= 25;

    const riskPenalty = riskFlags.reduce((sum, flag) => {
      if (flag.level === 'high') return sum + 12;
      if (flag.level === 'medium') return sum + 6;
      return sum + 3;
    }, 0);
    score -= Math.min(40, riskPenalty);

    return clamp(Math.round(score), 0, 100);
  }, [
    mosStatus.tone,
    terminalWeightPct,
    useMultiple,
    effectiveRatePct,
    terminalGrowth,
    currency,
    riskFlags,
  ]);

  const decisionBand = useMemo(() => {
    if (decisionScore >= 80) {
      return { label: 'Robust setup', tone: 'positive' as const };
    }
    if (decisionScore >= 60) {
      return { label: 'Watch assumptions', tone: 'neutral' as const };
    }
    return { label: 'High model risk', tone: 'negative' as const };
  }, [decisionScore]);

  const errors: string[] = [];
  if (numeric(sharesOutstanding, currency) <= 0) errors.push('Shares outstanding must be greater than 0.');
  const effectiveRate = effectiveRatePct / 100;
  if (!useMultiple && effectiveRate <= numeric(terminalGrowth, currency) / 100)
    errors.push('WACC/Discount rate should be greater than terminal growth for a valid Gordon terminal value.');

  const qualityNotes: string[] = [];
  if (fcfCagrPct !== null && Math.abs(fcfCagrPct) > 25)
    qualityNotes.push('FCF growth trajectory is very steep. Recheck assumptions.');

  const forecastChartData = useMemo(() => {
    let cumulative = 0;
    return calculationRows.map((row) => {
      cumulative += row.pv;
      return {
        label: `Y${row.year}`,
        projected: row.fcf,
        present: row.pv,
        cumulative,
        sharePct: enterpriseValue > 0 ? (row.pv / enterpriseValue) * 100 : 0,
      };
    });
  }, [calculationRows, enterpriseValue]);

  const chartTotals = useMemo(() => {
    const totalProjected = calculationRows.reduce((sum, row) => sum + row.fcf, 0);
    const totalPresent = calculationRows.reduce((sum, row) => sum + row.pv, 0);
    const discountDragPct =
      totalProjected > 0 ? Math.max(0, ((totalProjected - totalPresent) / totalProjected) * 100) : 0;
    const explicitSharePct = enterpriseValue > 0 ? (totalPresent / enterpriseValue) * 100 : 0;
    return { totalPresent, discountDragPct, explicitSharePct };
  }, [calculationRows, enterpriseValue]);

  function updateFcf(idx: number, value: string) {
    const copy = [...fcfList];
    copy[idx] = numeric(value, currency);
    setFcfList(copy);
  }

  function changeFcfBy(idx: number, delta: number) {
    const copy = [...fcfList];
    copy[idx] = Math.round((numeric(copy[idx], currency) + delta) * 100) / 100;
    setFcfList(copy);
  }

  function addYear() {
    if (fcfMode === 'per-year') {
      setFcfGrowths((prev) => [...prev, 5]);
    } else if (fcfMode === 'constant') {
      const start = numeric(fcfStart, currency);
      const g = numeric(fcfGrowthConstant, currency) / 100;
      const years = fcfList.length + 1;
      const arr = Array.from({ length: years }, (_, i) => Math.round(start * Math.pow(1 + g, i) * 100) / 100);
      setFcfList(arr);
    } else {
      const last = fcfList[fcfList.length - 1] ?? 0;
      setFcfList([...fcfList, Math.round(last * 1.05 * 100) / 100]);
    }
  }

  function removeYear(idx: number) {
    if (fcfList.length <= 1) return;
    const copy = [...fcfList];
    copy.splice(idx, 1);
    setFcfList(copy);
    if (fcfMode === 'per-year') {
      const gcopy = [...fcfGrowths];
      gcopy.splice(idx, 1);
      setFcfGrowths(gcopy);
    }
  }

  function setNetDebtValue(value: number) {
    if (value >= 0) {
      setDebt(value);
      setCash(0);
      return;
    }
    setDebt(0);
    setCash(Math.abs(value));
  }

  function setForecastYears(value: number) {
    const years = Math.max(3, Math.min(10, Math.round(value || 5)));
    setFcfList((prev) => {
      if (prev.length === years) return prev;
      const current = prev.length ? [...prev] : [numeric(fcfStart, currency) || 0];
      if (current.length > years) return current.slice(0, years);
      const growth = numeric(fcfGrowthConstant, currency) / 100;
      while (current.length < years) {
        const last = current[current.length - 1] ?? (numeric(fcfStart, currency) || 0);
        current.push(Math.round(last * (1 + growth) * 100) / 100);
      }
      return current;
    });
  }

  useEffect(() => {
    if (!simpleMode) return;
    if (fcfMode !== 'constant') setFcfMode('constant');
    if (useWacc) setUseWacc(false);
    if (useMultiple) setUseMultiple(false);
  }, [simpleMode, fcfMode, useWacc, useMultiple]);

  // Advanced mode is intentionally disabled in this streamlined UI.
  useEffect(() => {
    if (!simpleMode) setSimpleMode(true);
  }, [simpleMode]);

  // Initialize derived growth controls only when the user changes mode,
  // otherwise we can create a circular update chain in auto-generation mode.
  useEffect(() => {
    const prevMode = prevFcfModeRef.current;
    if (prevMode === fcfMode) return;
    prevFcfModeRef.current = fcfMode;

    if (fcfMode === 'manual' || fcfList.length === 0) return;

    const nextStart = fcfList[0] ?? 0;
    setFcfStart((prev) => (Number(prev) === nextStart ? prev : nextStart));

    if (fcfMode === 'constant') {
      let totalG = 0;
      for (let i = 1; i < fcfList.length; i++) {
        if (fcfList[i - 1] !== 0) {
          const g = ((fcfList[i] / fcfList[i - 1]) - 1) * 100;
          totalG += g;
        }
      }
      const avgG = fcfList.length > 1 ? totalG / (fcfList.length - 1) : 5;
      setFcfGrowthConstant((prev) => (Math.abs(prev - avgG) < 1e-9 ? prev : avgG));
      return;
    }

    const gs: number[] = [];
    for (let i = 1; i < fcfList.length; i++) {
      if (fcfList[i - 1] !== 0) {
        const g = ((fcfList[i] / fcfList[i - 1]) - 1) * 100;
        gs.push(g);
      } else {
        gs.push(5);
      }
    }
    setFcfGrowths((prev) => (numberArraysEqual(prev, gs) ? prev : gs));
  }, [fcfMode, fcfList]);

  // Automated FCF generation
  useEffect(() => {
    if (fcfMode === 'manual') return;
    const start = numeric(fcfStart, currency);
    if (fcfMode === 'constant') {
      const g = numeric(fcfGrowthConstant, currency) / 100;
      const years = fcfList.length || 5;
      const arr = Array.from({ length: years }, (_, i) => Math.round(start * Math.pow(1 + g, i) * 100) / 100);
      setFcfList((prev) => (numberArraysEqual(prev, arr) ? prev : arr));
    } else if (fcfMode === 'per-year') {
      if (fcfGrowths.length >= 1) {
        let current = start;
        const arr: number[] = [];
        for (let i = 0; i < fcfGrowths.length; i++) {
          current = Math.round(current * (1 + numeric(fcfGrowths[i], currency) / 100) * 100) / 100;
          arr.push(current);
        }
        setFcfList((prev) => (numberArraysEqual(prev, arr) ? prev : arr));
      }
    }
  }, [fcfMode, fcfStart, fcfGrowthConstant, fcfGrowths, currency, fcfList.length]);

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="p-0 pb-4 pr-16 sm:pr-20">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Discounted Cash Flow Calculator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider delayDuration={100}>
          <div className="mb-3 md:hidden">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setMobilePanel('inputs')}
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
          <div className="mb-3 hidden md:block">
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
            className={`grid grid-cols-1 gap-4 md:gap-6 ${
              desktopPanel === 'results' ? 'md:grid-cols-12 md:items-start' : 'md:grid-cols-3'
            }`}
          >
            {/* Left: Inputs & Forecasts */}
            <div className={`flex flex-col gap-4 ${desktopPanel === 'results' ? 'md:col-span-8' : 'md:col-span-3'}`}>
              <div
                className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${
                  mobilePanel === 'results' ? 'hidden' : 'block'
                } ${
                  desktopPanel === 'results' ? 'md:hidden' : 'md:block'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                    <h4 className="text-base font-semibold">Assumptions</h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                    <Input
                      placeholder="Ticker (AAPL)"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && ticker) {
                          e.preventDefault();
                          autofillFromFmp(ticker);
                        }
                      }}
                      type="text"
                      className="w-full"
                    />
                    <Button size="sm" className="w-full md:w-auto" onClick={() => autofillFromFmp(ticker)} disabled={fetchingFmp || !ticker}>
                      {fetchingFmp ? 'Loading…' : 'Auto-fill'}
                    </Button>
                    <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => fetchMarketPrice(ticker)} disabled={fetchingPrice || !ticker}>
                      {fetchingPrice ? 'Quote…' : 'Live Quote'}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Discount Rate (% p.a.)</label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input value={discountRate} onChange={(e) => setDiscountRate(numeric(e.target.value, currency))} type="number" className="w-full sm:w-32" />
                      <Slider value={[discountRate]} onValueChange={(v: number[]) => setDiscountRate(Number(v[0]))} min={1} max={30} step={0.1} aria-label="Discount rate" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {simpleMode ? null : useWacc ? (
                        <span>Using WACC: <strong>{wacc ? `${Number(wacc).toFixed(2)}%` : '—'}</strong></span>
                      ) : (
                        <span>WACC available: <strong>{wacc ? `${Number(wacc).toFixed(2)}%` : '—'}</strong> — toggle 'Use WACC' to apply</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Terminal Growth (% p.a.)</label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input value={terminalGrowth} onChange={(e) => setTerminalGrowth(numeric(e.target.value, currency))} type="number" className="w-full sm:w-32" />
                      <Slider value={[terminalGrowth]} onValueChange={(v: number[]) => setTerminalGrowth(Number(v[0]))} min={0} max={10} step={0.1} aria-label="Terminal growth" />
                    </div>
                  </div>
                </div>
                {!simpleMode && useWacc && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium">WACC Components</h5>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="text-sm">Risk Free Rate (%)</label>
                        <Input value={riskFreeRate} onChange={(e) => setRiskFreeRate(numeric(e.target.value, currency))} type="number" />
                      </div>
                      <div>
                        <label className="text-sm">Beta</label>
                        <Input value={beta} onChange={(e) => setBeta(numeric(e.target.value, currency))} type="number" />
                      </div>
                      <div>
                        <label className="text-sm">Market Risk Premium (%)</label>
                        <Input value={marketRiskPremium} onChange={(e) => setMarketRiskPremium(numeric(e.target.value, currency))} type="number" />
                      </div>
                      <div>
                        <label className="text-sm">Cost of Debt (%)</label>
                        <Input value={costOfDebt} onChange={(e) => setCostOfDebt(numeric(e.target.value, currency))} type="number" />
                      </div>
                      <div>
                        <label className="text-sm">Tax Rate (%)</label>
                        <Input value={taxRate} onChange={(e) => setTaxRate(numeric(e.target.value, currency))} type="number" />
                      </div>
                      <div>
                        <label className="text-sm">Debt Ratio (%)</label>
                        <Input value={debtRatio} onChange={(e) => setDebtRatio(numeric(e.target.value, currency))} type="number" />
                      </div>
                    </div>
                  </div>
                )}
                <div className={`mt-4 grid grid-cols-1 gap-3 ${simpleMode ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
                  <div className="space-y-2">
                    <label className="block text-sm">Shares Outstanding</label>
                    <Input value={sharesOutstanding} onChange={(e) => setSharesOutstanding(numeric(e.target.value, currency))} type="number" className="w-full" />
                  </div>
                  {simpleMode ? (
                    <div className="space-y-2">
                      <label className="block text-sm">Net Debt ({currency})</label>
                      <Input
                        value={netDebt}
                        onChange={(e) => setNetDebtValue(numeric(e.target.value, currency))}
                        type="number"
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm">Cash</label>
                        <Input value={cash} onChange={(e) => setCash(numeric(e.target.value, currency))} type="number" className="w-full" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm">Debt</label>
                        <Input value={debt} onChange={(e) => setDebt(numeric(e.target.value, currency))} type="number" className="w-full" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="block text-sm">Current Price ({currency})</label>
                    <Input className="w-full" value={currentPrice as any} onChange={(e) => setCurrentPrice(e.target.value)} type="number" />
                    {fetchError && <div className="text-xs text-red-600 mt-1">{fetchError}</div>}
                  </div>
                </div>
                {!simpleMode && (
                  <div className="mt-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h5 className="text-sm font-medium">Terminal</h5>
                      <div className="text-xs text-muted-foreground">Choose terminal valuation method</div>
                    </div>
                    <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <Toggle pressed={useMultiple} onPressedChange={(v) => setUseMultiple(Boolean(v))} size="sm">{useMultiple ? 'Multiple (on FCF)' : 'Gordon'}</Toggle>
                      {useMultiple && <Input value={terminalMultiple} onChange={(e) => setTerminalMultiple(numeric(e.target.value, currency))} type="number" className="w-full sm:w-28" />}
                    </div>
                  </div>
                )}
              </div>
              <div
                className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${
                  mobilePanel === 'results' ? 'hidden' : 'block'
                } ${
                  desktopPanel === 'results' ? 'md:hidden' : 'md:block'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-base font-semibold">Projected Free Cash Flows</h4>
                  </div>
                  {!simpleMode && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      <Input placeholder="Scenario name" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} className="w-full sm:w-36" />
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => saveScenario(scenarioName)} disabled={!scenarioName.trim()}>Save</Button>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={addYear}>Add Year</Button>
                    </div>
                  )}
                </div>
                {simpleMode ? (
                  <>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-sm">Start FCF (Y1)</label>
                        <Input
                          value={fcfStart}
                          onChange={(e) => setFcfStart(numeric(e.target.value, currency))}
                          type="number"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Growth (% p.a.)</label>
                        <Input
                          value={fcfGrowthConstant}
                          onChange={(e) => setFcfGrowthConstant(numeric(e.target.value, currency))}
                          type="number"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Forecast Years</label>
                        <Input
                          value={fcfList.length}
                          onChange={(e) => setForecastYears(numeric(e.target.value, currency))}
                          type="number"
                          min={3}
                          max={10}
                        />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {fcfList.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded border border-border/50 px-3 py-1.5 text-sm">
                          <span className="text-muted-foreground">Year {idx + 1}</span>
                          <span className="font-medium">{formatLarge(v).short}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Toggle pressed={fcfMode === 'manual'} onPressedChange={(pressed) => pressed && setFcfMode('manual')}>Manual</Toggle>
                      <Toggle pressed={fcfMode === 'constant'} onPressedChange={(pressed) => pressed && setFcfMode('constant')}>Constant Growth</Toggle>
                      <Toggle pressed={fcfMode === 'per-year'} onPressedChange={(pressed) => pressed && setFcfMode('per-year')}>Per-Year Growth</Toggle>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {fcfMode !== 'manual' && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <div className="w-14 text-sm font-medium text-muted-foreground sm:w-16">Start</div>
                          <Input
                            value={fcfStart}
                            onChange={(e) => setFcfStart(numeric(e.target.value, currency))}
                            type="number"
                            className="w-full min-w-0 sm:w-32"
                          />
                        </div>
                      )}
                      {fcfMode === 'constant' && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <div className="w-14 text-sm font-medium text-muted-foreground sm:w-16">Growth %</div>
                          <Input
                            value={fcfGrowthConstant}
                            onChange={(e) => setFcfGrowthConstant(numeric(e.target.value, currency))}
                            type="number"
                            className="w-full min-w-0 sm:w-32"
                          />
                        </div>
                      )}
                      {fcfMode === 'per-year' &&
                        fcfGrowths.map((v, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="w-14 text-sm font-medium text-muted-foreground sm:w-16">Y{idx + 1} %</div>
                            <Input
                              value={v}
                              onChange={(e) => {
                                const copy = [...fcfGrowths];
                                copy[idx] = numeric(e.target.value, currency);
                                setFcfGrowths(copy);
                              }}
                              type="number"
                              className="w-full min-w-0 sm:w-32"
                            />
                            <Button size="sm" variant="ghost" onClick={() => removeYear(idx)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      {fcfList.map((v, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <div className="w-14 text-sm font-medium text-muted-foreground sm:w-16">Y{idx + 1}</div>
                          {fcfMode === 'manual' ? (
                            <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                              <Button size="sm" variant="outline" onClick={() => changeFcfBy(idx, -1)}>
                                -
                              </Button>
                              <Input
                                value={v}
                                onChange={(e) => updateFcf(idx, e.target.value)}
                                type="number"
                                className="w-full min-w-0 sm:w-32"
                                aria-label={`FCF year ${idx + 1}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    changeFcfBy(idx, 1);
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    changeFcfBy(idx, -1);
                                  }
                                }}
                              />
                              <Button size="sm" variant="outline" onClick={() => changeFcfBy(idx, 1)}>
                                +
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full text-sm sm:w-40">{formatLarge(v).short}</div>
                          )}
                          {fcfMode !== 'per-year' && (
                            <Button size="sm" variant="ghost" onClick={() => removeYear(idx)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div
                className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${
                  mobilePanel === 'results' ? 'block' : 'hidden'
                } ${
                  desktopPanel === 'results' ? 'md:block' : 'md:hidden'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold">Forecast View</h4>
                  <div className="inline-flex rounded-md border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => setDetailView('chart')}
                      className={`rounded px-2.5 py-1 text-[11px] ${detailView === 'chart' ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Chart
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailView('mechanics')}
                      className={`rounded px-2.5 py-1 text-[11px] ${detailView === 'mechanics' ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      DCF Mechanics
                    </button>
                  </div>
                </div>
                {detailView === 'chart' ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                        <div className="text-[10px] text-muted-foreground">Explicit PV</div>
                        <div className="mt-1 text-xs font-semibold">{formatLarge(chartTotals.totalPresent).short}</div>
                      </div>
                      <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                        <div className="text-[10px] text-muted-foreground">Terminal PV</div>
                        <div className="mt-1 text-xs font-semibold">{formatLarge(pvTerminal).short}</div>
                      </div>
                      <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                        <div className="text-[10px] text-muted-foreground">Explicit EV Share</div>
                        <div className="mt-1 text-xs font-semibold">{chartTotals.explicitSharePct.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Projected FCF
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-1">
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                        Present Value
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-1">
                        <span className="h-2 w-2 rounded-full bg-zinc-100" />
                        Cumulative PV (right)
                      </div>
                    </div>
                    <div className="h-64 rounded-md border border-border/60 bg-black p-2 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={forecastChartData} margin={{ top: 10, right: 10, left: 4, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#a1a1aa' }}
                            tickMargin={8}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="yearly"
                            tickFormatter={(v: number) => formatLarge(Number(v)).short}
                            tick={{ fontSize: 11, fill: '#a1a1aa' }}
                            width={74}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, (dataMax: number) => Math.max(1, dataMax * 1.12)]}
                          />
                          <YAxis
                            yAxisId="cumulative"
                            orientation="right"
                            tickFormatter={(v: number) => formatLarge(Number(v)).short}
                            tick={{ fontSize: 11, fill: '#71717a' }}
                            width={74}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, (dataMax: number) => Math.max(1, dataMax * 1.08)]}
                          />
                          <ReTooltip
                            cursor={{ stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1 }}
                            content={({ active, payload, label }) => {
                              if (!active || !payload || payload.length === 0) return null;
                              const row = payload[0]?.payload as
                                | { projected: number; present: number; cumulative: number; sharePct: number }
                                | undefined;
                              const projected = Number(row?.projected ?? 0);
                              const present = Number(row?.present ?? 0);
                              const cumulative = Number(row?.cumulative ?? 0);
                              const sharePct = Number(row?.sharePct ?? 0);
                              const drag =
                                projected > 0
                                  ? Math.max(0, ((projected - present) / projected) * 100)
                                  : 0;
                              return (
                                <div className="min-w-[170px] rounded-md border border-border/70 bg-black/95 px-2.5 py-2 text-[11px]">
                                  <div className="text-[10px] text-muted-foreground">{label}</div>
                                  <div className="mt-1.5 flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Projected</span>
                                    <span className="font-medium">{formatLarge(projected).short}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Present Value</span>
                                    <span className="font-medium">{formatLarge(present).short}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Cumulative PV</span>
                                    <span className="font-medium">{formatLarge(cumulative).short}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">EV Share</span>
                                    <span className="font-medium">{sharePct.toFixed(1)}%</span>
                                  </div>
                                  {projected > 0 && (
                                    <div className="mt-1 flex items-center justify-between gap-3">
                                      <span className="text-muted-foreground">Discount Drag</span>
                                      <span className="font-medium">{drag.toFixed(1)}%</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Bar
                            yAxisId="yearly"
                            dataKey="projected"
                            fill="rgba(52,211,153,0.28)"
                            stroke="#34d399"
                            strokeWidth={1}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={24}
                          />
                          <Bar
                            yAxisId="yearly"
                            dataKey="present"
                            fill="rgba(203,213,225,0.3)"
                            stroke="#cbd5e1"
                            strokeWidth={1}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={20}
                          />
                          <Line
                            yAxisId="cumulative"
                            type="monotone"
                            dataKey="cumulative"
                            stroke="#fafafa"
                            strokeWidth={1.8}
                            dot={{ r: 2, fill: '#fafafa', strokeWidth: 0 }}
                            activeDot={{ r: 4, fill: '#000', stroke: '#fafafa', strokeWidth: 2 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                        <span>Terminal Contribution</span>
                        <span>{terminalWeightPct.toFixed(1)}% of EV</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold">{formatLarge(pvTerminal).short}</div>
                      <div className="mt-1.5 h-1.5 rounded bg-border/50">
                        <div
                          className="h-1.5 rounded bg-zinc-200"
                          style={{ width: `${Math.max(6, Math.min(100, terminalWeightPct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 overflow-auto rounded border border-border/60">
                    <table className="min-w-full text-xs">
                      <thead className="bg-background/50">
                        <tr className="border-b border-border/60">
                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Year</th>
                          <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">FCF</th>
                          <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Period</th>
                          <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Disc. Factor</th>
                          <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">PV(FCF)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationRows.map((row) => (
                          <tr key={row.year} className="border-b border-border/40 last:border-b-0">
                            <td className="px-2 py-1.5">Y{row.year}</td>
                            <td className="px-2 py-1.5 text-right">{formatLarge(row.fcf).short}</td>
                            <td className="px-2 py-1.5 text-right">{row.period.toFixed(0)}</td>
                            <td className="px-2 py-1.5 text-right">{row.discountFactor.toFixed(4)}</td>
                            <td className="px-2 py-1.5 text-right">{formatLarge(row.pv).short}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-border/70 bg-background/40">
                          <td className="px-2 py-1.5 font-medium">Terminal</td>
                          <td className="px-2 py-1.5 text-right"></td>
                          <td className="px-2 py-1.5 text-right">{terminalDiscountPeriod.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right"></td>
                          <td className="px-2 py-1.5 text-right font-medium">{formatLarge(pvTerminal).short}</td>
                        </tr>
                        <tr className="bg-background/50">
                          <td className="px-2 py-1.5 font-semibold">Enterprise Value</td>
                          <td className="px-2 py-1.5 text-right"></td>
                          <td className="px-2 py-1.5 text-right"></td>
                          <td className="px-2 py-1.5 text-right"></td>
                          <td className="px-2 py-1.5 text-right font-semibold">{formatLarge(enterpriseValue).short}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div
                className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${
                  mobilePanel === 'results' ? 'block' : 'hidden'
                } ${
                  desktopPanel === 'results' ? 'md:block' : 'md:hidden'
                }`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold">Forecast Breakdown</h4>
                  <div className="text-[11px] text-muted-foreground">Projected vs discounted cash flow</div>
                </div>
                <div className="mt-3 overflow-auto rounded border border-border/60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-background/50">
                      <tr className="border-b border-border/60">
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Year</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Projected FCF</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Discount</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Present Value</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">EV Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculationRows.map((row) => (
                        <tr key={`forecast-breakdown-${row.year}`} className="border-b border-border/40 last:border-b-0">
                          <td className="px-2 py-1.5">Y{row.year}</td>
                          <td className="px-2 py-1.5 text-right">{formatLarge(row.fcf).short}</td>
                          <td className="px-2 py-1.5 text-right">{row.discountFactor.toFixed(4)}</td>
                          <td className="px-2 py-1.5 text-right">{formatLarge(row.pv).short}</td>
                          <td className="px-2 py-1.5 text-right">
                            {enterpriseValue > 0 ? `${((row.pv / enterpriseValue) * 100).toFixed(1)}%` : '0.0%'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded border border-border/60 bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Explicit PV</div>
                    <div className="mt-0.5 text-xs font-semibold">{formatLarge(npv).short}</div>
                  </div>
                  <div className="rounded border border-border/60 bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Terminal PV</div>
                    <div className="mt-0.5 text-xs font-semibold">{formatLarge(pvTerminal).short}</div>
                  </div>
                  <div className="rounded border border-border/60 bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Discount Drag</div>
                    <div className="mt-0.5 text-xs font-semibold">{chartTotals.discountDragPct.toFixed(1)}%</div>
                  </div>
                  <div className="rounded border border-border/60 bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Explicit EV Share</div>
                    <div className="mt-0.5 text-xs font-semibold">{chartTotals.explicitSharePct.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
              <div
                className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${
                  mobilePanel === 'results' ? 'block' : 'hidden'
                } ${
                  desktopPanel === 'results' ? 'md:block' : 'md:hidden'
                }`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold">Value Bridge</h4>
                  <div className="text-[11px] text-muted-foreground">From discounted cash flow to per-share value</div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/40 px-2.5 py-2 text-xs">
                    <span className="text-muted-foreground">Explicit PV</span>
                    <span className="font-semibold">{formatLarge(npv).short}</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/40 px-2.5 py-2 text-xs">
                    <span className="text-muted-foreground">+ Terminal PV</span>
                    <span className="font-semibold">{formatLarge(pvTerminal).short}</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-2.5 py-2 text-xs">
                    <span className="font-medium">= Enterprise Value</span>
                    <span className="font-semibold">{formatLarge(enterpriseValue).short}</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/40 px-2.5 py-2 text-xs">
                    <span className="text-muted-foreground">{netDebt >= 0 ? '- Net Debt' : '+ Net Cash'}</span>
                    <span className="font-semibold">
                      {netDebt >= 0 ? `-${formatLarge(netDebt).short}` : `+${formatLarge(Math.abs(netDebt)).short}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-2.5 py-2 text-xs">
                    <span className="font-medium">= Equity Value</span>
                    <span className="font-semibold">{formatLarge(equityValue).short}</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/40 px-2.5 py-2 text-xs">
                    <span className="text-muted-foreground">÷ Shares Outstanding</span>
                    <span className="font-semibold">{formatLarge(numeric(sharesOutstanding, currency)).short}</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 bg-background/70 px-2.5 py-2 text-xs">
                    <span className="font-medium">= Intrinsic / Share</span>
                    <span className="font-semibold">{formatCurrencyWithSymbol(perShare)}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: Summary, Cases, Sensitivity, Scenarios */}
            <div
              className={`md:col-span-1 flex flex-col gap-4 ${
                mobilePanel === 'results' ? 'flex' : 'hidden'
              } ${
                desktopPanel === 'results' ? 'md:col-span-4 md:flex md:self-start' : 'md:hidden'
              }`}
            >
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">Enterprise Value <TooltipProvider><Tooltip><TooltipTrigger><Info className="w-4 h-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Enterprise value = present value of projected FCFs + terminal value</TooltipContent></Tooltip></TooltipProvider></div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      <select value={displayScale} onChange={(e) => setDisplayScale(e.target.value as any)} className="rounded border border-border bg-transparent px-1 py-0.5 text-xs">
                        <option value="auto">Auto</option>
                        <option value="raw">Raw</option>
                        <option value="K">K</option>
                        <option value="M">M</option>
                        <option value="B">B</option>
                        <option value="T">T</option>
                      </select>
                    </div>
                  </div>
                </div>
                <>
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-xs text-muted-foreground">Enterprise Value</div>
                        <div className="text-xl font-bold">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span>{formatLarge(enterpriseValue).short}</span>
                              </TooltipTrigger>
                              <TooltipContent>{formatCurrency(enterpriseValue)}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-xs text-muted-foreground">Equity Value</div>
                        <div className="text-lg font-semibold">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span>{formatLarge(equityValue).short}</span>
                              </TooltipTrigger>
                              <TooltipContent>{formatCurrency(equityValue)}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-xs text-muted-foreground">Intrinsic / Share</div>
                        <div className="text-xl font-bold">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span>{formatCurrencyWithSymbol(perShare)}</span>
                              </TooltipTrigger>
                              <TooltipContent>Intrinsic value per share — {formatCurrency(perShare)}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-left">
                      <div className="rounded border border-border/60 bg-background/40 p-2">
                        <div className="text-xs text-muted-foreground">Valuation Signal</div>
                        <div
                          className={`mt-1 text-xs font-semibold ${
                            valuationState.tone === 'positive'
                              ? 'text-green-500'
                              : valuationState.tone === 'negative'
                                ? 'text-red-500'
                                : 'text-foreground'
                          }`}
                        >
                          {valuationState.label}
                        </div>
                      </div>
                      <div className="rounded border border-border/60 bg-background/40 p-2">
                        <div className="text-xs text-muted-foreground">Buy Below</div>
                        <div className="mt-1 text-xs font-semibold">{formatCurrencyWithSymbol(buyBelowPrice)}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">MoS</span>
                          <Input
                            value={marginOfSafetyPct}
                            onChange={(e) => setMarginOfSafetyPct(Math.max(0, Math.min(95, numeric(e.target.value, currency))))}
                            type="number"
                            className="h-6 w-14 text-[11px]"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2.5 text-left">
                      <div className="rounded border border-border/50 bg-background/30 p-2">
                        <div className="text-xs text-muted-foreground">Terminal Weight</div>
                        <div className="mt-0.5 text-xs font-medium">{terminalWeightPct.toFixed(1)}%</div>
                      </div>
                      <div className="rounded border border-border/50 bg-background/30 p-2">
                        <div className="text-xs text-muted-foreground">FCF CAGR</div>
                        <div className="mt-0.5 text-xs font-medium">
                          {fcfCagrPct === null ? '' : `${fcfCagrPct >= 0 ? '+' : ''}${fcfCagrPct.toFixed(1)}%`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 text-sm">
                      {Number(currentPrice) > 0 && upsidePct !== null && (
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="font-medium">{formatCurrency(Number(currentPrice))}</div>
                          <div className={`mt-1 text-sm ${upsidePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {`${upsidePct >= 0 ? '+' : ''}${upsidePct.toFixed(1)}%`}
                          </div>
                        </div>
                      )}
                    </div>
                    {upsidePct !== null && (
                      <div className="mt-2.5">
                        <div className="h-1.5 rounded bg-border/50">
                          <div
                            className={`h-1.5 rounded ${
                              upsidePct >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.max(6, Math.min(100, Math.abs(upsidePct)))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {errors.length > 0 && (
                      <div className="mt-3 text-xs text-red-600">
                        {errors.map((err) => (<div key={err}>• {err}</div>))}
                      </div>
                    )}
                    {qualityNotes.length > 0 && (
                      <div className="mt-2 text-left text-[11px] text-amber-500">
                        {qualityNotes.map((note) => (
                          <div key={note}>• {note}</div>
                        ))}
                      </div>
                    )}
                </>
              </div>
              <div className="rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Quick Cases</div>
                  <div className="text-[10px] text-muted-foreground">Gordon method</div>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {quickCases.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded border border-border/60 px-2.5 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{formatCurrencyWithSymbol(item.perShare)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Risk Flags</div>
                  <div className="text-[10px] text-muted-foreground">
                    {riskFlags.length === 0 ? 'No structural flags' : `${riskFlags.length} active`}
                  </div>
                </div>
                {riskFlags.length === 0 ? (
                  <div className="mt-2.5 rounded border border-border/60 px-2.5 py-2 text-xs text-muted-foreground">
                    Core assumptions look structurally consistent.
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-1.5">
                    {riskFlags.map((flag) => (
                      <div key={flag.id} className="rounded border border-border/60 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium">{flag.title}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              flag.level === 'high'
                                ? 'bg-red-500/10 text-red-400'
                                : flag.level === 'medium'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-zinc-500/10 text-zinc-300'
                            }`}
                          >
                            {flag.level}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{flag.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Assumption Impact</div>
                  <div className="text-[10px] text-muted-foreground">Delta vs base per-share</div>
                </div>
                <div className="mt-2.5 space-y-2">
                  {assumptionImpacts.map((item) => (
                    <div key={item.id} className="rounded border border-border/60 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className={`text-xs font-semibold ${item.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {`${item.delta >= 0 ? '+' : ''}${formatCurrencyWithSymbol(item.delta)}`}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded bg-border/50">
                        <div
                          className={`h-1.5 rounded ${item.delta >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${item.width}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Implied value: {formatCurrencyWithSymbol(item.shockedPerShare)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Decision Checklist</div>
                  <div className="text-[10px] text-muted-foreground">Quick quality gate</div>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between rounded border border-border/60 px-2.5 py-2">
                    <div className="text-xs text-muted-foreground">MoS vs market</div>
                    <div className="flex items-center gap-2">
                      {mosStatus.deltaPct !== null && (
                        <span
                          className={`text-[10px] font-medium ${mosStatus.deltaPct >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {`${mosStatus.deltaPct >= 0 ? '+' : ''}${mosStatus.deltaPct.toFixed(1)}%`}
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${decisionToneClasses(mosStatus.tone)}`}
                      >
                        {mosStatus.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 px-2.5 py-2">
                    <div className="text-xs text-muted-foreground">Terminal dependence</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{terminalWeightPct.toFixed(1)}%</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${decisionToneClasses(terminalDependence.tone)}`}
                      >
                        {terminalDependence.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 px-2.5 py-2">
                    <div className="text-xs text-muted-foreground">Rate vs growth</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{rateGrowthCheck.detail}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${decisionToneClasses(rateGrowthCheck.tone)}`}
                      >
                        {rateGrowthCheck.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border/60 px-2.5 py-2">
                    <div className="text-xs text-muted-foreground">Risk flags</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        H:{riskFlags.filter((flag) => flag.level === 'high').length} M:
                        {riskFlags.filter((flag) => flag.level === 'medium').length} L:
                        {riskFlags.filter((flag) => flag.level === 'low').length}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${decisionToneClasses(
                          riskFlags.some((flag) => flag.level === 'high')
                            ? 'negative'
                            : riskFlags.some((flag) => flag.level === 'medium')
                              ? 'neutral'
                              : 'positive',
                        )}`}
                      >
                        {riskFlags.length === 0 ? 'Clean' : `${riskFlags.length} active`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded border border-border/60 bg-background/40 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Decision Score</span>
                    <span
                      className={`text-xs font-semibold ${
                        decisionScore >= 80 ? 'text-green-400' : decisionScore >= 60 ? 'text-zinc-200' : 'text-red-400'
                      }`}
                    >
                      {decisionScore}/100
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded bg-border/50">
                    <div
                      className={`h-1.5 rounded ${
                        decisionScore >= 80 ? 'bg-green-500' : decisionScore >= 60 ? 'bg-zinc-300' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(6, decisionScore)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{decisionBand.label}</div>
                </div>
              </div>
              {!simpleMode && (
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Sensitivity</div>
                    <button className="text-sm text-muted-foreground" onClick={() => setShowSensitivity((s) => !s)}>{showSensitivity ? 'Hide' : 'Show'}</button>
                  </div>
                  {showSensitivity && (
                    <div className="mt-3 overflow-auto border rounded p-2 bg-card">
                      <table className="text-sm w-full table-auto border-collapse">
                        <thead>
                          <tr>
                            <th className="pr-3">Discount \ {useMultiple ? 'Multiple' : 'Growth'}</th>
                            {sensitivityVars.map((v) => (<th key={v} className="px-2">{v}{useMultiple ? '' : '%'}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {sensitivityDiscounts.map((d) => (
                            <tr key={d} className="border-t">
                              <td className="pr-3 font-medium">{d}%</td>
                              {sensitivityVars.map((v) => {
                                const isBase = d === Math.round(discountRate) && ((useMultiple && v === Math.round(terminalMultiple)) || (!useMultiple && v === Math.round(terminalGrowth)));
                                return (<td key={v} className={`px-2 text-right ${isBase ? 'bg-yellow-100 dark:bg-yellow-900 font-semibold' : ''}`}>{formatCurrencyWithSymbol(calculatePerShare(d, v, useMultiple))}</td>);
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="text-sm font-medium">Saved Scenarios</div>
                    <div className="mt-2 space-y-2">
                      {scenarios.length === 0 ? <div className="text-xs text-muted-foreground">No saved scenarios</div> : scenarios.map((s) => (
                        <div
                          key={s.name}
                          ref={(el) => { scenarioRefs.current[s.name] = el; }}
                          className={`flex items-center justify-between p-2 rounded ${highlightedScenario === s.name ? 'bg-yellow-100 dark:bg-yellow-900' : ''}`}
                        >
                          <div className="text-sm">{s.name}</div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => loadScenario(s.name)}>Load</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => performDelete(s.name)}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
