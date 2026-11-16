'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { isPriceSymbol } from '@/lib/asset-directory';
import { comparePortfolio, type PortfolioObservation } from '@/lib/portfolio-risk';

import { signedPercent, useMarketSeries, type MarketSeries } from './use-market-series';

function observations(series?: MarketSeries): PortfolioObservation[] {
  return series?.prices.map((value, index) => ({
    date: new Date(series.timestamps[index]).toISOString().slice(0, 10), value,
  })) ?? [];
}

export default function AssetComparison() {
  const params = useSearchParams();
  const [first, setFirst] = useState(params?.get('symbol')?.toUpperCase() ?? '');
  const [second, setSecond] = useState('');
  const [pair, setPair] = useState<string[]>([]);
  const [error, setError] = useState('');
  const { entries, refresh } = useMarketSeries(pair);
  const [left, right] = pair.map(symbol => entries[symbol]);
  const points = comparePortfolio(observations(left?.data), observations(right?.data));
  const last = points.at(-1);
  const warnings = pair.filter(symbol => entries[symbol]?.error);
  return <section className="compare-workspace">
    <form className="compare-form" onSubmit={event => {
      event.preventDefault();
      const symbols = [first, second].map(value => value.trim().toUpperCase());
      if (!symbols.every(isPriceSymbol) || symbols[0] === symbols[1]) {
        setError('Enter two distinct ticker symbols.'); return;
      }
      setError('');
      if (symbols.join('|') === pair.join('|')) refresh();
      else setPair(symbols);
    }}>
      <label className="planner-field">First ticker<input required value={first} placeholder="Ticker symbol" onChange={event => setFirst(event.target.value.toUpperCase())} /></label>
      <label className="planner-field">Compare with<input required value={second} placeholder="Ticker symbol" onChange={event => setSecond(event.target.value.toUpperCase())} /></label>
      <button className="terminal-button primary">Compare prices</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {!pair.length && <p className="directory-count">Choose two symbols to load the last three months of closing prices.</p>}
    {pair.length > 0 && (!left || !right) && <p role="status">Fetching observed prices for {pair.join(' and ')}…</p>}
    {warnings.length > 0 && <p role="status">Latest request unavailable for {warnings.join(', ')}. Cached observations are used only when available. <button className="underline" onClick={refresh}>Retry</button></p>}
    {left && right && !last && <p role="status">A comparison needs two common dates with published prices. No missing prices have been filled in.</p>}
    {last && <>
      <header className="comparison-header"><h2>Price performance</h2><p>{points[0].date} – {last.date} · {points.length} common dates</p></header>
      <dl className="comparison-values">{[last.portfolio, last.benchmark].map((value, index) => <div key={pair[index]}><dt>{pair[index]} · {entries[pair[index]]?.data?.currency ?? 'unit unavailable'}</dt><dd>{signedPercent(value - 100)}</dd></div>)}</dl>
      <div className="h-64" role="img" aria-label={'Indexed closing prices for ' + pair.join(' and ')}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="date" minTickGap={50} tick={{ fontSize: 10 }} /><YAxis domain={['auto','auto']} width={42} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ background: 'var(--app-surface)', borderColor: 'var(--app-separator)' }} formatter={value => Number(value).toFixed(2)} />
          <Line name={pair[0]} dataKey="portfolio" stroke="var(--chart-color)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name={pair[1]} dataKey="benchmark" stroke="var(--app-secondary)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </div>
      <p className="terminal-note">Solid: {pair[0]} · Dashed: {pair[1]}. Indexed to 100 on the first shared UTC date. Local-currency price returns, not total returns; no FX conversion or dividends.</p>
    </>}
    <p className="workspace-source">Source: Yahoo Finance · Daily prices, possibly delayed. The current session can change before close. Last common observation: {last?.date ?? 'unavailable'}.</p>
  </section>;
}
