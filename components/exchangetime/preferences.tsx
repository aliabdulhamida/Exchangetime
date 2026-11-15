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
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workspace preferences</DialogTitle>
          <DialogDescription>Display and navigation preferences for this device.</DialogDescription>
        </DialogHeader>
        <label className="terminal-label">
          Appearance
          <select
            className="et-tool-select"
            value={theme || 'light'}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Automatic</option>
          </select>
        </label>
        <label className="terminal-label">
          Display density
          <select
            className="et-tool-select"
            value={density}
            onChange={(event) => setDensity(event.target.value)}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
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
        <PersonalBackup />
      </DialogContent>
    </Dialog>
  );
}
