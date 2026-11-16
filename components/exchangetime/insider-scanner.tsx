'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  defaultInsiderFilters,
  filterInsiderTrades,
  validInsiderSymbol,
  type InsiderFilters,
  type InsiderPage,
  type InsiderSource,
  type InsiderTransaction,
} from '@/lib/insider-scanner';

import { researchUrl } from './product-model';

const number = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 });
const amount = (value: number | null) => (value === null ? '—' : number.format(value));

function TransactionTable({ rows, source }: { rows: InsiderTransaction[]; source: InsiderSource }) {
  const isNasdaq = source === 'nasdaq';
  return (
    <table className="insider-table">
      <caption className="sr-only">
        Reported insider purchases and sales, newest {isNasdaq ? 'transaction' : 'filing'} first
      </caption>
      <thead>
        <tr>
          {[
            isNasdaq ? 'Issuer' : 'Issuer / security',
            'Insider',
            'Side',
            isNasdaq ? 'Transaction date' : 'Traded / filed',
            'Units',
            'Price',
            'Gross value',
            ...(isNasdaq ? [] : ['Filing']),
          ].map((label) => (
            <th key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td>
              <Link className="insider-symbol" href={researchUrl(row.symbol)}>
                {row.symbol}
              </Link>
              {!isNasdaq && <small>{row.security || 'Security not specified'}</small>}
            </td>
            <td>
              {row.insider || 'Name not reported'}
              <small>{row.role || 'Role not reported'}</small>
            </td>
            <td>
              <span className={'insider-side ' + row.side}>
                {row.side === 'buy' ? '↗ Buy' : '↘ Sell'}
              </span>
              {row.automatic && <small>Automatic</small>}
            </td>
            <td data-label={isNasdaq ? 'Transaction date' : 'Transaction / filing date'}>
              {row.traded ?? '—'}
              {row.filed && <small>Filed {row.filed}</small>}
            </td>
            <td data-label="Units">{amount(row.quantity)}</td>
            <td data-label="Price">{amount(row.price)}</td>
            <td data-label="Gross value">{amount(row.value)}</td>
            {!isNasdaq && (
              <td>
                {row.filingUrl ? (
                  <a
                    href={row.filingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={'Open SEC filing for ' + row.symbol + ' filed ' + row.filed}
                  >
                    {row.amended ? '4/A' : 'Form 4'} ↗
                  </a>
                ) : (
                  '—'
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FilingBatch({ symbol, filters }: { symbol: string; filters: InsiderFilters }) {
  const [page, setPage] = useState(0);
  const [source, setSource] = useState<InsiderSource | null>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ page: number; data: InsiderPage } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastAllowed, setLastAllowed] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (symbol) params.set('symbol', symbol);
    if (source) params.set('source', source);
    void (async () => {
      try {
        const response = await fetch('/api/insider-scanner?' + params, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 403 && body.code === 'history_restricted' && page > 0) {
          setLastAllowed(page - 1);
          setPage(page - 1);
          return;
        }
        if (!response.ok) throw new Error(body.error || 'Could not load filings.');
        if (!controller.signal.aborted) setResult({ page, data: body });
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Could not load filings.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [symbol, page, revision, source]);
  const data = result?.page === page ? result.data : null;
  const matches = useMemo(
    () =>
      filterInsiderTrades(data?.transactions ?? [], filters).sort(
        (left, right) =>
          (right.filed ?? '').localeCompare(left.filed ?? '') ||
          (right.traded ?? '').localeCompare(left.traded ?? ''),
      ),
    [data, filters],
  );
  return (
    <section aria-label="Insider scanner results" className="insider-results">
      <div className="insider-results-heading">
        <div>
          <h2>{symbol ? symbol + ' insider transactions' : 'Latest filings'}</h2>
          {data && (
            <p aria-live="polite">
              {matches.length} matching trades · {data.scanned} provider records scanned in batch{' '}
              {page + 1}
            </p>
          )}
        </div>
        <button
          className="terminal-button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          {error ? 'Retry' : 'Refresh'}
        </button>
      </div>
      {loading && (
        <p role="status" className="terminal-note">
          Loading reported transactions…
        </p>
      )}
      {error && (
        <p role="alert">
          {error}
          {data && ' Showing the last successful response.'}
        </p>
      )}
      {lastAllowed === page && (
        <p role="status" className="terminal-note">
          Older batches are not included in this feed. Showing the last accessible batch.
        </p>
      )}
      {data && (
        <>
          <p className="terminal-note">
            {data.stale && 'Refresh failed · Cached snapshot · '}Source:{' '}
            {data.source === 'nasdaq' ? (
              <a
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
                href={
                  'https://www.nasdaq.com/market-activity/stocks/' +
                  encodeURIComponent(symbol.toLowerCase()) +
                  '/insider-activity'
                }
              >
                Nasdaq · {symbol} transaction history
              </a>
            ) : (
              'Financial Modeling Prep'
            )}{' '}
            · Retrieved {new Date(data.retrievedAt).toLocaleString()} · Cached for 5 minutes.
            {data.source === 'nasdaq'
              ? ' Nasdaq supplies transaction dates, not filing dates.'
              : ' Filings may lag trades.'}
          </p>
          {matches.length ? (
            <TransactionTable rows={matches} source={data.source} />
          ) : (
            <p className="terminal-empty">
              {!data.scanned
                ? 'No filing records returned for this batch.'
                : !data.transactions.length
                  ? 'No reported purchases or sales in this batch.'
                  : 'No trades match your filters in this batch.'}
            </p>
          )}
        </>
      )}
      <div className="insider-paging">
        <button
          className="terminal-button"
          disabled={loading || !page}
          onClick={() => {
            if (data) setSource(data.source);
            setPage(page - 1);
          }}
        >
          Previous batch
        </button>
        <button
          className="terminal-button"
          disabled={loading || data?.nextPage == null || page === lastAllowed}
          onClick={() => {
            if (data?.nextPage != null) {
              setSource(data.source);
              setPage(data.nextPage);
            }
          }}
        >
          Next batch
        </button>
      </div>
    </section>
  );
}

function Scanner({ symbol }: { symbol: string }) {
  const [ticker, setTicker] = useState(symbol);
  const [validation, setValidation] = useState('');
  const [filters, setFilters] = useState<InsiderFilters>(defaultInsiderFilters);
  useEffect(() => {
    setTicker(symbol);
    setValidation('');
  }, [symbol]);
  function setFilter<Key extends keyof InsiderFilters>(key: Key, value: InsiderFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  function scan(input: string) {
    const next = input.trim().toUpperCase();
    if (next && !validInsiderSymbol(next)) {
      setValidation('Enter one ticker, for example AAPL, or leave it blank for all issuers.');
      return;
    }
    setValidation('');
    setTicker(next);
    if (next === symbol) return;
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('symbol', next);
    else url.searchParams.delete('symbol');
    window.history.pushState(null, '', url);
  }
  return (
    <div className="insider-scanner">
      <form
        className="insider-scope"
        onSubmit={(event) => {
          event.preventDefault();
          scan(ticker);
        }}
      >
        <label className="planner-field">
          Issuer ticker
          <input
            maxLength={15}
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            aria-invalid={Boolean(validation)}
            placeholder="All issuers"
          />
        </label>
        <button className="terminal-button primary">Scan filings</button>
        {symbol && (
          <button type="button" className="terminal-button" onClick={() => scan('')}>
            All issuers
          </button>
        )}
      </form>
      {validation && <p role="alert">{validation}</p>}
      <div className="insider-filter-bar" aria-label="Transaction filters" role="group">
        <label className="planner-field">
          Transaction
          <select
            value={filters.side}
            onChange={(event) => setFilter('side', event.target.value as InsiderFilters['side'])}
          >
            <option value="all">Buys and sells</option>
            <option value="buy">Buys only</option>
            <option value="sell">Sells only</option>
          </select>
        </label>
        <label className="planner-field">
          Role
          <select
            value={filters.role}
            onChange={(event) => setFilter('role', event.target.value as InsiderFilters['role'])}
          >
            <option value="all">Any role</option>
            <option value="officer">Officer</option>
            <option value="director">Director</option>
            <option value="owner">10% owner</option>
          </select>
        </label>
        <label className="planner-field">
          Transaction date
          <select
            value={filters.days}
            onChange={(event) => setFilter('days', Number(event.target.value))}
          >
            <option value="0">Any date</option>
            {[7, 30, 90].map((days) => (
              <option key={days} value={days}>
                Last {days} days
              </option>
            ))}
          </select>
        </label>
        <label className="planner-field">
          Minimum gross value
          <select
            value={filters.minimumValue}
            onChange={(event) => setFilter('minimumValue', event.target.value)}
          >
            <option value="">Any value</option>
            {[10000, 100000, 1000000, 10000000].map((value) => (
              <option key={value} value={value}>
                {number.format(value)}+
              </option>
            ))}
          </select>
        </label>
        <label className="planner-field">
          Insider name
          <input
            type="search"
            placeholder="Any insider"
            value={filters.person}
            onChange={(event) => setFilter('person', event.target.value)}
          />
        </label>
        <button className="terminal-button" onClick={() => setFilters(defaultInsiderFilters)}>
          Clear filters
        </button>
      </div>
      <details className="insider-method">
        <summary>What the scanner includes</summary>
        <p>
          The market feed includes Form 4 and 4/A records with{' '}
          <a
            href="https://www.sec.gov/edgar/searchedgar/ownershipformcodes.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            SEC code P or S
          </a>
          : open-market or private purchases and sales. Gifts, grants, tax withholding and option
          exercises are excluded. For a ticker, the scanner queries company records, not the market
          feed. When using Nasdaq, only explicitly labeled buys and sells (including automatic
          trades) qualify; Nasdaq labels are not verified SEC codes.
        </p>
        <p>
          Each batch scans up to 100 provider records. Filters apply to that batch. Gross value is
          quantity × reported price, before fees, in the filing’s units (no currency conversion). A
          dash means not reported; missing values never pass a minimum. Date filters use the
          transaction date in UTC, not the filing date.
        </p>
      </details>
      {symbol && !validInsiderSymbol(symbol) ? (
        <p role="alert">Invalid ticker in this link. Choose all issuers or scan another ticker.</p>
      ) : (
        <FilingBatch key={symbol} symbol={symbol} filters={filters} />
      )}
    </div>
  );
}

export default function InsiderScanner() {
  const symbol = useSearchParams()?.get('symbol')?.trim().toUpperCase() ?? '';
  return <Scanner symbol={symbol} />;
}
