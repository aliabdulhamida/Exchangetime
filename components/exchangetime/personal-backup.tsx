'use client';

import { useState } from 'react';

import { exportBackup, readBackup, restoreBackup } from '@/lib/personal-backup';

export default function PersonalBackup() {
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<{ content: string; entries: ReturnType<typeof readBackup> } | null>(null);
  function download() {
    try {
      const content = exportBackup(localStorage);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exchange-time-personal-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Backup ready to download.');
    } catch {
      setNotice('No readable backup available. Check that you have saved personal records.');
    }
  }
  async function inspect(file: File) {
    setPreview(null);
    setNotice('');
    setReading(true);
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('Size limit');
      const content = await file.text();
      setPreview({ content, entries: readBackup(content) });
    } catch {
      setNotice('Choose a valid Exchange Time personal backup (up to 16 MB). Nothing was changed.');
    } finally {
      setReading(false);
    }
  }
  return <section className="space-y-3 border-t pt-4" aria-label="Personal data backup">
    <h3 className="text-sm font-semibold">Personal data backup</h3>
    <p className="text-xs text-muted-foreground">Save transactions, watchlists, budget, net worth, goals and journal entries. The file is not encrypted. Quotes and display preferences are not included.</p>
    <button className="terminal-button" onClick={download}>Download backup</button>
    <label className="block text-sm">Preview a backup
      <input type="file" accept=".json,application/json" disabled={reading} className="mt-1 block w-full text-xs" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void inspect(file);
      }} />
    </label>
    {preview && <div className="space-y-2 text-sm">
      <p>These groups will replace their saved data on this device. Other groups stay unchanged.</p>
      <ul>{preview.entries.map(entry => <li className="flex justify-between" key={entry.key}><span>{entry.label}</span><span>{entry.count}</span></li>)}</ul>
      <button className="terminal-button" onClick={() => setPreview(null)}>Cancel</button>{' '}
      <button className="terminal-button primary" onClick={() => {
        try { restoreBackup(localStorage, preview.content); window.location.reload(); }
        catch { setNotice('Restore failed. Check available browser storage before trying again.'); }
      }}>Replace and reload</button>
    </div>}
    <p role="status" className="text-xs text-muted-foreground">{reading ? 'Checking backup…' : notice}</p>
  </section>;
}
