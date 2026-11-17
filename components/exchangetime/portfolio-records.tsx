'use client';

import React, { useState } from 'react';

import { ToolSurface } from './tool-ui';

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
  const holdings = new Map<string, number>();
  records.forEach((record) =>
    holdings.set(
      record.symbol,
      (holdings.get(record.symbol) || 0) + (record.side === 'BUY' ? record.shares : -record.shares),
    ),
  );
  function exportRecords() {
    const escape = (value: unknown) =>
      '"' +
      (typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? "'" : '') +
      String(value).replaceAll('"', '""') +
      '"';
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
    const csv = [
      keys.join(','),
      ...records.map((record) => keys.map((key) => escape(record[key])).join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exchange-time-transactions.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      <div className="record-transactions">
        {[...records].reverse().map((record) => (
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
          </article>
        ))}
      </div>
      {editing && (
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
                onChange={(event) => setEditing({ ...editing, [key]: Number(event.target.value) })}
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
            <button className="terminal-button" type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </ToolSurface>
  );
}
