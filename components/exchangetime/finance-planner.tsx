'use client';

import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { downloadCsv } from '@/lib/csv-export';
import { projectGoal } from '@/lib/financial-goals';
import { summarizeBalanceHistory } from '@/lib/net-worth-history';
import { balanceSchema, historySchema, goalSchema } from '@/lib/record-schemas';

import FinancialTooltip from './financial-tooltip';
import RecordError from './record-error';
import { useComposeAction } from './use-compose-action';
import { useLocalRecords } from './use-local-records';

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
const categories = {
  asset: ['Cash', 'Stocks & ETFs', 'Crypto', 'Real estate', 'Vehicles', 'Other assets'],
  liability: ['Mortgage', 'Loans', 'Credit cards', 'Other debt'],
};

export function NetWorth() {
  const { records, save, ready, error } = useLocalRecords('et.networth.v1', balanceSchema);
  const history = useLocalRecords('et.networth.history.v1', historySchema);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'asset' | 'liability'>('asset');
  const [category, setCategory] = useState('Cash');
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const assets = records
    .filter((record) => record.kind === 'asset')
    .reduce((sum, record) => sum + record.value, 0);
  const debt = records
    .filter((record) => record.kind === 'liability')
    .reduce((sum, record) => sum + record.value, 0);
  const net = assets - debt;
  const snapshots = summarizeBalanceHistory(history.records);
  function snapshot() {
    const date = new Date().toISOString().slice(0, 10);
    if (history.records.some(item => item.date === date) &&
      !window.confirm('Replace the saved snapshot for ' + date + ' (UTC) with your current balance sheet?')) return;
    const next = [
      ...history.records.filter((item) => item.date !== date),
      { date, assets, liabilities: debt, net },
    ].sort((left, right) => left.date.localeCompare(right.date));
    if (history.save(next)) setNotice('Today’s balance sheet snapshot saved.');
  }
  return (
    <section className="space-y-6">
      <div className="terminal-metrics net-worth-summary">
        {[
          ['Net worth', net],
          ['Total assets', assets],
          ['Liabilities', debt],
          ['Debt / assets', assets ? (debt / assets) * 100 : 0],
        ].map(([label, amount], index) => (
          <div key={label} className="terminal-metric">
            <p>{label}</p>
            <strong>
              {!ready || error ? '—' : index === 3 ? (assets ? Number(amount).toFixed(1) + '%' : '—') : currency(Number(amount))}
            </strong>
          </div>
        ))}
      </div>
      <div className="terminal-chart-grid">
        <div>
          <div className="terminal-section-heading">
            <h2>Balance sheet</h2>
            <button
              className="terminal-button"
              onClick={snapshot}
              disabled={
                !ready || !history.ready || records.length === 0 || !!error || !!history.error
              }
            >
              Save today’s snapshot
            </button>
          </div>
          {records.length === 0 && (
            <p className="terminal-empty">
              Add your first asset or liability to build your balance sheet.
            </p>
          )}
          <div className="divide-y divide-border">
            {records.map((record) => (
              <div className="flex items-center justify-between gap-3 py-3" key={record.id}>
                <div>
                  <p className="font-medium">{record.name}</p>
                  <p className="terminal-note">
                    {record.category} · {record.kind === 'liability' ? 'Liability' : 'Asset'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="text-xs text-cyan-200"
                    onClick={() => {
                      setEditing(record.id);
                      setName(record.name);
                      setKind(record.kind);
                      setCategory(record.category);
                      setValue(String(record.value));
                    }}
                  >
                    Edit
                  </button>
                  <span
                    className={'font-mono ' + (record.kind === 'liability' ? 'text-rose-300' : '')}
                  >
                    {record.kind === 'liability' ? '−' : ''}
                    {currency(record.value)}
                  </span>
                  <button
                    className="terminal-icon"
                    title={'Remove ' + record.name}
                    aria-label={'Remove ' + record.name}
                    onClick={() => {
                      if (window.confirm('Remove ' + record.name + ' from the balance sheet?') &&
                        save(records.filter(item => item.id !== record.id)) && editing === record.id) {
                        setEditing(null); setValue(''); setName('');
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p role="status" className="terminal-note">
            {notice}
          </p>
        </div>
        <form
          className="terminal-panel space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const amount = Number(value);
            if (!name.trim() || !Number.isFinite(amount) || amount < 0) return;
            if (
              save([
                ...records.filter((record) => record.id !== editing),
                {
                  id: editing || crypto.randomUUID(),
                  name: name.trim(),
                  kind,
                  category,
                  value: amount,
                },
              ])
            ) {
              setName('');
              setValue('');
              setEditing(null);
            }
          }}
        >
          <h2 className="font-semibold">{editing ? 'Edit balance' : 'Add a balance'}</h2>
          <label className="terminal-label">
            Name
            <input
              className="terminal-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              placeholder="Savings account"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="terminal-label">
              Type
              <select
                className="terminal-input"
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as typeof kind;
                  setKind(next);
                  setCategory(categories[next][0]);
                }}
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
              </select>
            </label>
            <label className="terminal-label">
              Category
              <select
                className="terminal-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories[kind].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="terminal-label">
            Current value · EUR
            <input
              type="number"
              className="terminal-input"
              min="0"
              max="100000000000"
              step="0.01"
              required
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <button className="terminal-button primary w-full" disabled={!ready || !!error}>
            <Plus size={14} />
            {editing ? 'Update balance' : 'Add balance'}
          </button>
          {editing && (
            <button
              className="terminal-button w-full"
              type="button"
              onClick={() => {
                setEditing(null);
                setName('');
                setValue('');
              }}
            >
              Cancel edit
            </button>
          )}
          <p className="terminal-note">
            Enter values in EUR. Portfolio values are entered manually to keep each asset counted
            once.
          </p>
        </form>
      </div>
      {(error || history.error) && (
        <RecordError message={error || history.error} />
      )}
      <div className="border-t border-border pt-5">
        <h2 className="font-semibold">Net worth history</h2>
        {snapshots.latest && !history.error && <div className="balance-history-summary">
          <div><span>Last saved · {snapshots.latest.date} UTC</span><strong>{currency(snapshots.latest.net)}</strong></div>
          {snapshots.change !== null && <div><span>Change since {snapshots.previous?.date}</span>
            <strong>{snapshots.change > 0 ? '+' : ''}{currency(snapshots.change)}</strong></div>}
          <p>Balance changes include deposits, withdrawals, debt changes and revaluations. They are not investment returns.</p>
        </div>}
        {history.records.length < 2 ? (
          <p className="terminal-empty">
            Save a snapshot on two different days to see your history.
          </p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshots.sorted}>
                <CartesianGrid stroke="var(--chart-grid)" strokeOpacity={0.6} vertical={false} strokeDasharray="2 6" />
                <XAxis dataKey="date" tick={{ fill: 'var(--app-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis
                  tickFormatter={(value) => currency(value)}
                  tick={{ fill: 'var(--app-secondary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={85}
                />
                <Tooltip content={<FinancialTooltip formatValue={value => currency(value)} />} />
                <Area
                  type="linear"
                  dataKey="net"
                  name="Net worth"
                  stroke="var(--chart-color)"
                  fill="var(--chart-color)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {history.records.length > 0 && <details className="instrument-observations">
          <summary>Saved snapshots · {history.records.length}</summary>
          <button type="button" className="terminal-button" onClick={() => downloadCsv('net-worth-history.csv', [
            ['Date (UTC)', 'Assets (EUR)', 'Liabilities (EUR)', 'Net worth (EUR)'],
            ...snapshots.sorted.map(row => [row.date, row.assets, row.liabilities, row.net]),
          ])}>Export snapshots</button>
          <div className="tool-table-scroll" role="region" tabIndex={0} aria-label="Saved balance sheets">
            <table><thead><tr><th>Date (UTC)</th><th>Assets</th><th>Liabilities</th><th>Net worth</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{[...snapshots.sorted].reverse().map(row => <tr key={row.date}><td>{row.date}</td>
                <td>{currency(row.assets)}</td><td>{currency(row.liabilities)}</td><td>{currency(row.net)}</td><td>
                  <button type="button" className="terminal-icon" aria-label={'Delete snapshot ' + row.date} disabled={!!history.error}
                    onClick={() => {
                      if (window.confirm('Delete the saved snapshot for ' + row.date + '? This does not delete your current assets or debts.') &&
                        history.save(history.records.filter(item => item.date !== row.date))) setNotice('Snapshot deleted.');
                    }}><Trash2 size={14} /></button>
                </td></tr>)}</tbody></table>
          </div>
        </details>}
      </div>
    </section>
  );
}

export function FinancialGoals() {
  const { records, save, ready, error } = useLocalRecords('et.goals.v1', goalSchema);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('0');
  const [years, setYears] = useState('5');
  const [rate, setRate] = useState('4');
  const [inflation, setInflation] = useState('2');
  const [editing, setEditing] = useState<string | null>(null);
  useComposeAction('FinancialGoals', () => {
    setEditing(null); setName(''); setTarget(''); setSaved('0');
    document.getElementById('financial-goal-name')?.focus();
  });
  const preview = {
    id: 'preview',
    name,
    target: Number(target),
    saved: Number(saved),
    years: Number(years),
    rate: Number(rate),
    inflation: Number(inflation),
  };
  const projection = [target, saved, years, rate, inflation].every(value => value.trim()) ? projectGoal(preview) : null;
  const valid = Boolean(projection) && goalSchema.element.safeParse(preview).success;
  return (
    <section className="terminal-chart-grid">
      <div>
        <div className="terminal-section-heading">
          <h2>Your goals</h2>
          <span className="terminal-note">
            {records.length} {records.length === 1 ? 'plan' : 'plans'}
          </span>
        </div>
        {!records.length && (
          <div className="terminal-empty">
            <TrendingUp size={24} className="mx-auto mb-3" />
            <p>Create a goal for your emergency fund, home, or retirement.</p>
          </div>
        )}
        {records.map((goal) => {
          const math = projectGoal(goal);
          if (!math) return <RecordError key={goal.id} message={'Check the saved assumptions for ' + goal.name + '.'} />;
          return (
            <article key={goal.id} className="border-b border-border py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{goal.name}</h3>
                  <p className="terminal-note">
                    {goal.years} years · {goal.rate}% assumed return · {goal.inflation}% inflation
                  </p>
                </div>
                <button
                  className="terminal-icon"
                  title={'Remove ' + goal.name}
                  aria-label={'Remove ' + goal.name}
                  onClick={() => {
                    if (window.confirm('Delete the goal “' + goal.name + '”?') &&
                      save(records.filter(item => item.id !== goal.id)) && editing === goal.id) {
                      setEditing(null); setName(''); setTarget('');
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <progress className="goal-progress" aria-label={goal.name + ' savings progress'} max={math.futureTarget}
                value={Math.min(goal.saved, math.futureTarget)} />
              <div className="goal-progress-label"><span>{math.progress.toFixed(0)}% funded</span><span>{currency(math.remaining)} remaining</span></div>
              <div className="flex flex-wrap justify-between gap-3">
                <p className="terminal-note">
                  {currency(goal.saved)} saved / {currency(math.futureTarget)} inflation-adjusted
                  target
                </p>
                <strong className="text-emerald-200">{currency(math.contribution)} / month</strong>
              </div>
              <button
                className="mt-3 text-xs text-cyan-200"
                onClick={() => {
                  setEditing(goal.id);
                  setName(goal.name);
                  setTarget(String(goal.target));
                  setSaved(String(goal.saved));
                  setYears(String(goal.years));
                  setRate(String(goal.rate));
                  setInflation(String(goal.inflation));
                }}
              >
                Edit goal & progress
              </button>
            </article>
          );
        })}
        {error && (
          <RecordError message={error} />
        )}
      </div>
      <form
        className="terminal-panel space-y-4 self-start p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || !name.trim()) return;
          const next = { ...preview, id: editing || crypto.randomUUID(), name: name.trim() };
          if (save([...records.filter((goal) => goal.id !== editing), next])) {
            setName('');
            setEditing(null);
          }
        }}
      >
        <h2 className="font-semibold">{editing ? 'Edit goal' : 'New financial goal'}</h2>
        <label className="terminal-label">
          Goal name
          <input
            id="financial-goal-name"
            className="terminal-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            placeholder="Emergency fund"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Target in today’s EUR', target, setTarget, '1', '1000000000', '1'],
            ['Already saved · EUR', saved, setSaved, '0', '1000000000', '1'],
            ['Time horizon · years', years, setYears, '1', '60', '1'],
            ['Expected return · %', rate, setRate, '-99', '50', '0.1'],
            ['Inflation · %', inflation, setInflation, '0', '30', '0.1'],
          ].map(([label, value, setter, min, max, step]) => (
            <label className="terminal-label" key={String(label)}>
              {String(label)}
              <input
                type="number"
                className="terminal-input"
                value={String(value)}
                onChange={(event) => (setter as typeof setTarget)(event.target.value)}
                min={String(min)}
                max={String(max)}
                step={String(step)}
                required
              />
            </label>
          ))}
        </div>
        {projection && (
          <div className="goal-preview">
            <p className="terminal-note">Required monthly contribution</p>
            <strong className="goal-preview-amount">
              {projection.contribution.toLocaleString(undefined, {style: 'currency', currency: 'EUR', maximumFractionDigits: 2})}
            </strong>
            <dl><div><dt>Future target</dt><dd>{currency(projection.futureTarget)}</dd></div>
              <div><dt>At 0% return</dt><dd>{currency(projection.withoutGrowth)} / month</dd></div></dl>
            <details className="goal-projection-details"><summary>Projected path · hypothetical</summary>
              <div className="h-48 mt-4" role="img" aria-label="Projected balance and total contributions">
                <ResponsiveContainer width="100%" height="100%"><AreaChart data={projection.projection}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 6" />
                  <XAxis dataKey="month" tick={{fontSize: 10, fill: 'var(--app-secondary)'}} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tickFormatter={value => (value / 1000).toFixed(0) + 'k'} width={44} tick={{fontSize: 10, fill: 'var(--app-secondary)'}} axisLine={false} tickLine={false} />
                  <Tooltip content={<FinancialTooltip labelFormatter={value => 'Month ' + value} formatValue={value => currency(value)} />} />
                  <Area dataKey="balance" name="Projected balance" stroke="var(--chart-color)" fill="var(--chart-color)" fillOpacity={.1} isAnimationActive={false} />
                  <Area dataKey="contributed" name="Your contributions" stroke="var(--app-secondary)" strokeDasharray="4 4" fillOpacity={0} isAnimationActive={false} />
                </AreaChart></ResponsiveContainer>
              </div>
              <p className="terminal-note">Month number · EUR. Solid: projected balance. Dashed: savings plus deposits.</p>
              <button type="button" className="terminal-button mt-3" onClick={() => downloadCsv('goal-projection.csv', [
                ['Month', 'Projected balance (EUR)', 'Contributed (EUR)'],
                ...projection.projection.map(row => [row.month, row.balance, row.contributed]),
              ])}>Export projection</button>
            </details>
          </div>
        )}
        <button className="terminal-button primary w-full" disabled={!ready || !valid || !!error}>
          {editing ? 'Update goal' : 'Save goal'}
        </button>
        {editing && (
          <button
            type="button"
            className="terminal-button w-full"
            onClick={() => {
              setEditing(null);
              setName('');
            }}
          >
            Cancel edit
          </button>
        )}
        <details className="terminal-note">
          <summary>Calculation assumptions</summary>
          <p className="mt-2">
            Monthly contributions occur at month-end. Returns compound at the monthly equivalent of
            the annual assumption. The target grows with inflation. Returns are hypothetical and
            exclude fees and taxes.
          </p>
        </details>
      </form>
    </section>
  );
}
