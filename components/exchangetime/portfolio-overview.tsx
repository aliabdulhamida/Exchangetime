import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PortfolioOverview({ currency, value, positions, transactions, priceNote, metrics, concentration, onAdd, children }: {
  currency: string;
  value: string;
  positions: number;
  transactions: number;
  priceNote: string;
  metrics: { label: string; value: string }[];
  concentration: string | null;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="portfolio-summary" aria-label="Portfolio overview">
      <header>
        <div>
          <p className="portfolio-kicker">Holdings value · {currency}</p>
          <h2>{value}</h2>
          <p className="terminal-note">{positions} open {positions === 1 ? 'position' : 'positions'} · {transactions} {transactions === 1 ? 'transaction' : 'transactions'}</p>
        </div>
        <button className="terminal-button primary" onClick={onAdd}><Plus size={15} /> Add transaction</button>
      </header>
      <p className="terminal-note mt-3" role="status">{priceNote}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {metrics.map(metric => <div key={metric.label}>
          <dt className="terminal-note">{metric.label}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</dd>
        </div>)}
      </dl>
      {concentration && <p className="terminal-note mt-3">{concentration}</p>}
      <details>
        <summary>Risk and benchmark comparison</summary>
        <div className="mt-4 space-y-3">{children}</div>
      </details>
    </section>
  );
}
