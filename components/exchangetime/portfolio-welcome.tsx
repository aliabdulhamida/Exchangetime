'use client';

import { ArrowRight, FileClock } from 'lucide-react';

import PersonalBackup from './personal-backup';

export default function PortfolioWelcome({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="portfolio-start" aria-label="Set up your portfolio">
      <div>
        <p className="portfolio-kicker">Transaction ledger · No entries</p>
        <h2>Record your first trade.</h2>
        <p className="portfolio-intro">Use the date, trade value and execution price from your broker’s confirmation. Exchange Time calculates the shares and tracks their value over time.</p>
        <button type="button" className="terminal-button primary" onClick={onAdd}>
          Add your first transaction <ArrowRight size={15} aria-hidden />
        </button>
      </div>
      <aside>
        <FileClock size={20} strokeWidth={1.5} aria-hidden />
        <h3>Returning to your portfolio?</h3>
        <p>Records are saved in this browser, not in an account. If you changed devices, you can preview a backup before restoring it.</p>
        <details><summary>Backup and restore</summary><PersonalBackup /></details>
      </aside>
    </section>
  );
}
