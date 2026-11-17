'use client';

import React, { useState } from 'react';

import { ToolSurface } from './tool-ui';
import { downloadCsv } from '../../lib/csv-export';

type RecordEntry = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  fees: number;
  taxes: number;
  currency: string;
  date: string;
};

export default function PortfolioRecords<T extends RecordEntry>({
  records,
  onUpdate,
  onDelete,
}: {
  records: T[];
  onUpdate: (record: T) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [side, setSide] = useState('');
  const [limit, setLimit] = useState(15);
  const matches = records
    .filter(
      (record) =>
        record.symbol.toUpperCase().includes(query.trim().toUpperCase()) &&
        (!side || record.side === side),
    )
    .sort((left, right) => right.date.localeCompare(left.date));
  const holdings = new Map<string, number>();
  records.forEach((record) =>
    holdings.set(
      record.symbol,
      (holdings.get(record.symbol) || 0) + (record.side === 'BUY' ? record.shares : -record.shares),
    ),
  );
  function exportRecords() {
    const keys = [
      'date',
      'symbol',
      'side',
      'shares',
      'price',
      'currency',
      'fees',
      'taxes',
    ] as const;
    downloadCsv('exchange-time-transactions.csv', [
      keys,
      ...records.map((record) => keys.map((key) => record[key])),
    ]);
  }
  return (
    <ToolSurface className="portfolio-records">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2>Portfolio records</h2>
        <button className="terminal-button" onClick={exportRecords} disabled={!records.length}>
          Export CSV
        </button>
      </header>
      <h3 className="mt-5 text-sm font-medium">Holdings · units</h3>
      <dl className="record-holdings">
        {[...holdings]
          .filter(([, shares]) => Math.abs(shares) > 1e-8)
          .map(([symbol, shares]) => (
            <div key={symbol}>
              <dt>{symbol}</dt>
              <dd>{shares.toLocaleString(undefined, { maximumFractionDigits: 8 })}</dd>
            </div>
          ))}
      </dl>
      <h3 className="mt-5 text-sm font-medium">Transactions · original currency</h3>
      {(records.length > 1 || query || side) && (
        <div className="record-filters">
          <input
            type="search"
            className="terminal-input"
            placeholder="Find ticker"
            aria-label="Filter transactions by ticker"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(15);
            }}
          />
          <select
            className="terminal-input"
            aria-label="Transaction side"
            value={side}
            onChange={(event) => {
              setSide(event.target.value);
              setLimit(15);
            }}
          >
            <option value="">All sides</option>
            <option value="BUY">Buys</option>
            <option value="SELL">Sales</option>
          </select>
        </div>
      )}
      {!matches.length && <p role="status">No matching transactions.</p>}
      <div className="record-transactions">
        {matches.slice(0, limit).map((record) => (
          <article key={record.id}>
            <div>
              <strong>{record.symbol}</strong>
              <span>
                {record.side} · {record.shares} units · {record.price.toLocaleString()}{' '}
                {record.currency}
              </span>
              <small>
                {record.date} · Fees {record.fees} · Taxes {record.taxes}
              </small>
            </div>
            <button
              className="terminal-button"
              aria-label={'Edit ' + record.symbol + ' transaction'}
              onClick={() => {
                setEditing({ ...record });
                setError('');
              }}
            >
              Edit
            </button>
            <button
              className="terminal-button"
              aria-label={'Delete ' + record.symbol + ' transaction'}
              onClick={() => {
                if (
                  window.confirm(
                    'Delete this transaction? Export your records first if you need a backup.',
                  )
                )
                  onDelete(record.id);
              }}
            >
              Delete
            </button>
            {editing && editing.id === record.id && (
              <form
                className="record-editor"
                aria-label="Edit transaction"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    ![editing.shares, editing.price, editing.fees, editing.taxes].every(
                      Number.isFinite,
                    ) ||
                    editing.shares <= 0 ||
                    editing.price <= 0 ||
                    editing.fees < 0 ||
                    editing.taxes < 0 ||
                    !editing.date
                  ) {
                    setError('Enter positive shares and price, non-negative costs, and a date.');
                    return;
                  }
                  onUpdate(editing);
                  setEditing(null);
                }}
              >
                <h3>Edit {editing.symbol}</h3>
                {(['shares', 'price', 'fees', 'taxes'] as const).map((key) => (
                  <label className="terminal-label" key={key}>
                    {key}
                    <input
                      className="terminal-input"
                      type="number"
                      min="0"
                      step="any"
                      value={editing[key]}
                      onChange={(event) =>
                        setEditing({ ...editing, [key]: Number(event.target.value) })
                      }
                    />
                  </label>
                ))}
                <label className="terminal-label">
                  Date
                  <input
                    className="terminal-input"
                    type="date"
                    required
                    value={editing.date}
                    onChange={(event) => setEditing({ ...editing, date: event.target.value })}
                  />
                </label>
                {error && <p role="alert">{error}</p>}
                <div className="flex gap-2">
                  <button className="terminal-button primary" type="submit">
                    Save transaction
                  </button>
                  <button
                    className="terminal-button"
                    type="button"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </article>
        ))}
      </div>
      {matches.length > limit && (
        <button className="terminal-button" onClick={() => setLimit((value) => value + 15)}>
          Show more transactions ({matches.length - limit})
        </button>
      )}
    </ToolSurface>
  );
}
