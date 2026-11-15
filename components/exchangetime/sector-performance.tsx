'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { workspaceUrl } from './product-model';
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

export default function SectorPerformance({ compact = false }: { compact?: boolean }) {
  const { entries, refresh } = useMarketSeries(sectors.map(([, symbol]) => symbol));
  const [horizon, setHorizon] = useState(1);
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
          <h2>Sector performance</h2>
          <p className="terminal-note">Where the market is moving · US sector ETF proxies</p>
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
      <div
        className="sector-heatmap"
        aria-label="Sector performance heatmap, equal-sized ETF proxies"
      >
        {rows.map((row) => (
          <Link
            key={row.symbol}
            href={workspaceUrl('StockAnalysis') + '&symbol=' + row.symbol}
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
              <span aria-hidden>{row.change === null ? '—' : row.change < 0 ? '↘' : '↗'}</span>
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
      </div>
      <p className="terminal-note mt-3">
        Source Yahoo Finance · Change over {horizon} trading session{horizon > 1 ? 's' : ''} · Equal
        tile sizes, not market-cap weighted. Quotes may be delayed. Hover a sector for its
        observation time.
        {rows.some((row) => row.entry?.error) && ' Some feeds could not refresh.'}
      </p>
      {!compact && (
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
                    {row.name}
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
