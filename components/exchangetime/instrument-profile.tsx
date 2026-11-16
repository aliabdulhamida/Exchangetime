'use client';

import Link from 'next/link';
import { useState } from 'react';

import { assetKinds } from '@/lib/asset-directory';
import { formatQuote } from '@/lib/research-history';

import MarketChart from './market-chart';
import { workspaceUrl } from './product-model';
import { signedPercent, useMarketSeries } from './use-market-series';

export default function InstrumentProfile({ symbol }: { symbol: string }) {
  const [sessions, setSessions] = useState(0);
  const { entries, refresh } = useMarketSeries([symbol]);
  const entry = entries[symbol];
  const series = entry?.data;
  const points = series?.prices.map((price, index) => ({ price, date: series.timestamps[index] })).slice(sessions ? -sessions - 1 : 0) ?? [];
  const first = points[0];
  const last = points.at(-1);
  const kind = assetKinds[series?.instrumentType as keyof typeof assetKinds];
  const unit = kind === 'Index' ? 'points' : series?.currency ?? undefined;
  const percent = last && first && points.length > 1 && first.price > 0 ? (last.price / first.price - 1) * 100 : null;
  return <section className="instrument-profile" aria-label="Instrument price history">
    <div className="instrument-actions">
      <button className="terminal-button" onClick={() => window.dispatchEvent(new Event('et-asset-search'))}>Find another instrument</button>
      <Link className="terminal-button" href={workspaceUrl('AssetComparison') + '&symbol=' + encodeURIComponent(symbol)}>Compare prices ↗</Link>
      <button className="terminal-button" onClick={() => window.dispatchEvent(new CustomEvent('et-watchlist', { detail: symbol }))}>Add to watchlist</button>
    </div>
    <header className="instrument-heading">
      <div><p className="terminal-note">{[kind, series?.exchange].filter(Boolean).join(' · ') || 'Price history'}</p>
        <h2>{symbol}</h2>{series?.name !== symbol && <p>{series?.name}</p>}</div>
      {last && <div><strong>{formatQuote(last.price, unit)}</strong><p>{signedPercent(percent)} · selected period</p></div>}
    </header>
    {!entry && <p role="status">Loading observed prices…</p>}
    {entry?.error && <p role="status">{series ? 'Refresh failed. Showing the last available observations.' : 'Prices are unavailable for this instrument.'} <button className="underline" onClick={refresh}>Retry</button></p>}
    {last && series && <>
      <div className="market-history-controls"><h3>Price history</h3>
        <div className="market-time-ranges" aria-label="Chart range">{[[5, '1W'], [21, '1M'], [0, '3M']].map(([count, label]) =>
          <button key={count} aria-pressed={sessions === count} onClick={() => setSessions(Number(count))}>{label}</button>)}</div>
      </div>
      {points.length > 1 ? <div className="market-history-canvas"><MarketChart data={points} currency={unit ?? null} /></div> : <p>Only one price observation is available.</p>}
      <p className="workspace-source">Yahoo Finance · Daily prices · Last bar: {new Date(last.date).toISOString().slice(0, 10)} UTC · Possibly delayed; an open session is provisional.</p>
      <details className="instrument-observations"><summary>Price observations ({points.length})</summary>
        <table><thead><tr><th>Date (UTC)</th><th>Price{unit && ' · ' + unit}</th></tr></thead>
          <tbody>{[...points].reverse().map(point => <tr key={point.date}><td>{new Date(point.date).toISOString().slice(0, 10)}</td><td>{formatQuote(point.price, unit)}</td></tr>)}</tbody></table>
      </details>
    </>}
  </section>;
}
