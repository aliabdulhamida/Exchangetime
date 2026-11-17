'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { researchUrl } from './product-model';
import { ToolSegmented } from './tool-ui';
import { useMarketSeries, seriesChange, signedPercent } from './use-market-series';

export const sectors = [
  ['Technology', 'XLK'],
  ['Financials', 'XLF'],
  ['Health care', 'XLV'],
  ['Consumer discretionary', 'XLY'],
  ['Communication', 'XLC'],
  ['Industrials', 'XLI'],
  ['Consumer staples', 'XLP'],
  ['Energy', 'XLE'],
  ['Utilities', 'XLU'],
  ['Real estate', 'XLRE'],
  ['Materials', 'XLB'],
];

export default function SectorPerformance() {
  const feed = useMarketSeries(sectors.map(([, symbol]) => symbol));
  return <SectorView {...feed} />;
}

export function SectorView({ entries, refresh, compact = false }: ReturnType<typeof useMarketSeries> & {compact?: boolean}) {
  const [horizon, setHorizon] = useState(1);
  const [display, setDisplay] = useState('map');
  const rows = sectors
    .map(([name, symbol]) => ({
      name,
      symbol,
      entry: entries[symbol],
      change: seriesChange(entries[symbol]?.data, horizon),
    }))
    .sort((left, right) => (right.change ?? -Infinity) - (left.change ?? -Infinity));
  return (
    <section className="market-sectors terminal-panel">
      <div className="terminal-section-heading">
        <div>
          {compact ? <h2>Sector performance</h2> : <ToolSegmented value={display} onChange={setDisplay}
            label="Sector view" options={[{value: 'map', label: 'Heatmap'}, {value: 'table', label: 'Table'}]} />}
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Sector performance period"
            className="terminal-input !w-auto"
            value={horizon}
            onChange={(event) => setHorizon(Number(event.target.value))}
          >
            <option value={1}>1 day</option>
            <option value={5}>1 week</option>
            <option value={21}>1 month</option>
          </select>
          <button
            className="terminal-icon"
            title="Refresh sectors"
            aria-label="Refresh sectors"
            onClick={refresh}
          >
            <RotateCw size={15} />
          </button>
        </div>
      </div>
      {(compact || display === 'map') && <div
        className="sector-heatmap"
        aria-label="Sector performance heatmap, equal-sized ETF proxies"
      >
        {rows.map((row) => (
          <Link
            key={row.symbol}
            href={researchUrl(row.symbol, true)}
            className={
              'sector-tile ' +
              (row.change === null
                ? 'is-unavailable'
                : row.change < 0
                  ? 'is-negative'
                  : 'is-positive')
            }
            style={
              {
                '--sector-intensity': Math.min(0.2, 0.045 + Math.abs(row.change ?? 0) * 0.045),
              } as React.CSSProperties
            }
            title={
              row.entry?.data
                ? 'Observed ' +
                  new Date(row.entry.data.observedAt).toLocaleString() +
                  (row.entry.error ? ' · Stale' : '')
                : 'No observation available'
            }
          >
            <span className="sector-tile-symbol">
              {row.symbol}
              <span aria-hidden>{row.change === null ? '—' : row.change === 0 ? '→' : row.change < 0 ? '↘' : '↗'}</span>
            </span>
            <span className="sector-tile-name">{row.name}</span>
            <strong>
              {row.change === null
                ? row.entry?.error
                  ? 'Unavailable'
                  : '…'
                : signedPercent(row.change)}
            </strong>
            {row.entry?.error && row.entry.data && <small>Stale</small>}
          </Link>
        ))}
      </div>}
      {rows.some((row) => row.entry?.error) && <p role="status" className="terminal-note mt-3">Some feeds could not refresh.</p>}
      <details className="data-details">
        <summary>Data details</summary>
        <p>Source: Yahoo Finance. US sector ETF proxies; change over {horizon} trading session{horizon > 1 ? 's' : ''}. Equal tile sizes, not market-cap weighted. Quotes may be delayed.</p>
        <dl>
          {rows.map(row => <div key={row.symbol}><dt>{row.symbol}</dt><dd>{row.entry?.data?.observedAt ? new Date(row.entry.data.observedAt).toLocaleString() : 'Observation unavailable'}</dd></div>)}
        </dl>
      </details>
      {!compact && display === 'table' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3">Sector / ETF</th>
                <th className="text-right">1 day</th>
                <th className="text-right">1 week</th>
                <th className="text-right">1 month</th>
                <th className="text-right">Observed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} className="border-b border-border">
                  <td className="py-4">
                    <Link className="hover:underline" href={researchUrl(row.symbol, true)}>{row.name}</Link>
                    <span className="ml-2 text-xs text-muted-foreground">{row.symbol}</span>
                  </td>
                  {[1, 5, 21].map((period) => (
                    <td key={period} className="text-right font-mono">
                      {signedPercent(seriesChange(row.entry?.data, period))}
                    </td>
                  ))}
                  <td className="text-right text-xs text-muted-foreground">
                    {row.entry?.data ? new Date(row.entry.data.observedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
