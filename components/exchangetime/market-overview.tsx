'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronRight,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import MarketChart, { Sparkline } from './market-chart';
import MarketSessions from './market-sessions';
import { researchUrl, workspaceUrl } from './product-model';
import SectorPerformance, { sectors } from './sector-performance';
import { useMarketSeries, seriesChange, signedPercent } from './use-market-series';

const instruments = [
  { name: 'S&P 500', symbol: '^GSPC', region: 'United States', type: 'Index' },
  { name: 'Nasdaq 100', symbol: '^NDX', region: 'United States', type: 'Index' },
  { name: 'Dow Jones', symbol: '^DJI', region: 'United States', type: 'Index' },
  { name: 'DAX', symbol: '^GDAXI', region: 'Europe', type: 'Index' },
  { name: 'Euro Stoxx 50', symbol: '^STOXX50E', region: 'Europe', type: 'Index' },
  { name: 'FTSE 100', symbol: '^FTSE', region: 'Europe', type: 'Index' },
  { name: 'Nikkei 225', symbol: '^N225', region: 'Asia', type: 'Index' },
  { name: 'Hang Seng', symbol: '^HSI', region: 'Asia', type: 'Index' },
  { name: 'Bitcoin', symbol: 'BTC-USD', region: 'Alternatives', type: 'Crypto' },
  { name: 'Gold futures', symbol: 'GC=F', region: 'Alternatives', type: 'Commodity' },
  { name: 'EUR/USD', symbol: 'EURUSD=X', region: 'Alternatives', type: 'Currency' },
];
const blockSchema = z.array(
  z.object({
    key: z.enum(['sessions', 'markets', 'chart', 'sectors']),
    visible: z.boolean(),
  }),
);
const defaults: z.infer<typeof blockSchema> = [
  { key: 'sessions', visible: true },
  { key: 'chart', visible: true },
  { key: 'markets', visible: true },
  { key: 'sectors', visible: true },
];
const blockNames = {
  sessions: 'Exchange sessions',
  markets: 'Global market quotes',
  chart: 'Market chart & regime',
  sectors: 'Sector performance',
};
const ranges = [
  { label: '1W', sessions: 5 },
  { label: '1M', sessions: 21 },
  { label: '3M', sessions: 0 },
];

export default function MarketOverview() {
  const [blocks, setBlocks] = useState(defaults);
  const [customize, setCustomize] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState('^GSPC');
  const [region, setRegion] = useState('United States');
  const [range, setRange] = useState(0);
  const visible = (key: string) => blocks.some((block) => block.key === key && block.visible);
  const { entries, refresh } = useMarketSeries([
    ...new Set([
      ...(visible('markets')
        ? instruments
            .filter((asset) => region === 'All' || asset.region === region)
            .map((asset) => asset.symbol)
        : []),
      ...(visible('chart') ? [selected, '^GSPC', '^VIX'] : []),
      ...(visible('sectors') || visible('chart') ? sectors.map(([, symbol]) => symbol) : []),
    ]),
  ]);
  useEffect(() => {
    try {
      const parsed = blockSchema.safeParse(
        JSON.parse(localStorage.getItem('et.dashboard.v1') || 'null'),
      );
      if (
        parsed.success &&
        parsed.data.length === 4 &&
        new Set(parsed.data.map((item) => item.key)).size === 4
      )
        setBlocks(parsed.data);
    } catch {}
  }, []);
  function update(next: typeof blocks) {
    setBlocks(next);
    try {
      localStorage.setItem('et.dashboard.v1', JSON.stringify(next));
      setNotice('Layout saved on this device.');
    } catch {
      setNotice('Layout changed for this session. Browser storage is unavailable.');
    }
  }
  function move(index: number, direction: number) {
    const next = [...blocks];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    update(next);
  }
  const chart = entries[selected]?.data;
  const chartData =
    chart?.prices
      .map((price, index) => ({ price, date: chart.timestamps[index] }))
      .slice(range ? -range - 1 : 0) || [];
  const periodChange =
    chartData.length > 1 && chartData[0].price > 0
      ? (chartData.at(-1)!.price / chartData[0].price - 1) * 100
      : null;
  const selectedAsset = instruments.find(({ symbol }) => symbol === selected)!;
  const breadthValues = sectors
    .map(([, symbol]) => seriesChange(entries[symbol]?.data))
    .filter((value): value is number => value !== null);
  const breadth =
    breadthValues.length >= 8
      ? (breadthValues.filter((value) => value > 0).length / breadthValues.length) * 100
      : null;
  const spy = entries['^GSPC']?.data;
  const sma =
    spy && spy.prices.length >= 50
      ? spy.prices.slice(-50).reduce((sum, value) => sum + value, 0) / 50
      : null;
  const positiveTrend = !!(spy && sma && spy.prices.at(-1)! > sma);
  const vix = entries['^VIX']?.data?.prices.at(-1);
  const score =
    breadth !== null && sma && vix !== undefined
      ? Math.round(breadth * 0.4 + (positiveTrend ? 30 : 0) + (vix < 20 ? 30 : vix < 30 ? 15 : 0))
      : null;
  const regime =
    score === null
      ? 'Awaiting data'
      : score >= 65
        ? 'Constructive'
        : score <= 35
          ? 'Defensive'
          : 'Mixed conditions';
  const hasStaleData = Object.values(entries).some((entry) => entry.error && entry.data);
  return (
    <section className="market-overview">
      <div className="market-overview-toolbar">
        <div className="market-region-tabs" aria-label="Market region">
          {['United States', 'Europe', 'Asia', 'Alternatives', 'All'].map((item) => (
            <button
              key={item}
              aria-pressed={region === item}
              onClick={() => {
                setRegion(item);
                const first = instruments.find((asset) => item === 'All' || asset.region === item);
                if (first) setSelected(first.symbol);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="terminal-button market-customize"
            aria-label="Customize dashboard"
            title="Customize dashboard"
            onClick={() => setCustomize((value) => !value)}
            aria-expanded={customize}
          >
            <SlidersHorizontal size={14} />
            <span>Customize</span>
          </button>
          <button
            className="terminal-icon"
            aria-label="Refresh market data"
            title="Refresh market data"
            onClick={refresh}
          >
            <RotateCw size={15} />
          </button>
        </div>
      </div>
      {customize && (
        <div className="terminal-panel grid gap-6 p-5 md:grid-cols-2">
          <div>
            <h2 className="mb-3 font-semibold">Your dashboard</h2>
            {blocks.map((block, index) => (
              <div key={block.key} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  aria-label={'Show ' + blockNames[block.key]}
                  checked={block.visible}
                  onChange={(event) =>
                    update(
                      blocks.map((item) =>
                        item.key === block.key ? { ...item, visible: event.target.checked } : item,
                      ),
                    )
                  }
                />
                <span className="flex-1 text-xs">{blockNames[block.key]}</span>
                <button
                  className="terminal-icon"
                  aria-label={'Move ' + blockNames[block.key] + ' up'}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="terminal-icon"
                  aria-label={'Move ' + blockNames[block.key] + ' down'}
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Start with a preset</h2>
            <div className="flex flex-wrap gap-2">
              <button className="terminal-button" onClick={() => update(defaults)}>
                Global markets
              </button>
              <button
                className="terminal-button"
                onClick={() =>
                  update([
                    { key: 'sectors', visible: true },
                    { key: 'chart', visible: true },
                    { key: 'markets', visible: true },
                    { key: 'sessions', visible: false },
                  ])
                }
              >
                Sector research
              </button>
            </div>
            <p role="status" className="terminal-note">
              {notice}
            </p>
          </div>
        </div>
      )}
      {blocks
        .filter((block) => block.visible)
        .map((block) => {
          if (block.key === 'sessions') return <MarketSessions key={block.key} />;
          if (block.key === 'sectors') return <SectorPerformance key={block.key} compact />;
          if (block.key === 'markets')
            return (
              <div
                key={block.key}
                className="market-quotes et-scrollbar"
                aria-label="Global market quotes"
              >
                {instruments
                  .filter((asset) => region === 'All' || asset.region === region)
                  .map(({ name, symbol, type }) => {
                    const entry = entries[symbol];
                    const quote = entry?.data;
                    const change = seriesChange(quote);
                    return (
                      <button
                        key={symbol}
                        onClick={() => setSelected(symbol)}
                        aria-pressed={selected === symbol}
                        className="market-quote"
                        title={
                          (quote
                            ? 'Observed ' + new Date(quote.observedAt).toLocaleString()
                            : 'Awaiting observations') +
                          ' · Yahoo Finance · Daily bars · Provider delay varies · Sparkline: latest 22 observations'
                        }
                      >
                        <div className="market-quote-top">
                          <span className="market-quote-identity">
                            <span className="market-quote-mark" aria-hidden>
                              {name.slice(0, 1)}
                            </span>
                            <span className="market-quote-name">{name}</span>
                          </span>
                          <ArrowUpRight size={13} />
                        </div>
                        <div className="market-quote-body">
                          <div>
                            <strong>
                              {quote?.prices.at(-1)?.toLocaleString(undefined, {
                                maximumFractionDigits: symbol.endsWith('=X') ? 4 : 2,
                              }) || (entry?.error ? 'Unavailable' : '—')}
                            </strong>
                            <span
                              className={
                                'market-quote-change ' +
                                (change === null ? '' : change < 0 ? 'is-negative' : 'is-positive')
                              }
                            >
                              {change !== null && (change < 0 ? '↘ ' : '↗ ')}
                              {signedPercent(change)}
                            </span>
                          </div>
                          <Sparkline
                            prices={quote?.prices.slice(-22) || []}
                            negative={(change ?? 0) < 0}
                          />
                        </div>
                        <div className="market-quote-meta">
                          <span>
                            {type} · {type === 'Index' ? 'points' : quote?.currency || '—'}
                          </span>
                          <span>
                            {quote
                              ? new Date(quote.observedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Loading'}
                            {entry?.error && quote ? ' · Stale' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            );
          return (
            <div key={block.key} className="market-intelligence-grid">
              <section className="market-history terminal-panel">
                <div className="market-history-header">
                  <div>
                    <div className="market-chart-name">
                      <span className="market-asset-mark">{selectedAsset.name.slice(0, 1)}</span>
                      <h2>
                        <Link href={researchUrl(selected, true)} className="hover:underline">
                          {selectedAsset.name}
                        </Link>
                      </h2>
                      <span className="market-unit">
                        {selectedAsset.type === 'Index'
                          ? 'points'
                          : chart?.currency || selectedAsset.type}
                      </span>
                    </div>
                    <div className="market-chart-price">
                      <strong>
                        {chart?.prices.at(-1)?.toLocaleString(undefined, {
                          maximumFractionDigits: selected.endsWith('=X') ? 4 : 2,
                        }) || '—'}
                      </strong>
                      <span
                        className={
                          periodChange === null
                            ? ''
                            : periodChange < 0
                              ? 'is-negative'
                              : 'is-positive'
                        }
                      >
                        {periodChange !== null && (periodChange < 0 ? '↘ ' : '↗ ')}
                        {signedPercent(periodChange)}
                        <small>in this period</small>
                      </span>
                    </div>
                  </div>
                  <Link
                    className="terminal-icon"
                    title="Open advanced chart"
                    aria-label="Open advanced chart"
                    href={
                      workspaceUrl('TechnicalAnalysis') + '&symbol=' + encodeURIComponent(selected)
                    }
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
                <div className="market-history-controls">
                  <span>Price performance</span>
                  <div className="market-time-ranges" aria-label="Chart time range">
                    {ranges.map((item) => (
                      <button
                        key={item.label}
                        aria-pressed={range === item.sessions}
                        onClick={() => setRange(item.sessions)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="market-history-canvas">
                  {chart ? (
                    <MarketChart
                      data={chartData}
                      currency={selectedAsset.type === 'Index' ? 'points' : chart.currency}
                    />
                  ) : (
                    <div
                      className={
                        'market-chart-loading ' + (entries[selected]?.error ? '' : 'animate-pulse')
                      }
                    >
                      {entries[selected]?.error ? (
                        <p>
                          Price history unavailable.{' '}
                          <button className="text-primary" onClick={refresh}>
                            Try again
                          </button>
                        </p>
                      ) : (
                        <>
                          <span />
                          <span />
                          <span />
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="market-chart-footer">
                  <span>
                    {chart
                      ? 'Observed ' + new Date(chart.observedAt).toLocaleString()
                      : entries[selected]?.error
                        ? 'No observations available'
                        : 'Loading daily observations'}
                    {entries[selected]?.error && chart ? ' · Stale data' : ''}
                  </span>
                  <span>Daily bars · Delayed</span>
                </div>
              </section>
              <section className="market-pulse terminal-panel">
                <div className="market-pulse-header">
                  <h2>Market pulse</h2>
                  <span className="market-model-badge">Model</span>
                </div>
                <p className="terminal-note">
                  US equities · S&amp;P 500 trend, volatility and sector breadth
                </p>
                <div className="market-pulse-score">
                  <strong>
                    {score ?? '—'}
                    <small>/100</small>
                  </strong>
                  <span>{regime}</span>
                </div>
                <div
                  className="market-score-track"
                  role="meter"
                  aria-label="Market conditions score"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={score ?? undefined}
                  aria-valuetext={score === null ? 'Awaiting data' : regime}
                >
                  {Array.from({ length: 20 }, (_, index) => (
                    <span
                      key={index}
                      className={score !== null && index * 5 < score ? 'is-filled' : ''}
                    />
                  ))}
                </div>
                <dl className="market-pulse-factors">
                  <div>
                    <dt>
                      Participation<span>US sector breadth</span>
                    </dt>
                    <dd>
                      {breadth === null ? '—' : Math.round(breadth) + '%'}
                      <span>{breadth === null ? 'Awaiting feeds' : 'advancing'}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Market trend<span>S&P 500 · 50-day average</span>
                    </dt>
                    <dd className={sma ? (positiveTrend ? 'is-positive' : 'is-negative') : ''}>
                      {sma ? (positiveTrend ? '↗ Above' : '↘ Below') : '—'}
                      <span>
                        {sma
                          ? positiveTrend
                            ? 'Positive trend'
                            : 'Cautious trend'
                          : 'Awaiting history'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Volatility<span>CBOE VIX</span>
                    </dt>
                    <dd>
                      {vix?.toFixed(2) || '—'}
                      <span>
                        {vix === undefined
                          ? 'Awaiting feed'
                          : vix < 20
                            ? 'Lower volatility'
                            : vix < 30
                              ? 'Moderate'
                              : 'Elevated'}
                      </span>
                    </dd>
                  </div>
                </dl>
                <details className="market-methodology">
                  <summary>
                    How is this calculated?
                    <ChevronRight size={12} />
                  </summary>
                  <p>
                    Sector participation contributes up to 40 points. S&P 500 above its 50-session
                    average adds 30. VIX below 20 adds 30; between 20 and 30 adds 15. At least eight
                    sector feeds are required. Constructive ≥65; defensive ≤35. Delayed observations
                    can have different timestamps. This descriptive model is not investment advice.
                  </p>
                </details>
                <Link href={workspaceUrl('EconomicIndicators')} className="market-macro-link">
                  Explore global macro
                  <ArrowUpRight size={14} />
                </Link>
              </section>
            </div>
          );
        })}
      {!blocks.some((block) => block.visible) && (
        <p className="terminal-empty">
          All panels are hidden. Open Customize to restore your dashboard.
        </p>
      )}
      <div className="market-data-disclosure">
        <span className="session-dot" />
        <p>
          Yahoo Finance · Daily observations · Provider delays vary.
          {hasStaleData && ' Some feeds could not refresh; retained data is marked stale.'} Charts
          and models use the latest available observations, not streaming prices.
        </p>
      </div>
    </section>
  );
}
