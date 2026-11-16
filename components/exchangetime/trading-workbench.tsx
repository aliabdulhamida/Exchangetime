'use client';

import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { tradeSchema } from '@/lib/record-schemas';

import { useComposeAction } from './use-compose-action';
import { useLocalRecords } from './use-local-records';

type Trade = z.infer<typeof tradeSchema>[number];
function profit(trade: Trade) {
  return (
    (trade.exit - trade.entry) * (trade.side === 'long' ? 1 : -1) * trade.quantity - trade.fees
  );
}
function money(value: number, currency: string) {
  return value.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 2 });
}

export function PositionSizing() {
  const [currency, setCurrency] = useState('EUR');
  const [side, setSide] = useState('long');
  const [account, setAccount] = useState('');
  const [risk, setRisk] = useState('1');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  const [lot, setLot] = useState('1');
  const [fees, setFees] = useState('0');
  const [slippage, setSlippage] = useState('0.1');
  const numbers = [account, risk, entry, stop, target, lot, fees, slippage].map(Number);
  const [capital, riskPct, entryPrice, stopPrice, targetPrice, lotSize, feePerUnit, slippagePct] =
    numbers;
  const valid =
    numbers.every(Number.isFinite) &&
    capital > 0 &&
    riskPct > 0 &&
    riskPct <= 100 &&
    entryPrice > 0 &&
    stopPrice > 0 &&
    targetPrice > 0 &&
    lotSize > 0 &&
    feePerUnit >= 0 &&
    slippagePct >= 0 &&
    (side === 'long'
      ? stopPrice < entryPrice && targetPrice > entryPrice
      : stopPrice > entryPrice && targetPrice < entryPrice);
  const budget = (capital * riskPct) / 100;
  const costPerUnit = 2 * feePerUnit + ((entryPrice * slippagePct) / 100) * 2;
  const unitRisk = Math.abs(entryPrice - stopPrice) + costPerUnit;
  const quantity = valid ? Math.floor(budget / unitRisk / lotSize) * lotSize : 0;
  const exposure = quantity * entryPrice;
  const loss = quantity * unitRisk;
  const reward = quantity * (Math.abs(targetPrice - entryPrice) - costPerUnit);
  return (
    <section className="terminal-chart-grid">
      <form className="grid content-start gap-5" onSubmit={(event) => event.preventDefault()}>
        <div className="flex flex-wrap gap-3">
          <label className="terminal-label">
            Account currency
            <select
              className="terminal-input"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {['EUR', 'USD', 'GBP'].map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
          <label className="terminal-label">
            Direction
            <select
              className="terminal-input"
              value={side}
              onChange={(event) => {
                setSide(event.target.value);
                setStop(target);
                setTarget(stop);
              }}
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Account equity', account, setAccount, '1', '1000000000', '1'],
            ['Risk per trade · %', risk, setRisk, '0.01', '100', '0.1'],
            ['Entry price', entry, setEntry, '0.0001', '10000000', '0.01'],
            ['Stop price', stop, setStop, '0.0001', '10000000', '0.01'],
            ['Target price', target, setTarget, '0.0001', '10000000', '0.01'],
            ['Quantity increment', lot, setLot, '0.000001', '1000000', '0.000001'],
            ['Commission per unit / side', fees, setFees, '0', '10000', '0.01'],
            ['Slippage per side · %', slippage, setSlippage, '0', '100', '0.01'],
          ].map(([label, value, setter, min, max, step]) => (
            <label key={String(label)} className="terminal-label">
              {String(label)}
              <input
                className="terminal-input"
                type="number"
                value={String(value)}
                onChange={(event) => (setter as typeof setEntry)(event.target.value)}
                min={String(min)}
                max={String(max)}
                step={String(step)}
                required
              />
            </label>
          ))}
        </div>
        {!valid && (
          <p role="alert" className="text-sm text-amber-300">
            Check the inputs. Long positions require stop &lt; entry &lt; target. Short positions
            require target &lt; entry &lt; stop.
          </p>
        )}
      </form>
      <div className="terminal-panel space-y-5 self-start p-5">
        <p className="terminal-eyebrow">Risk-based position</p>
        <p className="text-4xl font-semibold">
          {valid ? quantity.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'}
          <span className="ml-2 text-sm text-muted-foreground">units</span>
        </p>
        <div className="space-y-3 border-y border-border py-4">
          {[
            ['Risk budget', budget],
            ['Modeled loss at stop', loss],
            ['Modeled profit at target', reward],
            ['Position notional', exposure],
          ].map(([label, value]) => (
            <p key={label} className="flex justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <strong>{valid ? money(Number(value), currency) : '—'}</strong>
            </p>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="terminal-note">Reward / risk</p>
            <strong className="text-2xl">
              {valid && loss > 0 ? (reward / loss).toFixed(2) + 'R' : '—'}
            </strong>
          </div>
          <div>
            <p className="terminal-note">Equity exposure</p>
            <strong className="text-2xl">
              {valid ? ((exposure / capital) * 100).toFixed(1) + '%' : '—'}
            </strong>
          </div>
        </div>
        {valid && exposure > capital && (
          <p className="rounded border border-amber-300/30 bg-amber-300/5 p-3 text-xs text-amber-200">
            Notional exceeds account equity. This size requires leverage or a smaller position.
          </p>
        )}
        <details className="terminal-note">
          <summary>Calculation & execution assumptions</summary>
          <p className="mt-2">
            Size = risk budget ÷ (entry-to-stop distance + two commissions + two slippage
            allowances), rounded down to the quantity increment. All inputs use the account
            currency. A stop order can fill beyond the modeled price during gaps. This calculator
            covers unit-based instruments.
          </p>
        </details>
      </div>
    </section>
  );
}

export function TradeJournal() {
  const { records, save, ready, error } = useLocalRecords('et.journal.v1', tradeSchema);
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP'>('EUR');
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fees, setFees] = useState('0');
  const [setup, setSetup] = useState('Trend following');
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  useComposeAction('TradeJournal', () => {
    setEditing(null); setSymbol(''); setEntry(''); setExit(''); setQuantity('');
    setNotes(''); setFees('0'); setDate(new Date().toISOString().slice(0, 10));
    document.getElementById('journal-symbol')?.focus();
  });
  const visible = records
    .filter((trade) => trade.currency === currency)
    .sort((left, right) => right.date.localeCompare(left.date));
  const results = visible.map(profit);
  const gains = results.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = -results.filter((value) => value < 0).reduce((sum, value) => sum + value, 0);
  const net = gains - losses;
  function exportJournal() {
    const header = [
      'Symbol',
      'Date',
      'Side',
      'Entry',
      'Exit',
      'Quantity',
      'Fees',
      'Currency',
      'Setup',
      'Notes',
      'Net P/L',
    ];
    const rows = records.map((trade) => [
      trade.symbol,
      trade.date,
      trade.side,
      trade.entry,
      trade.exit,
      trade.quantity,
      trade.fees,
      trade.currency,
      trade.setup,
      trade.notes,
      profit(trade),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const text = String(cell);
            const safe = typeof cell === 'string' && /^[=+@\t\r-]/.test(text) ? "'" + text : text;
            return '"' + safe.replace(/"/g, '""') + '"';
          })
          .join(','),
      )
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'exchange-time-journal.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="terminal-label">
          Journal currency
          <select
            className="terminal-input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as typeof currency)}
          >
            {['EUR', 'USD', 'GBP'].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <button className="terminal-button" disabled={!records.length} onClick={exportJournal}>
          <Download size={14} />
          Export CSV
        </button>
      </div>
      <div className="terminal-metrics">
        {[
          ['Net realized P/L', money(net, currency)],
          ['Closed trades', String(visible.length)],
          [
            'Win rate',
            visible.length
              ? ((results.filter((value) => value > 0).length / visible.length) * 100).toFixed(1) +
                '%'
              : '—',
          ],
          ['Profit factor', losses > 0 ? (gains / losses).toFixed(2) : '—'],
        ].map(([label, value]) => (
          <div className="terminal-metric" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="terminal-chart-grid">
        <div className="overflow-x-auto">
          {!visible.length ? (
            <p className="terminal-empty">Record a closed trade to start reviewing results.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-3">Trade</th>
                  <th>Setup</th>
                  <th className="text-right">Net P/L</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((trade) => (
                  <tr className="border-b" key={trade.id}>
                    <td className="py-4">
                      <strong>{trade.symbol}</strong>
                      <p className="terminal-note">
                        {trade.date} · {trade.side} · {trade.quantity} units
                      </p>
                      {trade.notes && (
                        <p className="mt-1 max-w-xs whitespace-pre-wrap text-muted-foreground">
                          {trade.notes}
                        </p>
                      )}
                    </td>
                    <td>{trade.setup}</td>
                    <td
                      className={
                        'text-right font-mono ' +
                        (profit(trade) >= 0 ? 'text-emerald-300' : 'text-rose-300')
                      }
                    >
                      {money(profit(trade), currency)}
                    </td>
                    <td className="text-right">
                      <button
                        className="text-cyan-200"
                        onClick={() => {
                          setEditing(trade.id);
                          setSymbol(trade.symbol);
                          setDate(trade.date);
                          setSide(trade.side);
                          setEntry(String(trade.entry));
                          setExit(String(trade.exit));
                          setQuantity(String(trade.quantity));
                          setFees(String(trade.fees));
                          setSetup(trade.setup);
                          setNotes(trade.notes);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="terminal-icon"
                        title={'Remove ' + trade.symbol + ' trade'}
                        aria-label={'Remove ' + trade.symbol + ' trade'}
                        onClick={() => save(records.filter((item) => item.id !== trade.id))}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="terminal-note mt-4">
            Statistics include closed trades in {currency}. P/L includes entered fees. Profit factor
            is gross winning P/L divided by absolute losing P/L, after fees.
          </p>
        </div>
        <form
          className="terminal-panel space-y-4 self-start p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const trade = {
              id: editing || crypto.randomUUID(),
              symbol: symbol.trim().toUpperCase(),
              date,
              side,
              entry: Number(entry),
              exit: Number(exit),
              quantity: Number(quantity),
              fees: Number(fees),
              currency,
              setup,
              notes,
            };
            if (!tradeSchema.element.safeParse(trade).success) return;
            if (save([...records.filter((item) => item.id !== editing), trade])) {
              setSymbol('');
              setEntry('');
              setExit('');
              setQuantity('');
              setNotes('');
              setEditing(null);
              setMessage('Trade saved.');
            }
          }}
        >
          <h2 className="font-semibold">{editing ? 'Edit closed trade' : 'Log a closed trade'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="terminal-label">
              Symbol
              <input
                className="terminal-input"
                required
                maxLength={15}
                id="journal-symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                pattern="[A-Za-z0-9.:-]+"
              />
            </label>
            <label className="terminal-label">
              Close date
              <input
                className="terminal-input"
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>
          <label className="terminal-label">
            Direction
            <select
              className="terminal-input"
              value={side}
              onChange={(event) => setSide(event.target.value as typeof side)}
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Entry price', entry, setEntry, '0.000001'],
              ['Exit price', exit, setExit, '0'],
              ['Quantity', quantity, setQuantity, '0.000001'],
              ['Total fees', fees, setFees, '0'],
            ].map(([label, value, setter, min]) => (
              <label key={String(label)} className="terminal-label">
                {String(label)}{label==='Quantity'?' · units':' · '+currency}
                <input
                  className="terminal-input"
                  type="number"
                  required
                  min={String(min)}
                  step="any"
                  value={String(value)}
                  onChange={(event) => (setter as typeof setEntry)(event.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="terminal-label">
            Setup
            <input
              className="terminal-input"
              maxLength={80}
              value={setup}
              onChange={(event) => setSetup(event.target.value)}
            />
          </label>
          <label className="terminal-label">
            Reasoning & review
            <textarea
              className="terminal-input min-h-24"
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <button className="terminal-button primary w-full" disabled={!ready || !!error}>
            {editing ? 'Update trade' : 'Save trade'}
          </button>
          {editing && (
            <button
              className="terminal-button w-full"
              type="button"
              onClick={() => {
                setEditing(null);
                setSymbol('');
              }}
            >
              Cancel edit
            </button>
          )}
          <p role="status" className="terminal-note">
            {message}
          </p>
          {error && (
            <p role="alert" className="text-rose-300">
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
