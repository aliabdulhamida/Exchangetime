'use client';

import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { downloadCsv } from '@/lib/csv-export';
import { sizePosition } from '@/lib/position-sizing';
import { tradeSchema } from '@/lib/record-schemas';
import { filterJournal, journalStats, tradeProfit as profit } from '@/lib/trade-journal';

import RecordError from './record-error';
import { useComposeAction } from './use-compose-action';
import { useLocalRecords } from './use-local-records';

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
  const [cashOnly, setCashOnly] = useState(false);
  const numbers = [account, risk, entry, stop, target, lot, fees, slippage].map(Number);
  const [capital, riskPct, entryPrice, stopPrice, targetPrice, lotSize, feePerUnit, slippagePct] =
    numbers;
  const complete = [account, risk, entry, stop, target, lot, fees, slippage].every(value => value.trim());
  const result = complete ? sizePosition({side: side as 'long' | 'short', capital, riskPct, entry: entryPrice,
    stop: stopPrice, target: targetPrice, increment: lotSize, commission: feePerUnit, slippagePct, cashOnly}) : null;
  const valid = Boolean(result);
  const {quantity = 0, exposure = 0, loss = 0, reward = 0, budget = 0} = result ?? {};
  return (
    <section className="terminal-chart-grid">
      <form className="tool-surface grid content-start gap-5" onSubmit={(event) => event.preventDefault()}>
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
        {side === 'long' && <label className="sizing-cash-toggle"><input type="checkbox" checked={cashOnly}
          onChange={event => setCashOnly(event.target.checked)} /> Limit entry cost to account equity</label>}
        {complete && !valid && (
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
            ['Modeled round-trip costs', result?.costs ?? 0],
            ['Unused risk budget', result?.unusedBudget ?? 0],
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
            <p className="terminal-note">Actual modeled risk</p>
            <strong className="text-2xl">
              {result ? result.effectiveRiskPct.toFixed(2) + '%' : '—'}
            </strong>
          </div>
        </div>
        {result?.capped && <p role="status" className="sizing-warning">Size limited by account equity, including modeled entry commission and slippage.</p>}
        {result && !quantity && <p role="status" className="sizing-warning">The risk budget cannot cover one quantity increment. No position fits these assumptions.</p>}
        {result && quantity > 0 && reward <= 0 && <p role="status" className="sizing-warning">Modeled costs consume the entire target move. Net target P/L is not positive.</p>}
        {valid && exposure > capital && (
          <p className="rounded border border-amber-300/30 bg-amber-300/5 p-3 text-xs text-amber-200">
            Notional exceeds account equity. This size requires leverage or a smaller position.
          </p>
        )}
        {side === 'short' && result && <p className="terminal-note">Short positions require broker margin and borrow availability. Neither is calculated here.</p>}
        <details className="terminal-note">
          <summary>Calculation & execution assumptions</summary>
          <p className="mt-2">
            Size = risk budget ÷ (entry-to-stop distance + two commissions + two slippage
            allowances), rounded down to the quantity increment. All inputs use the account
            currency. A stop order can fill beyond the modeled price during gaps. This calculator
            covers unit-based instruments. Slippage uses the entry price on both sides. The optional cash cap applies only to long entries and includes one entry commission and slippage allowance. Financing and borrow costs are excluded.
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
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  useComposeAction('TradeJournal', () => {
    setEditing(null); setSymbol(''); setEntry(''); setExit(''); setQuantity('');
    setNotes(''); setFees('0'); setDate(new Date().toISOString().slice(0, 10));
    document.getElementById('journal-symbol')?.focus();
  });
  const visible = filterJournal(records, {currency, query, side: direction, from, to});
  const stats = journalStats(visible);
  const invalidRange = Boolean(from && to && from > to);
  function exportJournal(selected = records) {
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
    const rows = selected.map((trade) => [
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
    downloadCsv('exchange-time-journal.csv', [header, ...rows]);
  }
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="terminal-label">
          Journal currency
          <select
            disabled={editing !== null}
            className="terminal-input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as typeof currency)}
          >
            {['EUR', 'USD', 'GBP'].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <button className="terminal-button" disabled={!records.length} onClick={() => exportJournal()}>
          <Download size={14} />
          Export all trades
        </button>
      </div>
      <div className="journal-filters">
        <label className="terminal-label">Find trade<input className="terminal-input" type="search" placeholder="Ticker or setup"
          value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label className="terminal-label">Direction<select className="terminal-input" value={direction} onChange={event => setDirection(event.target.value)}>
          <option value="">All trades</option><option value="long">Long</option><option value="short">Short</option></select></label>
        <label className="terminal-label">From<input className="terminal-input" type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
        <label className="terminal-label">To<input className="terminal-input" type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      </div>
      {invalidRange && <p role="alert">The end date must be on or after the start date.</p>}
      <div className="journal-selection"><p role="status">{visible.length} matching trades · {currency}</p>
        <button type="button" className="terminal-button" disabled={!query && !direction && !from && !to}
          onClick={() => {setQuery(''); setDirection(''); setFrom(''); setTo('');}}>Clear filters</button>
        <button type="button" className="terminal-button" disabled={!visible.length} onClick={() => exportJournal(visible)}>Export selection</button>
      </div>
      <div className="terminal-metrics">
        {[
          ['Net realized P/L', money(stats.net, currency)],
          ['Closed trades', String(visible.length)],
          [
            'Win rate',
            stats.winRate !== null
              ? stats.winRate.toFixed(1) +
                '%'
              : '—',
          ],
          ['Profit factor', stats.profitFactor !== null ? stats.profitFactor.toFixed(2) : '—'],
        ].map(([label, value]) => (
          <div className="terminal-metric" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {visible.length > 0 && <details className="journal-review"><summary>Selection review</summary>
        <dl>{[['Average trade', stats.average], ['Best trade', stats.best], ['Worst trade', stats.worst], ['Total fees', stats.fees]].map(([label, value]) =>
          <div key={String(label)}><dt>{label}</dt><dd>{value === null ? '—' : money(Number(value), currency)}</dd></div>)}</dl>
      </details>}
      <div className="terminal-chart-grid">
        <div className="overflow-x-auto">
          {!visible.length ? (
            <p className="terminal-empty">{records.length ? 'No trades match this currency and filter selection.' : 'Record a closed trade to start reviewing results.'}</p>
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
                        <details className="mt-2"><summary>Trade notes</summary><p className="mt-1 max-w-xs whitespace-pre-wrap text-muted-foreground">{trade.notes}</p></details>
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
                        aria-label={'Edit ' + trade.symbol + ' trade'}
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
                          document.getElementById('journal-symbol')?.focus();
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="terminal-icon"
                        title={'Remove ' + trade.symbol + ' trade'}
                        aria-label={'Remove ' + trade.symbol + ' trade'}
                        onClick={() => {
                          if (window.confirm('Delete the ' + trade.symbol + ' trade from ' + trade.date + '?') &&
                            save(records.filter(item => item.id !== trade.id))) {
                            if (editing === trade.id) { setEditing(null); setSymbol(''); }
                            setMessage('Trade deleted.');
                          }
                        }}
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
            Statistics include the selected closed trades in {currency}. P/L includes entered fees. Profit factor
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
            const validation = tradeSchema.element.safeParse(trade);
            if (!trade.symbol) { setMessage('Enter a ticker symbol.'); return; }
            if (!validation.success) {
              const issue = validation.error.issues[0];
              setMessage(String(issue.path[0] ?? 'Trade') + ': ' + issue.message);
              return;
            }
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
            <RecordError message={error} />
          )}
        </form>
      </div>
    </section>
  );
}
