'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { isPriceSymbol } from '@/lib/asset-directory';
import { downloadCsv } from '@/lib/csv-export';
import { comparePortfolio, portfolioRisk, type PortfolioObservation } from '@/lib/portfolio-risk';

import FinancialTooltip from './financial-tooltip';
import { researchUrl, workspaceUrl } from './product-model';
import { ToolSegmented } from './tool-ui';
import { signedPercent, useMarketSeries, type MarketSeries } from './use-market-series';

function observations(series?: MarketSeries): PortfolioObservation[] {
  return (
    series?.prices.map((value, index) => ({
      date: new Date(series.timestamps[index]).toISOString().slice(0, 10),
      value,
    })) ?? []
  );
}

export default function AssetComparison() {
  const params = useSearchParams();
  const first = params?.get('symbol')?.toUpperCase() ?? '';
  const second = params?.get('against')?.toUpperCase() ?? '';
  return (
    <Comparison key={JSON.stringify([first, second])} initialFirst={first} initialSecond={second} />
  );
}

function Comparison({
  initialFirst,
  initialSecond,
}: {
  initialFirst: string;
  initialSecond: string;
}) {
  const router = useRouter();
  const [first, setFirst] = useState(initialFirst);
  const [second, setSecond] = useState(initialSecond);
  const pair =
    isPriceSymbol(initialFirst) && isPriceSymbol(initialSecond) && initialFirst !== initialSecond
      ? [initialFirst, initialSecond]
      : [];
  const [range, setRange] = useState('all');
  const [error, setError] = useState('');
  const { entries, refresh } = useMarketSeries(pair);
  const [left, right] = pair.map((symbol) => entries[symbol]);
  const all = comparePortfolio(observations(left?.data), observations(right?.data));
  const window = range === 'all' ? all : all.slice(-(Number(range) + 1));
  const points =
    range === 'all'
      ? all
      : comparePortfolio(
          window.map((point) => ({ date: point.date, value: point.portfolio })),
          window.map((point) => ({ date: point.date, value: point.benchmark })),
        );
  const last = points.at(-1);
  const warnings = pair.filter((symbol) => entries[symbol]?.error);
  return (
    <section className="compare-workspace">
      <form
        className="compare-form"
        onSubmit={(event) => {
          event.preventDefault();
          const symbols = [first, second].map((value) => value.trim().toUpperCase());
          if (!symbols.every(isPriceSymbol) || symbols[0] === symbols[1]) {
            setError('Enter two distinct ticker symbols.');
            return;
          }
          setError('');
          if (symbols.join('|') === pair.join('|')) refresh();
          else
            router.push(
              workspaceUrl('AssetComparison') +
                '&' +
                new URLSearchParams({ symbol: symbols[0], against: symbols[1] }),
              { scroll: false },
            );
        }}
      >
        <label className="planner-field">
          First ticker
          <input
            required
            value={first}
            placeholder="Ticker symbol"
            onChange={(event) => setFirst(event.target.value.toUpperCase())}
          />
        </label>
        <label className="planner-field">
          Compare with
          <input
            required
            value={second}
            placeholder="Ticker symbol"
            onChange={(event) => setSecond(event.target.value.toUpperCase())}
          />
        </label>
        <button className="terminal-button primary">Compare prices</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {pair.length > 0 && (!left || !right) && (
        <p role="status">Fetching observed prices for {pair.join(' and ')}…</p>
      )}
      {warnings.length > 0 && (
        <p role="status">
          Latest request unavailable for {warnings.join(', ')}. Cached observations are used only
          when available.{' '}
          <button className="underline" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {left?.data && right?.data && !last && (
        <p role="status">
          A comparison needs two common dates with published prices. No missing prices have been
          filled in.
        </p>
      )}
      {last && (
        <>
          <header className="comparison-header">
            <h2>Price returns</h2>
            <p>
              {points[0].date} – {last.date} · {points.length} shared dates
            </p>
          </header>
          <ToolSegmented
            value={range}
            onChange={setRange}
            label="Comparison period"
            options={[
              ...(all.length > 5 ? [{ value: '5', label: '5 sessions' }] : []),
              ...(all.length > 21 ? [{ value: '21', label: '21 sessions' }] : []),
              { value: 'all', label: 'Full period' },
            ]}
          />
          <dl className="comparison-values compare-results">
            {[last.portfolio, last.benchmark].map((value, index) => (
              <div key={pair[index]}>
                <dt>
                  <i className="comparison-line" aria-hidden />
                  <Link href={researchUrl(pair[index])}>{pair[index]}</Link>
                </dt>
                <dd>{signedPercent(value - 100)}</dd>
                <dd className="comparison-risk">
                  Max drawdown{' '}
                  {signedPercent(
                    portfolioRisk(
                      points.map((point) => ({
                        date: point.date,
                        value: index ? point.benchmark : point.portfolio,
                      })),
                    ).maxDrawdownPct,
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div
            className="h-64"
            role="img"
            aria-label={'Indexed closing prices for ' + pair.join(' and ')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" minTickGap={50} tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} width={42} tick={{ fontSize: 10 }} />
                <Tooltip content={<FinancialTooltip formatValue={(value) => value.toFixed(2)} />} />
                <Line
                  name={pair[0]}
                  dataKey="portfolio"
                  stroke="var(--chart-color)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name={pair[1]}
                  dataKey="benchmark"
                  stroke="var(--app-secondary)"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="instrument-observations">
            <summary>Indexed prices · {points.length} dates</summary>
            <button
              type="button"
              className="terminal-button"
              onClick={() =>
                downloadCsv('indexed-prices.csv', [
                  ['Date (UTC)', ...pair],
                  ...points.map((point) => [point.date, point.portfolio, point.benchmark]),
                ])
              }
            >
              Export indexed prices
            </button>
            <div
              className="tool-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Indexed prices"
            >
              <table>
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>{pair[0]}</th>
                    <th>{pair[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((point) => (
                    <tr key={point.date}>
                      <td>{point.date}</td>
                      <td>{point.portfolio.toFixed(2)}</td>
                      <td>{point.benchmark.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      {pair.length > 0 && (
        <details className="data-details">
          <summary>Yahoo Finance · Daily · May be delayed</summary>
          <p>
            Three months of prices, indexed to 100 on the first shared UTC date. Local-currency
            returns exclude dividends and FX conversion. The current session can change before
            close.
          </p>
        </details>
      )}
    </section>
  );
}
