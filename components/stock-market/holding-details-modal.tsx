'use client';

import { AlertTriangle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HoldingDetailsData {
  symbol: string;
  quantity: number;
  openCostBasis: number;
  avgOpenCost: number;
  currentPrice: number | null;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPct: number | null;
  realizedPnl: number;
  dividendReturn: number;
  totalContribution: number;
  weightPct: number;
}

interface HoldingTransaction {
  id: string;
  side: 'BUY' | 'SELL';
  shares: number;
  date: string;
  price: number;
  fees: number;
  taxes: number;
  currency: string;
}

interface HoldingSeriesPoint {
  date: string;
  close: number;
}

interface HoldingMeta {
  asOfUtc: string | null;
  source: string;
  exchangeTimezone: string | null;
  currency: string | null;
}

interface HoldingQuoteDetails {
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  dayChange: number | null;
  dayChangePct: number | null;
  source: string | null;
  asOfUtc: string | null;
  shortName: string | null;
  longName: string | null;
  quoteType: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  businessSummary: string | null;
  marketCap: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  epsTrailingTwelveMonths: number | null;
  beta: number | null;
  volume: number | null;
  averageVolume: number | null;
  dividendRate: number | null;
  dividendYieldPct: number | null;
}

interface HoldingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string | null;
  baseCurrency: string;
  holding: HoldingDetailsData | null;
  transactions: HoldingTransaction[];
  stockSeries: HoldingSeriesPoint[];
  stockMeta: HoldingMeta | null;
  marketQuote: HoldingQuoteDetails | null;
  loading: boolean;
  error: string | null;
}

function formatMoney(value: number | null, currency: string, min = 2, max = 2): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const normalized = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  try {
    return value.toLocaleString(undefined, {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
  } catch {
    return `${value.toFixed(max)} ${normalized}`;
  }
}

function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

function formatAsOf(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCompactNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '-';
  try {
    return value.toLocaleString(undefined, {
      notation: 'compact',
      maximumFractionDigits: digits,
    });
  } catch {
    return value.toFixed(digits);
  }
}

function formatMoneyCompact(value: number | null, currency: string, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const normalized = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  try {
    return value.toLocaleString(undefined, {
      style: 'currency',
      currency: normalized,
      notation: 'compact',
      maximumFractionDigits: digits,
    });
  } catch {
    return formatMoney(value, normalized, 2, 2);
  }
}

function formatDecimal(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '-';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function withHttpProtocol(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function formatChartAxisDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function HoldingDetailsModal({
  open,
  onOpenChange,
  symbol,
  baseCurrency,
  holding,
  transactions,
  stockSeries,
  stockMeta,
  marketQuote,
  loading,
  error,
}: HoldingDetailsModalProps) {
  const quoteCurrency = marketQuote?.currency || stockMeta?.currency || baseCurrency;
  const asOf = marketQuote?.asOfUtc || stockMeta?.asOfUtc || null;
  const chartData = stockSeries.slice(-120).map((point) => ({ date: point.date, value: point.close }));
  const companyName = marketQuote?.longName || marketQuote?.shortName || null;
  const websiteHref = withHttpProtocol(marketQuote?.website || null);
  const dayLow = marketQuote?.dayLow ?? null;
  const dayHigh = marketQuote?.dayHigh ?? null;
  const fiftyTwoWeekLow = marketQuote?.fiftyTwoWeekLow ?? null;
  const fiftyTwoWeekHigh = marketQuote?.fiftyTwoWeekHigh ?? null;
  const summaryText = marketQuote?.businessSummary
    ? marketQuote.businessSummary.length > 260
      ? `${marketQuote.businessSummary.slice(0, 260)}...`
      : marketQuote.businessSummary
    : null;
  const dayRangeLabel =
    dayLow !== null && dayHigh !== null
      ? `${formatMoney(dayLow, quoteCurrency, 2, 2)} - ${formatMoney(dayHigh, quoteCurrency, 2, 2)}`
      : '-';
  const weekRangeLabel =
    fiftyTwoWeekLow !== null && fiftyTwoWeekHigh !== null
      ? `${formatMoney(fiftyTwoWeekLow, quoteCurrency, 2, 2)} - ${formatMoney(
          fiftyTwoWeekHigh,
          quoteCurrency,
          2,
          2,
        )}`
      : '-';
  const xAxisInterval =
    chartData.length > 1 ? Math.max(0, Math.floor(chartData.length / 6) - 1) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] gap-0 h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] overflow-hidden rounded-2xl border-border bg-background p-0 sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-3xl">
        <DialogHeader className="border-b border-border bg-card/55 px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="pr-10 sm:pr-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                  {symbol || 'Holding'}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[11px] leading-relaxed sm:text-xs">
                  {companyName ? `${companyName} • ` : ''}
                  Position details, market data and transaction activity
                </DialogDescription>
              </div>
              <div className="flex items-center justify-between sm:block sm:text-right">
                <div className="text-lg font-semibold text-foreground sm:text-xl">
                  {formatMoney(
                    marketQuote?.price ?? holding?.currentPrice ?? null,
                    quoteCurrency,
                    2,
                    2,
                  )}
                </div>
                <div className={marketQuote?.dayChangePct !== null && (marketQuote?.dayChangePct || 0) >= 0 ? 'text-[11px] text-emerald-300 sm:text-xs' : 'text-[11px] text-rose-300 sm:text-xs'}>
                  {formatPercent(marketQuote?.dayChangePct ?? null, 2)}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto px-3.5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:max-h-[72vh] sm:space-y-4 sm:px-5 sm:py-4">
          {error ? (
            <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Market data warning</span>
              </div>
              {error}
            </div>
          ) : null}

          {holding ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-border/65 bg-card/40 p-2.5 sm:p-3">
                <div className="text-[11px] text-muted-foreground">Market Value</div>
                <div className="text-base font-semibold sm:text-lg">{formatMoney(holding.currentValue, baseCurrency, 0, 0)}</div>
              </div>
              <div className="rounded-xl border border-border/65 bg-card/40 p-2.5 sm:p-3">
                <div className="text-[11px] text-muted-foreground">Quantity</div>
                <div className="text-base font-semibold sm:text-lg">{holding.quantity.toFixed(4)}</div>
              </div>
              <div className="rounded-xl border border-border/65 bg-card/40 p-2.5 sm:p-3">
                <div className="text-[11px] text-muted-foreground">Unrealized P/L</div>
                <div className={holding.unrealizedPnl >= 0 ? 'text-base font-semibold text-emerald-300 sm:text-lg' : 'text-base font-semibold text-rose-300 sm:text-lg'}>
                  {formatMoney(holding.unrealizedPnl, baseCurrency, 0, 0)}
                </div>
                <div className="text-[11px] text-muted-foreground">{formatPercent(holding.unrealizedPct, 2)}</div>
              </div>
              <div className="rounded-xl border border-border/65 bg-card/40 p-2.5 sm:p-3">
                <div className="text-[11px] text-muted-foreground">Open Cost Basis</div>
                <div className="text-base font-semibold sm:text-lg">{formatMoney(holding.openCostBasis, baseCurrency, 0, 0)}</div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border/65 bg-card/35 p-2.5 text-[11px] sm:p-3 sm:text-xs">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
                Position
              </div>
              {holding ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Average Cost</span>
                    <span>{formatMoney(holding.avgOpenCost, baseCurrency, 2, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current Price (base)</span>
                    <span>{formatMoney(holding.currentPrice, baseCurrency, 2, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Realized P/L</span>
                    <span className={holding.realizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {formatMoney(holding.realizedPnl, baseCurrency, 0, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dividends (net)</span>
                    <span>{formatMoney(holding.dividendReturn, baseCurrency, 0, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contribution</span>
                    <span className={holding.totalContribution >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {formatMoney(holding.totalContribution, baseCurrency, 0, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Portfolio Weight</span>
                    <span>{formatPercent(holding.weightPct, 2)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No position details available.</div>
              )}
            </div>

            <div className="rounded-xl border border-border/65 bg-card/35 p-2.5 text-[11px] sm:p-3 sm:text-xs">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
                Market
              </div>
              {loading && !marketQuote ? (
                <div className="space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted/35" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted/35" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted/35" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Price</span>
                    <span>{formatMoney(marketQuote?.price ?? null, quoteCurrency, 2, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Previous Close</span>
                    <span>{formatMoney(marketQuote?.previousClose ?? null, quoteCurrency, 2, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Day Change</span>
                    <span className={marketQuote?.dayChangePct !== null && (marketQuote?.dayChangePct || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {formatMoney(marketQuote?.dayChange ?? null, quoteCurrency, 2, 2)} (
                      {formatPercent(marketQuote?.dayChangePct ?? null, 2)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">As of</span>
                    <span>{formatAsOf(asOf)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span>{marketQuote?.source || stockMeta?.source || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border/65 bg-card/35 p-2.5 text-[11px] sm:p-3 sm:text-xs">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
                Company
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-right">{companyName || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-right">{marketQuote?.quoteType || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Exchange</span>
                  <span className="text-right">{marketQuote?.exchange || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Sector</span>
                  <span className="text-right">{marketQuote?.sector || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="text-right">{marketQuote?.industry || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Country</span>
                  <span className="text-right">{marketQuote?.country || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Website</span>
                  {websiteHref ? (
                    <a
                      className="max-w-[60%] truncate text-right text-emerald-300 hover:text-emerald-200"
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {marketQuote?.website}
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                {summaryText ? (
                  <p className="rounded-lg border border-border/60 bg-background/35 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    {summaryText}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-border/65 bg-card/35 p-2.5 text-[11px] sm:p-3 sm:text-xs">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
                Fundamentals
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span>{formatMoneyCompact(marketQuote?.marketCap ?? null, quoteCurrency, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Day Range</span>
                  <span>{dayRangeLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">52W Range</span>
                  <span>{weekRangeLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">P/E (TTM)</span>
                  <span>{formatDecimal(marketQuote?.trailingPE ?? null, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Forward P/E</span>
                  <span>{formatDecimal(marketQuote?.forwardPE ?? null, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">EPS (TTM)</span>
                  <span>{formatMoney(marketQuote?.epsTrailingTwelveMonths ?? null, quoteCurrency, 2, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Beta</span>
                  <span>{formatDecimal(marketQuote?.beta ?? null, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span>{formatCompactNumber(marketQuote?.volume ?? null, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg. Volume</span>
                  <span>{formatCompactNumber(marketQuote?.averageVolume ?? null, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dividend Rate</span>
                  <span>{formatMoney(marketQuote?.dividendRate ?? null, quoteCurrency, 2, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dividend Yield</span>
                  <span>{formatPercent(marketQuote?.dividendYieldPct ?? null, 2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/65 bg-card/35 p-2.5 sm:p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
              Price History
            </div>
            {chartData.length > 1 ? (
              <div className="h-40 w-full sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="holdingModalPriceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.36} />
                        <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="rgba(148,163,184,0.22)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      interval={xAxisInterval}
                      minTickGap={24}
                      allowDuplicatedCategory={false}
                      tickFormatter={formatChartAxisDate}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const point: any = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg">
                            <div className="text-muted-foreground">
                              {new Date(`${point.date}T00:00:00`).toLocaleDateString()}
                            </div>
                            <div className="font-semibold">{formatMoney(point.value, quoteCurrency, 2, 2)}</div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#cbd5e1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#holdingModalPriceFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No chart data available.</div>
            )}
          </div>

          <div className="rounded-xl border border-border/65 bg-card/35 p-2.5 sm:p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
              Transactions
            </div>
            {transactions.length ? (
              <div className="space-y-2 sm:max-h-44 sm:overflow-y-auto">
                {transactions.slice(0, 12).map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-[10px] sm:text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span
                          className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            tx.side === 'BUY'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {tx.side}
                        </span>
                        {tx.shares} @ {formatMoney(tx.price, tx.currency, 2, 2)}
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(`${tx.date}T00:00:00`).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-0.5 text-muted-foreground">
                      Fees {formatMoney(tx.fees, tx.currency, 2, 2)} • Taxes{' '}
                      {formatMoney(tx.taxes, tx.currency, 2, 2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No transactions available.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
