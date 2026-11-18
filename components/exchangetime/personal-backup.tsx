'use client';

import { useRef, useState } from 'react';

import { exportBackup, exportRecoveryCopy, readBackup, restoreBackup } from '@/lib/personal-backup';

export default function PersonalBackup() {
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<{ content: string; entries: ReturnType<typeof readBackup>; baseline: Record<string, string | null> } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const sequence = useRef(0);
  function download(recovery = false) {
    try {
      const content = recovery ? exportRecoveryCopy(localStorage) : exportBackup(localStorage);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exchange-time-' + (recovery ? 'recovery-' : 'personal-') + new Date().toISOString().slice(0, 10) + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(recovery ? 'Recovery copy ready. It preserves raw data and is not directly restorable. Keep it private.' : 'Backup ready to download.');
    } catch {
      setNotice(recovery ? 'Recovery copy unavailable. Browser storage may be blocked or empty.' : 'A standard backup could not be created. Use a recovery copy to preserve unreadable records.');
    }
  }
  async function inspect(file: File) {
    const attempt = ++sequence.current;
    setPreview(null);
    setSelected([]);
    setConfirmed(false);
    setNotice('');
    setReading(true);
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('Size limit');
      const content = await file.text();
      if (attempt !== sequence.current) return;
      const entries = readBackup(content);
      const baseline = Object.fromEntries(entries.map(entry => [entry.key, localStorage.getItem(entry.key)]));
      setPreview({ content, entries, baseline });
    } catch {
      if (attempt === sequence.current) setNotice('Choose a valid Exchange Time personal backup (up to 16 MB). Recovery copies require manual repair. Nothing was changed.');
    } finally {
      if (attempt === sequence.current) setReading(false);
    }
  }
  return <section className="space-y-3 border-t pt-4" aria-label="Personal data backup">
    <h3 className="text-sm font-semibold">Personal data backup</h3>
    <p className="text-xs text-muted-foreground">Save transactions, watchlists, screens, budget, net worth, goals and journal entries. The file is not encrypted. Quotes and display preferences are not included.</p>
    <div className="backup-download-actions"><button type="button" className="terminal-button" onClick={() => download()}>Download backup</button>
      <button type="button" className="terminal-button" onClick={() => download(true)}>Download recovery copy</button></div>
    <details className="terminal-note"><summary>When to use a recovery copy</summary><p>Preserves the original stored values, including unreadable entries. It is not an importable backup and needs manual repair. Neither file is encrypted. Unrelated browser data is excluded.</p></details>
    <label className="block text-sm">Preview a backup
      <input type="file" accept=".json,application/json" disabled={reading} className="mt-1 block w-full text-xs" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void inspect(file);
      }} />
    </label>
    {preview && <div className="backup-restore-preview">
      <h4>Choose data to restore</h4>
      <p>Selected groups replace existing data; they are not merged. Other groups stay unchanged.</p>
      <fieldset><legend className="sr-only">Data groups in this backup</legend>{preview.entries.map(entry =>
        <label key={entry.key}><input type="checkbox" checked={selected.includes(entry.key)} onChange={event => {
          setSelected(current => event.target.checked ? [...current, entry.key] : current.filter(key => key !== entry.key));
          setConfirmed(false);
        }} /><span>{entry.label}<small>{preview.baseline[entry.key] === null ? 'New on this device' : 'Replaces saved data'}</small></span>
          <strong>{entry.count}</strong></label>)}</fieldset>
      <label className="backup-replace-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
        I understand that the selected data will be replaced.</label>
      <button type="button" className="terminal-button" onClick={() => {sequence.current++; setPreview(null);}}>Cancel</button>{' '}
      <button type="button" className="terminal-button primary" disabled={!selected.length || !confirmed} onClick={() => {
        try { restoreBackup(localStorage, preview.content, selected, preview.baseline); window.location.reload(); }
        catch (error) { setConfirmed(false); setNotice(error instanceof Error ? error.message : 'Restore failed. Saved data could not be replaced.'); }
      }}>Replace and reload</button>
    </div>}
    <p role="status" className="text-xs text-muted-foreground">{reading ? 'Checking backup…' : notice}</p>
  </section>;
}
