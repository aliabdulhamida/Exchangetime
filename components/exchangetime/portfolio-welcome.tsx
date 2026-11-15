'use client';

import { ArrowUpRight, Plus } from 'lucide-react';

export default function PortfolioWelcome({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="portfolio-welcome terminal-panel">
      <div className="portfolio-welcome-intro">
        <span className="portfolio-private-label">
          <span className="session-dot" />
          Private to this browser
        </span>
        <h2>
          Your investments.
          <br />
          One clear perspective.
        </h2>
        <p>
          Bring your holdings together to understand your returns, exposure, and the decisions
          behind them.
        </p>
        <button className="terminal-button primary" onClick={onAdd}>
          <Plus size={15} />
          Add your first transaction
          <ArrowUpRight size={14} />
        </button>
        <small>Start with a stock or ETF you own. No bank connection required.</small>
      </div>
      <div className="portfolio-welcome-steps">
        {[
          ['01', 'Make it yours', 'Record purchases and sales, including dates, fees, and taxes.'],
          [
            '02',
            'See the full picture',
            'Explore holdings, dividend income, and allocation in one workspace.',
          ],
          [
            '03',
            'Put returns in context',
            'Compare flow-adjusted performance with a chosen benchmark and inspect portfolio risk.',
          ],
        ].map(([number, title, description]) => (
          <div key={number}>
            <span>{number}</span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="portfolio-welcome-note">
        Your records stay on this device. Clearing browser data removes them. Market-derived
        analytics become available after you add transactions.
      </div>
    </section>
  );
}
