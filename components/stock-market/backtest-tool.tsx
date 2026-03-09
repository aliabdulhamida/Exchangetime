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
  const [symbol, setSymbol] = useState('SPY');
  const [initialAmount, setInitialAmount] = useState('10000');
  const [monthlyAmount, setMonthlyAmount] = useState('0');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioPoint[] | null>(null);
  const [dividendHistory, setDividendHistory] = useState<DividendHistoryPoint[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portfolioColor = useMemo(() => {
    if (!portfolioHistory || portfolioHistory.length < 2) return '#e5e7eb';
    const first = portfolioHistory[0].value;
    const last = portfolioHistory[portfolioHistory.length - 1].value;
    if (last > first) return '#34d399';
    if (last < first) return '#fb7185';
    return '#e5e7eb';
  }, [portfolioHistory]);

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
        label: 'Shares Held',
        value: Number.isFinite(result.totalShares) ? result.totalShares.toFixed(2) : '-',
        className: 'text-foreground',
      },
    ];
  }, [result, reinvestDividends]);
  const portfolioStats = useMemo(() => {
    if (!portfolioHistory || portfolioHistory.length === 0) return null;
    const values = portfolioHistory
      .map((point) => point.value)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
    if (!values.length) return null;
    const low = Math.min(...values);
    const high = Math.max(...values);
    const last = values[values.length - 1];
    return { low, high, last };
  }, [portfolioHistory]);
  const dividendStats = useMemo(() => {
    if (!dividendHistory || dividendHistory.length === 0) return null;
    const payouts = dividendHistory
      .map((point) => point.amount)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
    if (!payouts.length) return null;
    const total = payouts.reduce((sum, amount) => sum + amount, 0);
    const avg = total / payouts.length;
    const peak = Math.max(...payouts);
    return { total, avg, peak };
  }, [dividendHistory]);

  async function runBacktest() {
    setIsRunning(true);
    setError(null);
    setResult(null);

    const stockData = await fetchStockData(symbol, startDate, endDate);
    if (!Array.isArray(stockData) || stockData.length < 2) {
      setError('Error loading price data.');
      setIsRunning(false);
      return;
    }

    const dividendData = await fetchDividendData(symbol, startDate, endDate);
    const parsedInitial = Number.parseFloat(initialAmount);
    const parsedMonthly = Number.parseFloat(monthlyAmount);
    const normalizedInitial = Number.isFinite(parsedInitial) ? parsedInitial : 0;
    const normalizedMonthly = Number.isFinite(parsedMonthly) ? parsedMonthly : 0;

    const dividendHistoryAgg = calculateDividendHistory(
      stockData,
      dividendData,
      normalizedInitial,
      normalizedMonthly,
      startDate,
      endDate,
      reinvestDividends,
    );
    setDividendHistory(dividendHistoryAgg);

    const {
      totalInvested,
      finalValue,
      totalShares,
      totalDividends,
      cashDividends,
      portfolioHistory: computedPortfolioHistory,
    } = calculateStockInvestment(
      stockData,
      dividendData,
      normalizedInitial,
      normalizedMonthly,
      startDate,
      endDate,
      reinvestDividends,
    );

    const totalReturn = ((finalValue - totalInvested) / totalInvested) * 100;
    const annualizedReturn =
      (Math.pow(
        finalValue / totalInvested,
        1 / (new Date(endDate).getFullYear() - new Date(startDate).getFullYear() || 1),
      ) -
        1) *
      100;

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
    setPortfolioHistory(computedPortfolioHistory);
    setIsRunning(false);
  }

  const shellClass = 'mx-auto w-full max-w-[34rem] space-y-2 sm:space-y-3';
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
              <div>
                <label className={captionClass}>Symbol</label>
                <Input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  placeholder="Ticker"
                  className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                />
              </div>
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
              <div>
                <label className={captionClass}>Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={captionClass}>End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-1 h-8 rounded-lg border-border bg-background/80 text-sm"
                />
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
                {symbol.toUpperCase()}
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

          {portfolioHistory && portfolioHistory.length > 0 && (
            <div className={sectionClass}>
              <div className="mb-2">
                <p className={captionClass}>Portfolio Value</p>
              </div>
              {portfolioStats && (
                <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                    <span className="text-muted-foreground">Low</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                      ${formatCompact(portfolioStats.low, 2)}
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
                className="h-[145px] !aspect-auto sm:h-[170px]"
                config={{ value: { label: 'Portfolio Value', color: portfolioColor } }}
              >
                <AreaChart data={portfolioHistory} margin={{ top: 8, right: 6, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="backtestPortfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="4%" stopColor={portfolioColor} stopOpacity={0.66} />
                      <stop offset="96%" stopColor={portfolioColor} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(161,161,170,0.18)"
                    strokeDasharray="3 3"
                  />
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
                    y={result.initialValue}
                    stroke="rgba(161,161,170,0.35)"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(161,161,170,0.35)', strokeDasharray: '4 4' }}
                    content={({
                      active,
                      payload,
                      label,
                    }: {
                      active?: boolean;
                      payload?: Array<{ payload: PortfolioPoint }>;
                      label?: string;
                    }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload;
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
                    fill="url(#backtestPortfolioGradient)"
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
          )}

          {dividendHistory && dividendHistory.length > 0 && (
            <div className={sectionClass}>
              <div className="mb-2">
                <p className={captionClass}>Dividend Cashflow</p>
              </div>
              {dividendStats && (
                <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                    <span className="text-muted-foreground">Total</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                      ${formatCompact(dividendStats.total, 2)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                    <span className="text-muted-foreground">Average</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                      ${formatCompact(dividendStats.avg, 2)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/80 bg-background/70 px-1.5 py-1">
                    <span className="text-muted-foreground">Peak</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                      ${formatCompact(dividendStats.peak, 2)}
                    </div>
                  </div>
                </div>
              )}
              <ChartContainer
                className="h-[145px] !aspect-auto sm:h-[170px]"
                config={{ amount: { label: 'Dividend', color: '#34d399' } }}
              >
                <BarChart data={dividendHistory} margin={{ top: 8, right: 6, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="backtestDividendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(161,161,170,0.18)"
                    strokeDasharray="3 3"
                  />
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
                    content={({
                      active,
                      payload,
                      label,
                    }: {
                      active?: boolean;
                      payload?: Array<{ payload: DividendHistoryPoint }>;
                      label?: string;
                    }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload;
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
                  <Bar dataKey="amount" fill="url(#backtestDividendGradient)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          )}

          <Button
            onClick={() => {
              setResult(null);
              setPortfolioHistory(null);
              setDividendHistory(null);
              setError(null);
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
