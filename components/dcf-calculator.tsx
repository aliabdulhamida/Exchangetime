"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { ToastAction } from '@/components/ui/toast';
import { Slider } from '@/components/ui/slider';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid } from 'recharts';

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

export default function DcfCalculator() {
  const [discountRate, setDiscountRate] = useState(10);
  // WACC inputs
  const [useWacc, setUseWacc] = useState(true);
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
  const [fcfList, setFcfList] = useState<number[]>([100, 110, 121, 133.1, 146.41]);
  const [preset, setPreset] = useState<'conservative' | 'base' | 'aggressive' | null>('base');
  const [showSensitivity, setShowSensitivity] = useState(false);
  // Automated FCF generation mode: 'manual' | 'constant' | 'per-year'
  const [fcfMode, setFcfMode] = useState<'manual' | 'constant' | 'per-year'>('manual');
  const [fcfStart, setFcfStart] = useState<number | string>(fcfList[0] ?? 0);
  const [fcfGrowthConstant, setFcfGrowthConstant] = useState(5);
  const [fcfGrowths, setFcfGrowths] = useState<number[]>([]); // per-year growths (%)
  // Scenario management
  const [scenarioName, setScenarioName] = useState('');
  const [scenarios, setScenarios] = useState<Array<{ name: string; state: any }>>([]);
  const [highlightedScenario, setHighlightedScenario] = useState<string | null>(null);
  const scenarioRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  // Currency selection and formatting (define early to avoid TDZ when loading persistence)
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'CHF' | 'GBP'>('USD');
  const [currentPrice, setCurrentPrice] = useState<number | string>(0);
  const [ticker, setTicker] = useState<string>('');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const lastFetchRef = React.useRef<{ symbol: string; time: number; price: number; currency?: string } | null>(null);
  const [displayScale, setDisplayScale] = useState<'auto' | 'raw' | 'K' | 'M' | 'B' | 'T'>('auto');
  const [sparkline, setSparkline] = useState<number[] | null>(null);
  const [sparklineLoading, setSparklineLoading] = useState(false);

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

  const npv = useMemo(() => {
    const r = effectiveRatePct / 100;
    let pv = 0;
    for (let i = 0; i < fcfList.length; i++) {
      const f = numeric(fcfList[i], currency);
      pv += f / Math.pow(1 + r, i + 1);
    }
    return pv;
  }, [fcfList, effectiveRatePct, currency]);

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
    const n = fcfList.length;
    return terminalValue / Math.pow(1 + r, n);
  }, [terminalValue, fcfList.length, effectiveRatePct]);

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

  function applyPreset(p: 'conservative' | 'base' | 'aggressive') {
    setPreset(p);
    if (p === 'conservative') {
      setDiscountRate(12);
      setTerminalGrowth(1);
      setTerminalMultiple(10);
    } else if (p === 'aggressive') {
      setDiscountRate(8);
      setTerminalGrowth(3);
      setTerminalMultiple(16);
    } else {
      setDiscountRate(10);
      setTerminalGrowth(2);
      setTerminalMultiple(12);
    }
    toast?.({ title: 'Preset applied', description: `Applied ${p} assumptions` });
  }

  // Example loader (illustrative values for a large tech company)
  function applyExample(name: 'apple') {
    if (name === 'apple') {
      // Updated with latest reported values as of fiscal year ended September 27, 2025 (sources: 10-K filing, Yahoo Finance, Macrotrends)
      // Free cash flow (annual, last 5 years: 2021 to 2025): 92.953B, 111.443B, 99.584B, 108.807B, 98.767B
      // Weighted-average diluted shares outstanding (FY2025): 15.005B
      // Cash and cash equivalents + short-term marketable securities: 54.697B
      // Non-current term debt: 78.328B (total term debt: 90.678B, but using non-current as per original)
      // Beta (5Y monthly): 1.11
      setDiscountRate(9);
      setTerminalGrowth(2);
      setTerminalMultiple(12);
      setUseMultiple(false);
      setSharesOutstanding(15_005_000_000);
      setCash(54_697_000_000);
      setDebt(78_328_000_000);
      // Seed projected FCFs with the last 5 annual free cash flow figures (in raw dollars, most recent first for projection starting from FY2026)
      setFcfList([98_767_000_000, 108_807_000_000, 99_584_000_000, 111_443_000_000, 92_953_000_000]);
      setPreset(null);
      setBeta(1.11);
      setRiskFreeRate(4.0);
      toast?.({ title: 'Example loaded', description: "Loaded example: Apple — latest reported values (fiscal year ended September 27, 2025)." });
    }
  }

  // Persistence: save/load to localStorage
  const STORAGE_KEY = 'exchangetime_dcf_v1';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj) {
          setDiscountRate(obj.discountRate ?? discountRate);
          setTerminalGrowth(obj.terminalGrowth ?? terminalGrowth);
          setTerminalMultiple(obj.terminalMultiple ?? terminalMultiple);
          setUseMultiple(obj.useMultiple ?? useMultiple);
          setSharesOutstanding(obj.sharesOutstanding ?? sharesOutstanding);
          setCash(obj.cash ?? cash);
          setDebt(obj.debt ?? debt);
          setFcfList(Array.isArray(obj.fcfList) ? obj.fcfList : fcfList);
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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }, [discountRate, terminalGrowth, terminalMultiple, useMultiple, sharesOutstanding, cash, debt, fcfList, preset, scenarios, useWacc, riskFreeRate, beta, marketRiskPremium, costOfDebt, taxRate, debtRatio, fcfMode, fcfStart, fcfGrowthConstant, fcfGrowths, currency, displayScale, ticker]);

  function exportFcfCsv() {
    const rows = [['Year', 'FCF', 'Discounted FCF']];
    const r = effectiveRatePct / 100;
    for (let i = 0; i < fcfList.length; i++) {
      const f = numeric(fcfList[i], currency);
      const df = f / Math.pow(1 + r, i + 1);
      rows.push([String(i + 1), String(f), String(df)]);
    }
    rows.push([], ['NPV', String(npv)], ['PV_Terminal', String(pvTerminal)], ['EnterpriseValue', String(enterpriseValue)], ['EquityValue', String(equityValue)], ['PerShare', String(perShare)]);
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dcf-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
      let pv = 0;
      for (let i = 0; i < fcfArr.length; i++) {
        const f = numeric(fcfArr[i], currency);
        pv += f / Math.pow(1 + r, i + 1);
      }
      const lastFcf = numeric(fcfArr[fcfArr.length - 1], currency);
      let tv = 0;
      if (!useMult) {
        const g = varValue / 100;
        if (r > g) tv = (lastFcf * (1 + g)) / (r - g);
      } else {
        tv = lastFcf * varValue;
      }
      const pvTv = tv / Math.pow(1 + r, fcfArr.length);
      const ev = pv + pvTv;
      const eq = ev + numeric(cash, currency) - numeric(debt, currency);
      return eq / Math.max(1, numeric(sharesOutstanding, currency));
    },
    [useMultiple, terminalMultiple, fcfList, cash, debt, sharesOutstanding, currency],
  );

  // dynamic sensitivity ranges around current assumptions
  const sensitivityDiscounts = React.useMemo(() => {
    const base = Math.round(discountRate);
    return Array.from({ length: 5 }, (_, i) => Math.max(1, Math.min(30, base - 2 + i)));
  }, [discountRate]);

  const sensitivityGrowths = React.useMemo(() => {
    const base = Math.round(terminalGrowth);
    return Array.from({ length: 5 }, (_, i) => Math.max(0, base - 2 + i));
  }, [terminalGrowth]);

  const sensitivityMultiples = React.useMemo(() => {
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

  async function copyPerShare() {
    try {
      await navigator.clipboard.writeText(String(perShare));
      toast?.({ title: 'Copied', description: 'Intrinsic value per share copied to clipboard' });
    } catch (e) {
      toast?.({ title: 'Copy failed', description: 'Could not copy to clipboard' });
    }
  }

  function resetAll() {
    setDiscountRate(10);
    setTerminalGrowth(2);
    setTerminalMultiple(12);
    setUseMultiple(false);
    setSharesOutstanding(100_000_000);
    setCash(0);
    setDebt(0);
    setFcfList([100, 110, 121, 133.1, 146.41]);
    setPreset('base');
  }

  const errors: string[] = [];
  if (numeric(sharesOutstanding, currency) <= 0) errors.push('Shares outstanding must be greater than 0.');
  const effectiveRate = effectiveRatePct / 100;
  if (!useMultiple && effectiveRate <= numeric(terminalGrowth, currency) / 100)
    errors.push('WACC/Discount rate should be greater than terminal growth for a valid Gordon terminal value.');

  const chartData = fcfList.map((v, i) => {
    const year = i + 1;
    const f = numeric(v, currency);
    const df = f / Math.pow(1 + effectiveRate, year);
    return { year: `Y${year}`, fcf: f, discounted: Number(df.toFixed(2)) };
  });

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

  // Initialize growth params when mode changes
  useEffect(() => {
    if (fcfMode === 'manual') return;
    if (fcfList.length === 0) return;
    setFcfStart(fcfList[0] ?? 0);
    if (fcfMode === 'constant') {
      let totalG = 0;
      for (let i = 1; i < fcfList.length; i++) {
        if (fcfList[i - 1] !== 0) {
          const g = ((fcfList[i] / fcfList[i - 1]) - 1) * 100;
          totalG += g;
        }
      }
      const avgG = fcfList.length > 1 ? totalG / (fcfList.length - 1) : 5;
      setFcfGrowthConstant(avgG);
    } else if (fcfMode === 'per-year') {
      const gs = [];
      for (let i = 1; i < fcfList.length; i++) {
        if (fcfList[i - 1] !== 0) {
          const g = ((fcfList[i] / fcfList[i - 1]) - 1) * 100;
          gs.push(g);
        } else {
          gs.push(5);
        }
      }
      setFcfGrowths(gs);
    }
  }, [fcfMode]);

  // Automated FCF generation
  useEffect(() => {
    if (fcfMode === 'manual') return;
    const start = numeric(fcfStart, currency);
    if (fcfMode === 'constant') {
      const g = numeric(fcfGrowthConstant, currency) / 100;
      const years = fcfList.length || 5;
      const arr = Array.from({ length: years }, (_, i) => Math.round(start * Math.pow(1 + g, i) * 100) / 100);
      setFcfList(arr);
    } else if (fcfMode === 'per-year') {
      if (fcfGrowths.length >= 1) {
        let current = start;
        const arr = [];
        for (let i = 0; i < fcfGrowths.length; i++) {
          current = Math.round(current * (1 + numeric(fcfGrowths[i], currency) / 100) * 100) / 100;
          arr.push(current);
        }
        setFcfList(arr);
      }
    }
  }, [fcfMode, fcfStart, fcfGrowthConstant, fcfGrowths, currency]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Discounted Cash Flow (DCF) Calculator</CardTitle>
          <div className="text-sm text-muted-foreground">DCF · Intrinsic value estimate</div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Inputs & Forecasts */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 bg-white dark:bg-[#070708] rounded">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold">Assumptions</h4>
                    <div className="text-xs text-muted-foreground">Base inputs for the DCF</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => applyPreset('conservative')}>Conservative</Button>
                    <Button size="sm" variant="ghost" onClick={() => applyPreset('base')}>Base</Button>
                    <Button size="sm" variant="ghost" onClick={() => applyPreset('aggressive')}>Aggressive</Button>
                    <Button size="sm" variant="outline" onClick={() => applyExample('apple')}>Example: Apple</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs">Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="px-2 py-1 rounded border bg-white dark:bg-black text-sm">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CHF">CHF</option>
                    </select>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Toggle pressed={useWacc} onPressedChange={(v) => setUseWacc(Boolean(v))} size="sm">Use WACC</Toggle>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Computed WACC from inputs. When enabled, discount rate uses WACC.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Discount Rate (% p.a.)</label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input value={discountRate} onChange={(e) => setDiscountRate(numeric(e.target.value, currency))} type="number" className="w-28" />
                      <Slider value={[discountRate]} onValueChange={(v: number[]) => setDiscountRate(Number(v[0]))} min={1} max={30} step={0.1} aria-label="Discount rate" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {useWacc ? (
                        <span>Using WACC: <strong>{wacc ? `${Number(wacc).toFixed(2)}%` : '—'}</strong></span>
                      ) : (
                        <span>WACC available: <strong>{wacc ? `${Number(wacc).toFixed(2)}%` : '—'}</strong> — toggle 'Use WACC' to apply</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Terminal Growth (% p.a.)</label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input value={terminalGrowth} onChange={(e) => setTerminalGrowth(numeric(e.target.value, currency))} type="number" className="w-24" />
                      <Slider value={[terminalGrowth]} onValueChange={(v: number[]) => setTerminalGrowth(Number(v[0]))} min={0} max={10} step={0.1} aria-label="Terminal growth" />
                    </div>
                  </div>
                </div>
                {useWacc && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium">WACC Components</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
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
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm">Shares Outstanding</label>
                    <Input value={sharesOutstanding} onChange={(e) => setSharesOutstanding(numeric(e.target.value, currency))} type="number" />
                  </div>
                  <div>
                    <label className="text-sm">Cash</label>
                    <Input value={cash} onChange={(e) => setCash(numeric(e.target.value, currency))} type="number" />
                  </div>
                  <div>
                    <label className="text-sm">Debt</label>
                    <Input value={debt} onChange={(e) => setDebt(numeric(e.target.value, currency))} type="number" />
                  </div>
                  <div>
                    <label className="text-sm">Current Price ({currency})</label>
                    <div className="flex items-center gap-2">
                      <Input value={currentPrice as any} onChange={(e) => setCurrentPrice(e.target.value)} type="number" />
                      <Input placeholder="Ticker (AAPL)" value={ticker} onChange={(e) => setTicker(e.target.value)} type="text" className="w-28" />
                      <Button size="sm" onClick={() => fetchMarketPrice(ticker)} disabled={fetchingPrice || !ticker}>
                        {fetchingPrice ? 'Fetching…' : 'Fetch'}
                      </Button>
                    </div>
                    {lastFetchRef.current && (
                      <div className="text-xs text-muted-foreground mt-1">Last fetched {lastFetchRef.current.symbol} — {new Date(lastFetchRef.current.time).toLocaleString()}</div>
                    )}
                    {fetchError && <div className="text-xs text-red-600 mt-1">{fetchError}</div>}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Terminal</h5>
                    <div className="text-xs text-muted-foreground">Choose terminal valuation method</div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Toggle pressed={useMultiple} onPressedChange={(v) => setUseMultiple(Boolean(v))} size="sm">{useMultiple ? 'Multiple (on FCF)' : 'Gordon'}</Toggle>
                    {useMultiple && <Input value={terminalMultiple} onChange={(e) => setTerminalMultiple(numeric(e.target.value, currency))} type="number" className="w-28" />}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#050506] rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold">Projected Free Cash Flows</h4>
                    <div className="text-xs text-muted-foreground">Edit yearly free cash flows</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Scenario name" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} className="w-36" />
                    <Button size="sm" onClick={() => saveScenario(scenarioName)} disabled={!scenarioName.trim()}>Save</Button>
                    <Button size="sm" variant="outline" onClick={addYear}>Add Year</Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Toggle pressed={fcfMode === 'manual'} onPressedChange={(pressed) => pressed && setFcfMode('manual')}>Manual</Toggle>
                  <Toggle pressed={fcfMode === 'constant'} onPressedChange={(pressed) => pressed && setFcfMode('constant')}>Constant Growth</Toggle>
                  <Toggle pressed={fcfMode === 'per-year'} onPressedChange={(pressed) => pressed && setFcfMode('per-year')}>Per-Year Growth</Toggle>
                </div>
                <div className="mt-3 space-y-2">
                  {fcfMode !== 'manual' && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-sm font-medium text-muted-foreground">Start</div>
                      <Input
                        value={fcfStart}
                        onChange={(e) => setFcfStart(numeric(e.target.value, currency))}
                        type="number"
                        className="w-32"
                      />
                    </div>
                  )}
                  {fcfMode === 'constant' && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-sm font-medium text-muted-foreground">Growth %</div>
                      <Input
                        value={fcfGrowthConstant}
                        onChange={(e) => setFcfGrowthConstant(numeric(e.target.value, currency))}
                        type="number"
                        className="w-32"
                      />
                    </div>
                  )}
                  {fcfMode === 'per-year' &&
                    fcfGrowths.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-12 text-sm font-medium text-muted-foreground">Y{idx + 1} %</div>
                        <Input
                          value={v}
                          onChange={(e) => {
                            const copy = [...fcfGrowths];
                            copy[idx] = numeric(e.target.value, currency);
                            setFcfGrowths(copy);
                          }}
                          type="number"
                          className="w-32"
                        />
                        <Button size="sm" variant="ghost" onClick={() => removeYear(idx)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  {fcfList.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-12 text-sm font-medium text-muted-foreground">Y{idx + 1}</div>
                      {fcfMode === 'manual' ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => changeFcfBy(idx, -1)}>
                            -
                          </Button>
                          <Input
                            value={v}
                            onChange={(e) => updateFcf(idx, e.target.value)}
                            type="number"
                            className="w-32"
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
                        <div className="w-32 text-sm">{formatLarge(v).short}</div>
                      )}
                      {fcfMode !== 'per-year' && (
                        <Button size="sm" variant="ghost" onClick={() => removeYear(idx)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right: Summary, Chart, Sensitivity, Scenarios */}
            <div className="md:col-span-1 space-y-4">
              <div className="p-4 bg-white dark:bg-[#070708] rounded text-center">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">Enterprise Value <TooltipProvider><Tooltip><TooltipTrigger><Info className="w-4 h-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Enterprise value = present value of projected FCFs + terminal value</TooltipContent></Tooltip></TooltipProvider></div>
                  <div className="text-xs text-muted-foreground">
                    <select value={displayScale} onChange={(e) => setDisplayScale(e.target.value as any)} className="text-xs bg-transparent border-none">
                      <option value="auto">Auto</option>
                      <option value="raw">Raw</option>
                      <option value="K">K</option>
                      <option value="M">M</option>
                      <option value="B">B</option>
                      <option value="T">T</option>
                    </select>
                  </div>
                </div>
                <div className="text-2xl font-bold mt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span>{formatLarge(enterpriseValue).short}</span>
                      </TooltipTrigger>
                      <TooltipContent>{formatCurrency(enterpriseValue)}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Equity Value</div>
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
                <div className="text-xs text-muted-foreground mt-2">Intrinsic / Share</div>
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
                <div className="mt-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Current price</div>
                    <div className="text-xs text-muted-foreground">Market / Intrinsic</div>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-medium">{Number(currentPrice) ? formatCurrency(Number(currentPrice)) : <span className="text-xs text-muted-foreground">Not set</span>}</div>
                    <div className={`mt-1 text-sm ${upsidePct !== null ? (upsidePct >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>{upsidePct !== null ? `${upsidePct >= 0 ? '+' : ''}${upsidePct.toFixed(1)}%` : '—'}</div>
                  </div>
                </div>
                {/* Mini sparkline for fetched symbol */}
                <div className="mt-2">
                  {sparklineLoading && <div className="text-xs text-muted-foreground">Loading market sparkline…</div>}
                  {sparkline && sparkline.length > 0 && (
                    <div className="h-12 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkline.map((v, i) => ({ idx: i, v }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="idx" hide={true} />
                          <YAxis hide={true} />
                          <Area dataKey="v" stroke="#60A5FA" fill="url(#spark)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-between items-center gap-2">
                  <div className="flex gap-2">
                    <Button size="sm" onClick={copyPerShare} disabled={errors.length > 0}>Copy</Button>
                    <Button size="sm" variant="outline" onClick={exportFcfCsv} disabled={errors.length > 0}>Export</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">{errors.length === 0 ? 'All inputs valid' : `${errors.length} issues`}</div>
                </div>
                {errors.length > 0 && (
                  <div className="mt-3 text-xs text-red-600">
                    {errors.map((err) => (<div key={err}>• {err}</div>))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-gray-50 dark:bg-[#050506] rounded">
                <div className="text-sm font-medium">Forecast Chart</div>
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gfcf2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => v.toLocaleString()} />
                      <ReTooltip />
                      <Area type="monotone" dataKey="fcf" stroke="#10b981" fill="url(#gfcf2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-[#070708] rounded">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Sensitivity</div>
                  <button className="text-sm text-muted-foreground" onClick={() => setShowSensitivity((s) => !s)}>{showSensitivity ? 'Hide' : 'Show'}</button>
                </div>
                {showSensitivity && (
                  <div className="mt-3 overflow-auto border rounded p-2 bg-white dark:bg-[#0b0b0b]">
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
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}