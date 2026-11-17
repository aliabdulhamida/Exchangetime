'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import PersonalBackup from './personal-backup';
import { workspaces } from './product-model';

export default function Preferences() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [density, setDensity] = useState('comfortable');
  const [landing, setLanding] = useState('MarketOverview');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('et-settings', handler);
    try {
      const savedDensity =
        localStorage.getItem('et-density') === 'compact' ? 'compact' : 'comfortable';
      setDensity(savedDensity);
      document.documentElement.dataset.density = savedDensity;
      setLanding(localStorage.getItem('et-landing') || 'MarketOverview');
    } catch {}
    return () => window.removeEventListener('et-settings', handler);
  }, []);
  function save() {
    try {
      localStorage.setItem('et-density', density);
      localStorage.setItem('et-landing', landing);
      document.documentElement.dataset.density = density;
      setNotice('Preferences saved on this device.');
    } catch {
      setNotice('This browser could not save preferences.');
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="preferences-panel max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workspace preferences</DialogTitle>
          <DialogDescription className="sr-only">Display and navigation preferences for this device.</DialogDescription>
        </DialogHeader>
        <fieldset className="preference-options">
          <legend>Appearance</legend>
          <div className="preference-segmented">
            {['system', 'light', 'dark'].map((option) => (
              <button key={option} type="button" aria-pressed={(theme || 'system') === option} onClick={() => setTheme(option)}>
                {option === 'system' ? 'Automatic' : option === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="preference-options">
          <legend>Display density</legend>
          <div className="preference-segmented">
            {['comfortable', 'compact'].map((option) => (
              <button key={option} type="button" aria-pressed={density === option} onClick={() => setDensity(option)}>
                {option === 'compact' ? 'Compact' : 'Comfortable'}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="terminal-label">
          Default workspace
          <select
            className="et-tool-select"
            value={landing}
            onChange={(event) => setLanding(event.target.value)}
          >
            {workspaces.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Portfolio records, watchlists, journal entries, and plans are stored in this browser.
          Clearing browser data removes them.
        </p>
        <button className="terminal-button primary" onClick={save}>
          Save preferences
        </button>
        <p role="status" className="text-xs text-muted-foreground">
          {notice}
        </p>
        <details className="preferences-backup">
          <summary>Personal data & backup</summary>
          <PersonalBackup />
        </details>
      </DialogContent>
    </Dialog>
  );
}
