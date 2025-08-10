'use client';
// Hilfsfunktion: aggregierte Dividendenzahlungen nach gehaltenen Aktien
function calculateDividendHistory(
  data: any[],
  dividendData: any[],
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
    const initialShares = initialAmount / startPrice;
    totalShares += initialShares;
  }
  let nextInvestmentDate = new Date(start);
  nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
  nextInvestmentDate.setDate(1);
  let dividendIndex = 0;
  const dividendHistory: { date: string; amount: number }[] = [];
  for (const day of data) {
    const currentDay = new Date(day.date);
    // Add monthly investment if it's the first trading day of the month
    if (monthlyAmount > 0 && currentDay >= nextInvestmentDate && currentDay <= end) {
      const sharesBought = monthlyAmount / day.close;
      totalShares += sharesBought;
      nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
    }
    // Process dividends for this date
    while (
      dividendIndex < dividendData.length &&
      new Date(dividendData[dividendIndex].date) <= currentDay
    ) {
      const dividend = dividendData[dividendIndex];
      const dividendAmount = totalShares * dividend.amount;
      dividendHistory.push({ date: dividend.date, amount: dividendAmount });
      if (reinvestDividends) {
        const additionalShares = dividendAmount / day.close;
        totalShares += additionalShares;
      }
      dividendIndex++;
    }
  }
  return dividendHistory;
}

import { Play, Settings, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  BarChart,
  AreaChart,
  Area,
} from 'recharts';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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

// Hilfsfunktionen für Yahoo Finance API
function dateToUnix(date: string) {
  return Math.floor(new Date(date).getTime() / 1000);
}

async function fetchStockData(stockSymbol: string, startDate: string, endDate: string) {
  try {
    const period1 = dateToUnix(startDate);
    const period2 = dateToUnix(endDate);
    const proxyUrl = 'https://corsproxy.io/?';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const url = proxyUrl + encodeURIComponent(yahooUrl);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0])
      throw new Error('Invalid data format received');
    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;
    return timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        close: closePrices[index],
      }))
      .filter((item: any) => item.close !== null);
  } catch (error: any) {
    return { error: error.message };
  }
}

async function fetchDividendData(stockSymbol: string, startDate: string, endDate: string) {
  try {
    const startUnix = dateToUnix(startDate);
    const endUnix = dateToUnix(endDate);
    const proxyUrl = 'https://corsproxy.io/?';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?period1=${startUnix}&period2=${endUnix}&interval=1d&events=div`;
    const url = proxyUrl + encodeURIComponent(yahooUrl);
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
  } catch (error: any) {
    return [];
  }
}

function calculateStockInvestment(
  data: any[],
  dividendData: any[],
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
  const portfolioHistory: { date: string; value: number }[] = [];
  // Initial investment at start date
  const startPrice = data[0].close;
  if (initialAmount > 0) {
    const initialShares = initialAmount / startPrice;
    totalShares += initialShares;
    totalInvested += initialAmount;
  }
  let nextInvestmentDate = new Date(start);
  nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
  nextInvestmentDate.setDate(1);
  let dividendIndex = 0;
  for (const day of data) {
    const currentDay = new Date(day.date);
    // Add monthly investment if it's the first trading day of the month
    if (monthlyAmount > 0 && currentDay >= nextInvestmentDate && currentDay <= end) {
      const sharesBought = monthlyAmount / day.close;
      totalShares += sharesBought;
      totalInvested += monthlyAmount;
      nextInvestmentDate.setMonth(nextInvestmentDate.getMonth() + 1);
    }
    // Process dividends for this date
    while (
      dividendIndex < dividendData.length &&
      new Date(dividendData[dividendIndex].date) <= currentDay
    ) {
      const dividend = dividendData[dividendIndex];
      const dividendAmount = totalShares * dividend.amount;
      totalDividends += dividendAmount;
      if (reinvestDividends) {
        const additionalShares = dividendAmount / day.close;
        totalShares += additionalShares;
      } else {
        cashDividends += dividendAmount;
      }
      dividendIndex++;
    }
    // Portfolio-Wert für diesen Tag berechnen
    const value = totalShares * day.close + cashDividends;
    portfolioHistory.push({ date: day.date, value });
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
  const [portfolioHistory, setPortfolioHistory] = useState<
    { date: string; value: number }[] | null
  >(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dividendHistory, setDividendHistory] = useState<{ date: string; amount: number }[] | null>(
    null,
  );

  const runBacktest = async () => {
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
    // dividendHistory jetzt aggregiert berechnen
    const dividendHistoryAgg = calculateDividendHistory(
      stockData,
      dividendData,
      parseFloat(initialAmount),
      parseFloat(monthlyAmount),
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
      portfolioHistory,
    } = calculateStockInvestment(
      stockData,
      dividendData,
      parseFloat(initialAmount),
      parseFloat(monthlyAmount),
      startDate,
      endDate,
      reinvestDividends,
    );
    // Kennzahlen berechnen
    const totalReturn = ((finalValue - totalInvested) / totalInvested) * 100;
    const annualizedReturn =
      (Math.pow(
        finalValue / totalInvested,
        1 / (new Date(endDate).getFullYear() - new Date(startDate).getFullYear() || 1),
      ) -
        1) *
      100;
    // Max Drawdown und Sharpe Ratio können später ergänzt werden
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
    setPortfolioHistory(portfolioHistory);
    setIsRunning(false);
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col">
      <div className="flex items-center justify-start mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Backtest Tool</h2>
      </div>
      {!result ? (
        <>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Symbol
                </label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Enter ticker (e.g. AAPL)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Amount
                </label>
                <Input
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Amount
                </label>
                <Input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="reinvest"
                className="flex items-center cursor-pointer select-none gap-3"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">Reinvest Dividends</span>
                <span className="relative">
                  <input
                    type="checkbox"
                    id="reinvest"
                    checked={reinvestDividends}
                    onChange={(e) => setReinvestDividends(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="block w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-white transition-colors duration-200 border border-gray-300 dark:border-gray-600"></span>
                  <span className="absolute left-0 top-0 w-6 h-6 bg-white dark:bg-[#18181b] border border-gray-300 dark:border-gray-600 rounded-full shadow transform peer-checked:translate-x-4 transition-transform duration-200"></span>
                </span>
              </label>
            </div>
          </div>
          <Button onClick={runBacktest} disabled={isRunning} className="w-full mb-6">
            {isRunning ? (
              <>
                <Settings className="w-4 h-4 mr-2 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 border-red-400 bg-red-100/60 dark:bg-red-900/30 text-red-700 dark:text-red-300 border flex flex-col items-center justify-center text-center relative py-8 px-4"
            >
              <div className="flex flex-col items-center w-full">
                <AlertTriangle className="w-8 h-8 mb-2 text-red-600 dark:text-red-200" />
                <div className="text-lg mb-1 mx-auto max-w-xs break-words">{error}</div>
              </div>
            </Alert>
          )}
        </>
      ) : (
        <div className="flex flex-col justify-center h-full">
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Results</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Investment</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  ${result.initialValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
                <p className="text-xs text-gray-600 dark:text-gray-400">Final Value</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  ${result.finalValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Return</p>
                <p
                  className={`font-semibold ${result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {result.totalReturn.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
                <p className="text-xs text-gray-600 dark:text-gray-400">Annualized Return</p>
                <p
                  className={`font-semibold ${result.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {result.annualizedReturn.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Dividends {reinvestDividends ? 'Reinvested' : '(Cash)'}
                </p>
                <p className="font-semibold text-blue-700 dark:text-blue-300">
                  ${result.dividendsReinvested.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Shares Held</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {result.totalShares ? result.totalShares.toFixed(2) : '-'}
                </p>
              </div>
            </div>
            {(portfolioHistory && portfolioHistory.length > 0) ||
            (dividendHistory && dividendHistory.length > 0) ? (
              <div className="mt-6 flex flex-col md:flex-row gap-6 w-full">
                {portfolioHistory &&
                  portfolioHistory.length > 0 &&
                  (() => {
                    let chartColor = '#2563eb';
                    if (portfolioHistory.length > 1) {
                      const first = portfolioHistory[0].value;
                      const last = portfolioHistory[portfolioHistory.length - 1].value;
                      if (last > first) chartColor = '#16a34a';
                      else if (last < first) chartColor = '#dc2626';
                    }
                    return (
                      <div className="flex-1 min-w-0">
                        <ChartContainer
                          config={{ value: { label: 'Portfolio Value', color: chartColor } }}
                        >
                          <ResponsiveContainer width="100%" height={60}>
                            <AreaChart
                              data={portfolioHistory}
                              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorPortfolioValue"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#a1a1aa' }}
                                minTickGap={30}
                              />
                              <YAxis
                                tick={{ fontSize: 12, fill: '#a1a1aa' }}
                                width={80}
                                domain={['auto', 'auto']}
                                tickFormatter={(v: number) =>
                                  v >= 1_000_000
                                    ? (v / 1_000_000).toFixed(1) + 'M'
                                    : v >= 1_000
                                      ? (v / 1_000).toFixed(1) + 'K'
                                      : v.toLocaleString()
                                }
                              />
                              <Tooltip
                                content={({
                                  active,
                                  payload,
                                  label,
                                }: {
                                  active?: boolean;
                                  payload?: any[];
                                  label?: string;
                                }) => {
                                  if (!active || !payload || !payload.length) return null;
                                  return (
                                    <div
                                      className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-2 py-1 shadow-lg text-[11px] min-w-[80px]"
                                      style={{ lineHeight: 1.2 }}
                                    >
                                      <div
                                        className="mb-0.5"
                                        style={{ color: chartColor, fontSize: '11px' }}
                                      >
                                        {label}
                                      </div>
                                      <div>
                                        <span style={{ color: chartColor, fontSize: '11px' }}>
                                          Value:
                                        </span>{' '}
                                        $
                                        {payload[0]?.payload?.value?.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                fillOpacity={1}
                                fill="url(#colorPortfolioValue)"
                                name="Portfolio Value"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    );
                  })()}
                {dividendHistory && dividendHistory.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <ChartContainer config={{ amount: { label: 'Dividende', color: '#22c55e' } }}>
                      <ResponsiveContainer width="100%" height={60}>
                        <BarChart
                          data={dividendHistory}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                          <YAxis tick={{ fontSize: 10 }} width={60} domain={[0, 'auto']} />
                          <Tooltip
                            content={<ChartTooltipContent />}
                            formatter={(value: number) =>
                              `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            }
                            labelFormatter={(label: string) => `Date: ${label}`}
                          />
                          <Bar dataKey="amount" fill="#22c55e" name="Dividende" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}
              </div>
            ) : null}
            <button
              className="mt-8 w-full flex items-center justify-center gap-2 bg-[#fafafa] text-gray-900 font-medium rounded-md text-sm h-10 border-none hover:bg-gray-100 transition"
              onClick={() => {
                setResult(null);
                setPortfolioHistory(null);
                setDividendHistory(null);
                setError(null);
              }}
            >
              <Play className="w-5 h-5" />
              New Backtest
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
