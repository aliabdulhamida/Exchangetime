'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import type { AssetSnapshot } from '@/lib/asset-snapshot';

const MarketChart = dynamic(() => import('./market-chart'), {ssr: false, loading: () => <div className="asset-chart-loading" role="status">Loading chart…</div>});
const ranges = [{label: '1W', days: 7}, {label: '1M', days: 30}, {label: '3M', days: 90}, {label: '1Y', days: 366}];

export default function AssetHistory({snapshot, symbol}: {snapshot: AssetSnapshot | null; symbol: string}) {
  const [days, setDays] = useState(30);
  const points = snapshot?.points ?? [];
  const last = points.at(-1)?.date ?? 0;
  const visible = points.filter(point => point.date >= last - days * 86400000);
  return <section className="asset-history terminal-panel" aria-labelledby="asset-history-title">
    <header><h2 id="asset-history-title">Price history</h2>
      <button className="terminal-button" onClick={() => window.dispatchEvent(new CustomEvent('et-watchlist', {detail: symbol}))}>Add to watchlist</button>
    </header>
    <div className="tool-segmented-control" role="group" aria-label="Asset chart timeframe">
      {ranges.map(range => <button type="button" key={range.label} aria-pressed={days === range.days} onClick={() => setDays(range.days)}>{range.label}</button>)}
    </div>
    <div className="asset-history-chart" aria-label={'Daily price chart for ' + symbol}>
      {visible.length > 1 ? <MarketChart data={visible} currency={snapshot?.currency ?? null} /> : <p>Price history is currently unavailable.</p>}
    </div>
    <p className="terminal-note">Daily observations · May be delayed · No automatic live updates</p>
  </section>;
}
