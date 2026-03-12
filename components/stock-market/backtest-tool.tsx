'use client';

import { AlertTriangle, Play, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BacktestResult {
  initialValue: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  dividendsReinvested: number;
  totalShares: number;
}

type PricePoint = {
  date: string;
  close: number;
};

type DividendPoint = {
  date: string;
  amount: number;
};

type PortfolioPoint = {
  date: string;
  value: number;
};

type DividendHistoryPoint = {
  date: string;
  amount: number;
};

function getTodayIsoLocalDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const TICKER_PATTERN = /^[A-Z0-9^][A-Z0-9.\-=^]{0,14}$/;
const MAX_TICKERS = 25;

type ParsedTickerInput = {
  validTickers: string[];
  invalidTickers: string[];
};

type ParsedWeightInput = {
  values: number[];
  invalidTokens: string[];
};

function splitTickerTokens(input: string): string[] {
  return input
    .split(/[\s,;|]+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
}

function splitWeightTokens(input: string): string[] {
  return input
    .split(/[\s,;|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function analyzeTickerInput(input: string): ParsedTickerInput {
  const validSeen = new Set<string>();
  const invalidSeen = new Set<string>();
  const validTickers: string[] = [];
  const invalidTickers: string[] = [];

  for (const token of splitTickerTokens(input)) {
    if (!TICKER_PATTERN.test(token)) {
      if (invalidSeen.has(token)) continue;
      invalidSeen.add(token);
      invalidTickers.push(token);
      continue;
    }
    if (validSeen.has(token)) continue;
    validSeen.add(token);
    validTickers.push(token);
  }

  return { validTickers, invalidTickers };
}

function analyzeWeightInput(input: string): ParsedWeightInput {
  const values: number[] = [];
  const invalidTokens: string[] = [];

  for (const rawToken of splitWeightTokens(input)) {
    const normalizedToken = rawToken.endsWith('%') ? rawToken.slice(0, -1) : rawToken;
    const value = Number.parseFloat(normalizedToken);
    if (!Number.isFinite(value) || value <= 0) {
      invalidTokens.push(rawToken);
      continue;
    }
    values.push(value);
  }

  return { values, invalidTokens };
}

function aggregatePortfolioHistories(histories: PortfolioPoint[][]): PortfolioPoint[] {
  if (!histories.length) return [];

  const allDates = Array.from(new Set(histories.flatMap((history) => history.map((point) => point.date)))).sort();
  const cursors = histories.map(() => 0);
  const lastValues = histories.map(() => 0);
  const aggregated: PortfolioPoint[] = [];

  for (const date of allDates) {
    for (let index = 0; index < histories.length; index += 1) {
      const history = histories[index];
      while (cursors[index] < history.length && history[cursors[index]].date <= date) {
        lastValues[index] = history[cursors[index]].value;
        cursors[index] += 1;
      }
    }

    const totalValue = lastValues.reduce((sum, value) => sum + value, 0);
    aggregated.push({ date, value: totalValue });
  }

  return aggregated;
}

function aggregateDividendHistories(histories: DividendHistoryPoint[][]): DividendHistoryPoint[] {
  const byDate = new Map<string, number>();

  for (const history of histories) {
    for (const point of history) {
      byDate.set(point.date, (byDate.get(point.date) ?? 0) + point.amount);
    }
  }

  return Array.from(byDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dateToUnix(date: string) {
  return Math.floor(new Date(date).getTime() / 1000);
}

function formatCurrency(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '-';
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

function formatCompact(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(digits)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(digits)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(digits)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function calculateDividendHistory(
  data: PricePoint[],
  dividendData: DividendPoint[],
  initialAmount: number,
  monthlyAmount: number,
  startDate: string,
  endDate: string,
  reinvestDividends = false,
) {
  let totalShares = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startPrice = data[0].close;

  if (initialAmount > 0) {
    totalShares += initialAmount / startPrice;
  }

  const nextInvestmentDate = new Date(start);
  nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
  nextInvestmentDate.setDate(1);

  let dividendIndex = 0;
  const dividendHistory: DividendHistoryPoint[] = [];

  for (const day of data) {
    const currentDay = new Date(day.date);

    if (monthlyAmount > 0 && currentDay >= nextInvestmentDate && currentDay <= end) {
      totalShares += monthlyAmount / day.close;
      nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
    }

    while (
      dividendIndex < dividendData.length &&
      new Date(dividendData[dividendIndex].date) <= currentDay
    ) {
      const dividend = dividendData[dividendIndex];
      const dividendAmount = totalShares * dividend.amount;
      dividendHistory.push({ date: dividend.date, amount: dividendAmount });
      if (reinvestDividends) {
        totalShares += dividendAmount / day.close;
      }
      dividendIndex++;
    }
  }

  return dividendHistory;
}

async function fetchStockData(stockSymbol: string, startDate: string, endDate: string) {
  try {
    const period1 = dateToUnix(startDate);
    const period2 = dateToUnix(endDate);
    const url = `/api/quote?symbol=${encodeURIComponent(stockSymbol)}&chart=1&period1=${period1}&period2=${period2}&interval=1d`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('Invalid data format received');
    }

    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;
    return timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        close: closePrices[index],
      }))
      .filter((item: PricePoint) => item.close !== null);
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function fetchDividendData(stockSymbol: string, startDate: string, endDate: string) {
  try {
    const startUnix = dateToUnix(startDate);
    const endUnix = dateToUnix(endDate);
    const url = `/api/quote?symbol=${encodeURIComponent(stockSymbol)}&chart=1&period1=${startUnix}&period2=${endUnix}&interval=1d&events=div`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) return [];

    const result = data.chart.result[0];
    const dividends = result.events?.dividends
      ? Object.values(result.events.dividends).sort((a: any, b: any) => a.date - b.date)
      : [];

    return dividends.map((div: any) => ({
      date: new Date(div.date * 1000).toISOString().split('T')[0],
      amount: div.amount,
    }));
  } catch {
    return [];
  }
}

function calculateStockInvestment(
  data: PricePoint[],
  dividendData: DividendPoint[],
  initialAmount: number,
  monthlyAmount: number,
  startDate: string,
  endDate: string,
  reinvestDividends = false,
) {
  let totalShares = 0;
  let totalInvested = 0;
  let totalDividends = 0;
  let cashDividends = 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const portfolioHistory: PortfolioPoint[] = [];

  const startPrice = data[0].close;
  if (initialAmount > 0) {
    totalShares += initialAmount / startPrice;
    totalInvested += initialAmount;
  }

  const nextInvestmentDate = new Date(start);
  nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
  nextInvestmentDate.setDate(1);

  let dividendIndex = 0;

  for (const day of data) {
    const currentDay = new Date(day.date);

    if (monthlyAmount > 0 && currentDay >= nextInvestmentDate && currentDay <= end) {
      totalShares += monthlyAmount / day.close;
      totalInvested += monthlyAmount;
      nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
    }

    while (
      dividendIndex < dividendData.length &&
      new Date(dividendData[dividendIndex].date) <= currentDay
    ) {
      const dividend = dividendData[dividendIndex];
      const dividendAmount = totalShares * dividend.amount;
      totalDividends += dividendAmount;
      if (reinvestDividends) {
        totalShares += dividendAmount / day.close;
      } else {
        cashDividends += dividendAmount;
      }
      dividendIndex++;
    }

    portfolioHistory.push({ date: day.date, value: totalShares * day.close + cashDividends });
  }

  const finalPrice = data[data.length - 1].close;
  const finalValue = totalShares * finalPrice + cashDividends;

  return {
    totalInvested,
    finalValue,
    totalShares,
    totalDividends,
    cashDividends,
    portfolioHistory,
  };
}

export default function BacktestTool() {
  const [symbolsInput, setSymbolsInput] = useState('SPY');
  const [weightsInput, setWeightsInput] = useState('');
  const [initialAmount, setInitialAmount] = useState('10000');
  const [monthlyAmount, setMonthlyAmount] = useState('0');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(() => getTodayIsoLocalDate());
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioPoint[] | null>(null);
  const [dividendHistory, setDividendHistory] = useState<DividendHistoryPoint[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickerInputAnalysis = useMemo(() => analyzeTickerInput(symbolsInput), [symbolsInput]);
  const parsedSymbols = tickerInputAnalysis.validTickers;
  const invalidSymbols = tickerInputAnalysis.invalidTickers;
  const normalizedSymbolsInput = parsedSymbols.join(', ');
  const hasSymbolsOverLimit = parsedSymbols.length > MAX_TICKERS;
  const hasCustomWeights = weightsInput.trim().length > 0;
  const weightInputAnalysis = useMemo(() => analyzeWeightInput(weightsInput), [weightsInput]);
  const parsedWeights = weightInputAnalysis.values;
  const invalidWeightTokens = weightInputAnalysis.invalidTokens;
  const normalizedWeightInput = parsedWeights.join(', ');
  const parsedWeightSum = parsedWeights.reduce((sum, value) => sum + value, 0);
  const showWeightsInput = parsedSymbols.length > 1;
  const useCustomWeights = showWeightsInput && hasCustomWeights;
  const hasWeightCountMismatch = useCustomWeights && parsedWeights.length !== parsedSymbols.length;
  const normalizedWeightPercents = useMemo(() => {
    if (!useCustomWeights || parsedWeights.length === 0 || parsedWeightSum <= 0) return [];
    return parsedWeights.map((value) => (value / parsedWeightSum) * 100);
  }, [useCustomWeights, parsedWeightSum, parsedWeights]);
  const weightPreview = useMemo(() => {
    if (normalizedWeightPercents.length !== parsedSymbols.length || parsedSymbols.length === 0) return '';
    const pairs = parsedSymbols.map((symbol, index) => `${symbol} ${normalizedWeightPercents[index].toFixed(1)}%`);
    const shown = pairs.slice(0, 4).join(' · ');
    return pairs.length > 4 ? `${shown} · ...` : shown;
  }, [normalizedWeightPercents, parsedSymbols]);

  const portfolioColor = useMemo(() => {
    if (!result) return '#e5e7eb';
    if (result.totalReturn > 0) return '#34d399';
    if (result.totalReturn < 0) return '#fb7185';
    return '#e5e7eb';
  }, [result]);

  const summaryCards = useMemo(() => {
    if (!result) return [];
    return [
      {
        label: 'Total Investment',
        value: formatCurrency(result.initialValue, 0),
        className: 'text-foreground',
      },
      {
        label: 'Final Value',
        value: formatCurrency(result.finalValue, 0),
        className: 'text-foreground',
      },
      {
        label: 'Total Return',
        value: formatPercent(result.totalReturn),
        className: result.totalReturn >= 0 ? 'text-emerald-300' : 'text-rose-300',
      },
      {
        label: 'Annualized',
        value: formatPercent(result.annualizedReturn),
        className: result.annualizedReturn >= 0 ? 'text-emerald-300' : 'text-rose-300',
      },
      {
        label: `Dividends ${reinvestDividends ? 'Reinvested' : 'Cash'}`,
        value: formatCurrency(result.dividendsReinvested, 0),
        className: 'text-foreground',
      },
      {
        label: activeSymbols.length > 1 ? 'Shares Held (Sum)' : 'Shares Held',
        value: Number.isFinite(result.totalShares) ? result.totalShares.toFixed(2) : '-',
        className: 'text-foreground',
      },
    ];
  }, [activeSymbols.length, result, reinvestDividends]);
  const portfolioStats = useMemo(() => {
    if (!portfolioHistory || portfolioHistory.length === 0) return null;
    const values = portfolioHistory
      .map((point) => point.value)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
    if (!values.length) return null;
    const high = Math.max(...values);
    const last = values[values.length - 1];
    let runningPeak = values[0];
    let maxDrawdownPct = 0;
    for (const value of values) {
      if (value > runningPeak) runningPeak = value;
      if (runningPeak > 0) {
        const drawdownPct = ((runningPeak - value) / runningPeak) * 100;
        if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;
      }
    }
    return { high, last, maxDrawdownPct };
  }, [portfolioHistory]);
  const dividendStats = useMemo(() => {
    if (!dividendHistory || dividendHistory.length === 0) return null;
    const payouts = dividendHistory
      .map((point) => point.amount)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
    if (!payouts.length) return null;
    const payoutCount = payouts.length;
    const rangeStart = portfolioHistory?.[0]?.date ?? startDate;
    const rangeEnd = portfolioHistory?.[portfolioHistory.length - 1]?.date ?? endDate;
    const startTs = Date.parse(`${rangeStart}T00:00:00Z`);
    const endTs = Date.parse(`${rangeEnd}T00:00:00Z`);
    const rangeMs = Number.isFinite(startTs) && Number.isFinite(endTs) ? Math.max(endTs - startTs, 0) : 0;
    const years = Math.max(rangeMs / (365.25 * 24 * 60 * 60 * 1000), 1);
    const total = payouts.reduce((sum, amount) => sum + amount, 0);
    const avg = total / payouts.length;
    const peak = Math.max(...payouts);
    const payoutsPerYear = payoutCount / years;
    return { total, avg, peak, payoutsPerYear };
  }, [dividendHistory, endDate, portfolioHistory, startDate]);
  const hasPortfolioSection = Boolean(portfolioHistory && portfolioHistory.length > 0);
  const hasDividendSection = Boolean(dividendHistory && dividendHistory.length > 0);

  const renderPortfolioSection = (gradientId: string) => {
    if (!hasPortfolioSection || !portfolioHistory) return null;

    return (
      <div className={sectionClass}>
        <div className="mb-2">
          <p className={captionClass}>Portfolio Value</p>
        </div>
        {portfolioStats && (
          <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
              <span className="text-muted-foreground">Max Drawdown</span>
              <div className="mt-0.5 font-semibold tabular-nums text-rose-300">
                {portfolioStats.maxDrawdownPct > 0
                  ? `-${portfolioStats.maxDrawdownPct.toFixed(2)}%`
                  : '0.00%'}
              </div>
            </div>
            <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
              <span className="text-muted-foreground">Peak</span>
              <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                ${formatCompact(portfolioStats.high, 2)}
              </div>
            </div>
            <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
              <span className="text-muted-foreground">Last</span>
              <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                ${formatCompact(portfolioStats.last, 2)}
              </div>
            </div>
          </div>
        )}
        <ChartContainer
          className="h-[180px] !aspect-auto sm:h-[220px]"
          config={{ value: { label: 'Portfolio Value', color: portfolioColor } }}
        >
          <AreaChart data={portfolioHistory} margin={{ top: 8, right: 6, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="4%" stopColor={portfolioColor} stopOpacity={0.66} />
                <stop offset="96%" stopColor={portfolioColor} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(161,161,170,0.18)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(value: string) => formatShortDate(value)}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(value: number) => formatCompact(value, 1)}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <ReferenceLine
              y={result?.initialValue ?? 0}
              stroke="rgba(161,161,170,0.35)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <Tooltip
              cursor={{ stroke: 'rgba(161,161,170,0.35)', strokeDasharray: '4 4' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as PortfolioPoint | undefined;
                if (!point) return null;
                return (
                  <div className="rounded-lg border border-border bg-background/95 px-2 py-1 text-[10px] text-foreground shadow-sm">
                    <div className="font-medium text-muted-foreground">
                      {formatFullDate(label || point.date)}
                    </div>
                    <div className="mt-0.5 tabular-nums text-xs font-semibold text-foreground">
                      {formatCurrency(point.value)}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={portfolioColor}
              fill={`url(#${gradientId})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={450}
              activeDot={{
                r: 2.5,
                strokeWidth: 1,
                stroke: portfolioColor,
                fill: '#0a0a0a',
              }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    );
  };

  const renderDividendSection = (gradientId: string) => {
    if (!hasDividendSection || !dividendHistory) return null;

    return (
      <div className={sectionClass}>
        <div className="mb-2">
          <p className={captionClass}>Dividend Cashflow</p>
        </div>
        {dividendStats && (
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1 text-[10px] sm:grid sm:grid-cols-4 sm:gap-1.5 sm:overflow-visible sm:pb-0">
            <div className="min-w-[6.5rem] shrink-0 rounded-md border border-border/80 bg-background/70 px-1 py-0.5 sm:min-w-0 sm:px-1.5 sm:py-1">
              <span className="text-muted-foreground">Total</span>
              <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                ${formatCompact(dividendStats.total, 2)}
              </div>
            </div>
            <div className="min-w-[6.5rem] shrink-0 rounded-md border border-border/80 bg-background/70 px-1 py-0.5 sm:min-w-0 sm:px-1.5 sm:py-1">
              <span className="text-muted-foreground">Average</span>
              <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                ${formatCompact(dividendStats.avg, 2)}
              </div>
            </div>
            <div className="min-w-[6.5rem] shrink-0 rounded-md border border-border/80 bg-background/70 px-1 py-0.5 sm:min-w-0 sm:px-1.5 sm:py-1">
              <span className="text-muted-foreground">Payouts / Year</span>
              <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                {dividendStats.payoutsPerYear.toFixed(1)}
              </div>
            </div>
            <div className="min-w-[6.5rem] shrink-0 rounded-md border border-border/80 bg-background/70 px-1 py-0.5 sm:min-w-0 sm:px-1.5 sm:py-1">
              <span className="text-muted-foreground">Peak</span>
              <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                ${formatCompact(dividendStats.peak, 2)}
              </div>
            </div>
          </div>
        )}
        <ChartContainer
          className="h-[180px] !aspect-auto sm:h-[220px]"
          config={{ amount: { label: 'Dividend', color: '#34d399' } }}
        >
          <BarChart data={dividendHistory} margin={{ top: 8, right: 6, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(161,161,170,0.18)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(value: string) => formatShortDate(value)}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(value: number) => formatCompact(value, 1)}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as DividendHistoryPoint | undefined;
                if (!point) return null;
                return (
                  <div className="rounded-lg border border-border bg-background/95 px-2 py-1 text-[10px] text-foreground shadow-sm">
                    <div className="font-medium text-muted-foreground">
                      {formatFullDate(label || point.date)}
                    </div>
                    <div className="mt-0.5 tabular-nums text-xs font-semibold text-foreground">
                      {formatCurrency(point.amount)}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="amount" fill={`url(#${gradientId})`} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    );
  };

  async function runBacktest() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setPortfolioHistory(null);
    setDividendHistory(null);
    setActiveSymbols([]);

    try {
      const symbols = parsedSymbols;
      if (invalidSymbols.length > 0) {
        const invalidPreview = invalidSymbols.slice(0, 4).join(', ');
        setError(
          `Invalid ticker format: ${invalidPreview}${invalidSymbols.length > 4 ? ', ...' : ''}.`,
        );
        return;
      }
      if (symbols.length === 0) {
        setError('Please enter at least one ticker symbol.');
        return;
      }
      if (symbols.length > MAX_TICKERS) {
        setError(`Please limit the list to ${MAX_TICKERS} tickers.`);
        return;
      }

      const parsedInitial = Number.parseFloat(initialAmount);
      const parsedMonthly = Number.parseFloat(monthlyAmount);
      const normalizedInitial = Number.isFinite(parsedInitial) ? parsedInitial : 0;
      const normalizedMonthly = Number.isFinite(parsedMonthly) ? parsedMonthly : 0;
      let allocationWeights: number[] = [];
      const useWeightsForRun = symbols.length > 1 && hasCustomWeights;
      if (useWeightsForRun) {
        if (invalidWeightTokens.length > 0) {
          const invalidPreview = invalidWeightTokens.slice(0, 4).join(', ');
          setError(
            `Invalid weight value: ${invalidPreview}${invalidWeightTokens.length > 4 ? ', ...' : ''}.`,
          );
          return;
        }
        if (parsedWeights.length !== symbols.length) {
          setError(`Please provide ${symbols.length} weight values (one per ticker).`);
          return;
        }
        if (!Number.isFinite(parsedWeightSum) || parsedWeightSum <= 0) {
          setError('Total weight must be greater than 0.');
          return;
        }
        allocationWeights = parsedWeights.map((value) => value / parsedWeightSum);
      } else {
        allocationWeights = symbols.map(() => 1 / symbols.length);
      }

      const initialAllocations = allocationWeights.map((weight) => normalizedInitial * weight);
      const monthlyAllocations = allocationWeights.map((weight) => normalizedMonthly * weight);

      const allData = await Promise.all(
        symbols.map(async (ticker) => {
          const [stockData, dividendData] = await Promise.all([
            fetchStockData(ticker, startDate, endDate),
            fetchDividendData(ticker, startDate, endDate),
          ]);
          return { ticker, stockData, dividendData };
        }),
      );

      const failedTickers = allData
        .filter((entry) => !Array.isArray(entry.stockData) || entry.stockData.length < 2)
        .map((entry) => entry.ticker);
      if (failedTickers.length > 0) {
        setError(`Error loading price data for: ${failedTickers.join(', ')}`);
        return;
      }

      const perTickerResults = allData.map((entry, index) => {
        const stockData = entry.stockData as PricePoint[];
        const dividendData = Array.isArray(entry.dividendData) ? entry.dividendData : [];
        const initialPerTicker = initialAllocations[index] ?? 0;
        const monthlyPerTicker = monthlyAllocations[index] ?? 0;
        const tickerDividendHistory = calculateDividendHistory(
          stockData,
          dividendData,
          initialPerTicker,
          monthlyPerTicker,
          startDate,
          endDate,
          reinvestDividends,
        );
        const investment = calculateStockInvestment(
          stockData,
          dividendData,
          initialPerTicker,
          monthlyPerTicker,
          startDate,
          endDate,
          reinvestDividends,
        );
        return {
          ticker: entry.ticker,
          investment,
          tickerDividendHistory,
        };
      });

      const combinedPortfolioHistory = aggregatePortfolioHistories(
        perTickerResults.map((entry) => entry.investment.portfolioHistory),
      );
      const combinedDividendHistory = aggregateDividendHistories(
        perTickerResults.map((entry) => entry.tickerDividendHistory),
      );
      setDividendHistory(combinedDividendHistory);
      setPortfolioHistory(combinedPortfolioHistory);
      setActiveSymbols(symbols);

      const totalInvested = perTickerResults.reduce((sum, entry) => sum + entry.investment.totalInvested, 0);
      const finalValue = perTickerResults.reduce((sum, entry) => sum + entry.investment.finalValue, 0);
      const totalShares = perTickerResults.reduce((sum, entry) => sum + entry.investment.totalShares, 0);
      const totalDividends = perTickerResults.reduce((sum, entry) => sum + entry.investment.totalDividends, 0);
      const cashDividends = perTickerResults.reduce((sum, entry) => sum + entry.investment.cashDividends, 0);

      const totalReturn = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;
      const rangeMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const years = Math.max(rangeMs / (365.25 * 24 * 60 * 60 * 1000), 1 / 365.25);
      const annualizedReturn =
        totalInvested > 0 && finalValue > 0 ? (Math.pow(finalValue / totalInvested, 1 / years) - 1) * 100 : 0;

      setResult({
        initialValue: totalInvested,
        finalValue,
        totalReturn,
        annualizedReturn,
        maxDrawdown: 0,
        sharpeRatio: 0,
        dividendsReinvested: reinvestDividends ? totalDividends : cashDividends,
        totalShares,
      });
    } finally {
      setIsRunning(false);
    }
  }

  const shellClass = 'mx-auto w-full max-w-[36rem] space-y-2 sm:space-y-3';
  const panelClass = 'rounded-2xl border border-border/70 bg-card/70';
  const sectionClass = `${panelClass} p-3 sm:p-3.5`;
  const captionClass = 'text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]';

  return (
    <div className={shellClass}>
      <div className={`${panelClass} px-3 py-3 pr-14 sm:px-3.5 sm:py-3.5 sm:pr-16`}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-[1.4rem]">
          Backtest Tool
        </h2>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-900/20 px-3 py-2.5 text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <span className="text-sm">{error}</span>
        </Alert>
      )}
      {!result ? (
        <>
          <div className={sectionClass}>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className={captionClass}>Symbols</label>
                  <span className="text-[11px] text-muted-foreground">
                    {parsedSymbols.length} {parsedSymbols.length === 1 ? 'ticker' : 'tickers'}
                  </span>
                </div>
                <Input
                  value={symbolsInput}
                  onChange={(event) => setSymbolsInput(event.target.value.toUpperCase())}
                  onBlur={(event) => {
                    const analysis = analyzeTickerInput(event.target.value);
                    if (analysis.invalidTickers.length === 0 && analysis.validTickers.length > 0) {
                      setSymbolsInput(analysis.validTickers.join(', '));
                    }
                  }}
                  placeholder="AAPL, MSFT, NVDA"
                  className="mt-1 h-9 rounded-lg border-border bg-background/80 text-sm"
                />
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  Enter one or more tickers separated by comma or space.
                </div>
                {parsedSymbols.length > 0 && symbolsInput !== normalizedSymbolsInput && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Normalized: {normalizedSymbolsInput}
                  </p>
                )}
                {invalidSymbols.length > 0 && (
                  <p className="mt-2 text-[11px] text-rose-300">
                    Invalid: {invalidSymbols.slice(0, 4).join(', ')}
                    {invalidSymbols.length > 4 ? ', ...' : ''}
                  </p>
                )}
                {hasSymbolsOverLimit && (
                  <p className="mt-1 text-[11px] text-rose-300">
                    Limit is {MAX_TICKERS} tickers per run.
                  </p>
                )}
              </div>
              {showWeightsInput && (
                <div className="sm:col-span-2">
                  <label className={captionClass}>Weights % (Optional)</label>
                  <Input
                    value={weightsInput}
                    onChange={(event) => setWeightsInput(event.target.value)}
                    onBlur={(event) => {
                      const analysis = analyzeWeightInput(event.target.value);
                      if (analysis.invalidTokens.length === 0 && analysis.values.length > 0) {
                        setWeightsInput(analysis.values.join(', '));
                      }
                    }}
                    placeholder="50, 30, 20"
                    className="mt-1 h-9 rounded-lg border-border bg-background/80 text-sm"
                  />
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    Optional. Same order as symbols. Leave empty for equal weights.
                  </div>
                  {weightsInput.length > 0 && weightsInput !== normalizedWeightInput && parsedWeights.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Normalized input: {normalizedWeightInput}
                    </p>
                  )}
                  {invalidWeightTokens.length > 0 && (
                    <p className="mt-1 text-[11px] text-rose-300">
                      Invalid weights: {invalidWeightTokens.slice(0, 4).join(', ')}
                      {invalidWeightTokens.length > 4 ? ', ...' : ''}
                    </p>
                  )}
                  {hasWeightCountMismatch && invalidWeightTokens.length === 0 && (
                    <p className="mt-1 text-[11px] text-rose-300">
                      Enter {parsedSymbols.length} weights for {parsedSymbols.length} tickers.
                    </p>
                  )}
                  {useCustomWeights &&
                    invalidWeightTokens.length === 0 &&
                    !hasWeightCountMismatch &&
                    weightPreview.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Applied: {weightPreview}</p>
                    )}
                </div>
              )}
              <div>
                <label className={captionClass}>Initial Amount</label>
                <Input
                  type="number"
                  value={initialAmount}
                  onChange={(event) => setInitialAmount(event.target.value)}
                  placeholder="10000"
                  className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                />
              </div>
              <div>
                <label className={captionClass}>Monthly Amount</label>
                <Input
                  type="number"
                  value={monthlyAmount}
                  onChange={(event) => setMonthlyAmount(event.target.value)}
                  placeholder="0"
                  className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:col-span-2">
                <div>
                  <label className={captionClass}>Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                  />
                </div>
                <div>
                  <label className={captionClass}>End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                  />
                </div>
              </div>
            </div>

            <label htmlFor="reinvest" className="mt-2.5 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
              <span className="text-xs text-foreground sm:text-sm">Reinvest Dividends</span>
              <span className="relative">
                <input
                  id="reinvest"
                  type="checkbox"
                  checked={reinvestDividends}
                  onChange={(event) => setReinvestDividends(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="block h-6 w-10 rounded-full border border-border bg-background transition-colors peer-checked:bg-foreground" />
                <span className="absolute left-0 top-0 h-6 w-6 rounded-full border border-border bg-card transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          </div>

          <Button
            onClick={runBacktest}
            disabled={isRunning}
            className="h-9 w-full rounded-lg border border-border bg-background text-foreground hover:bg-secondary/70"
          >
            {isRunning ? (
              <>
                <Settings className="mr-2 h-4 w-4 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Backtest
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          <div className={sectionClass}>
            <p className={captionClass}>Backtest</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-[1.15rem] font-semibold tracking-tight text-foreground sm:text-[1.3rem]">
                {(activeSymbols.length > 0 ? activeSymbols : parsedSymbols).join(', ')}
              </h3>
              <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                {startDate} to {endDate}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div key={card.label} className={`${panelClass} px-2.5 py-2`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{card.label}</p>
                <p className={`mt-1 text-xs font-semibold tabular-nums sm:text-sm ${card.className}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {hasPortfolioSection && hasDividendSection ? (
            <>
              <Tabs defaultValue="portfolio" className="sm:hidden">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border border-border bg-transparent p-1">
                  <TabsTrigger
                    value="portfolio"
                    className="rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
                  >
                    Portfolio
                  </TabsTrigger>
                  <TabsTrigger
                    value="dividends"
                    className="rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
                  >
                    Dividends
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="portfolio" className="mt-2">
                  {renderPortfolioSection('backtestPortfolioGradientMobile')}
                </TabsContent>
                <TabsContent value="dividends" className="mt-2">
                  {renderDividendSection('backtestDividendGradientMobile')}
                </TabsContent>
              </Tabs>

              <div className="hidden space-y-2.5 sm:block sm:space-y-3">
                {renderPortfolioSection('backtestPortfolioGradientDesktop')}
                {renderDividendSection('backtestDividendGradientDesktop')}
              </div>
            </>
          ) : (
            <>
              {renderPortfolioSection('backtestPortfolioGradientSingle')}
              {renderDividendSection('backtestDividendGradientSingle')}
            </>
          )}

          <Button
            onClick={() => {
              setResult(null);
              setPortfolioHistory(null);
              setDividendHistory(null);
              setError(null);
              setActiveSymbols([]);
            }}
            className="h-9 w-full rounded-lg border border-border bg-background text-foreground hover:bg-secondary/70"
          >
            <Play className="mr-2 h-4 w-4" />
            New Backtest
          </Button>
        </div>
      )}
    </div>
  );
}
