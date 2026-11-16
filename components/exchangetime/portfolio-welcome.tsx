'use client';

import { ArrowRight, FileClock, WalletCards } from 'lucide-react';

import PersonalBackup from './personal-backup';
import { ToolEmptyState, ToolSurface } from './tool-ui';

export default function PortfolioWelcome({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="portfolio-start" aria-label="Set up your portfolio">
      <ToolSurface>
        <ToolEmptyState
          icon={<WalletCards size={30} strokeWidth={1.4} />}
          title="Your portfolio starts here."
          description="Record a trade from your broker’s confirmation. Track what you own, how it performs and where your risk sits."
          action={
            <button type="button" className="terminal-button primary" onClick={onAdd}>
              Add your first transaction <ArrowRight size={15} aria-hidden />
            </button>
          }
        />
        <p className="portfolio-storage-note">
          Your records stay on this device. No account required.
        </p>
      </ToolSurface>
      <aside>
        <FileClock size={20} strokeWidth={1.5} aria-hidden />
        <h3>Returning to your portfolio?</h3>
        <p>
          Records are saved in this browser, not in an account. If you changed devices, you can
          preview a backup before restoring it.
        </p>
        <details>
          <summary>Backup and restore</summary>
          <PersonalBackup />
        </details>
      </aside>
    </section>
  );
}
