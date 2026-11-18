'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useModelStorage(key: string) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const expected = useRef<string | null>(null);
  const blocked = useRef(true);
  const reject = useCallback(() => {
    blocked.current = true;
    setError('The saved model could not be read. It has not been overwritten.');
  }, []);
  const read = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      expected.current = raw;
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      }
      blocked.current = false;
      setError('');
      return raw;
    } catch {
      blocked.current = true;
      setError('The saved model could not be read. It has not been overwritten.');
      return null;
    }
  }, [key]);
  const save = useCallback((raw: string) => {
    if (blocked.current) return false;
    try {
      if (localStorage.getItem(key) !== expected.current) {
        blocked.current = true;
        setError('This model changed in another tab. Reload before saving further changes.');
        return false;
      }
      localStorage.setItem(key, raw);
      expected.current = raw;
      return true;
    } catch {
      blocked.current = true;
      setError('Model changes could not be saved. Keep this tab open to retain unsaved edits.');
      return false;
    }
  }, [key]);
  useEffect(() => {
    function changed(event: StorageEvent) {
      if (event.key === key || event.key === null) {
        blocked.current = true;
        setError('This model changed in another tab. Reload before saving further changes.');
      }
    }
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [key]);
  function download() {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) { setNotice('No saved model is available.'); return; }
      const url = URL.createObjectURL(new Blob([raw], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = key.replace(/[^a-z0-9.-]/gi, '-') + '-recovery.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Original saved model downloaded. This unencrypted recovery file may need manual repair.');
    } catch { setNotice('Browser storage is unavailable. No recovery file could be read.'); }
  }
  return {error, read, save, reject, download, notice};
}

export function ModelStorageNotice({storage}: {storage: ReturnType<typeof useModelStorage>}) {
  if (!storage.error) return null;
  return <section className="record-error" aria-label="Model storage warning">
    <p role="alert">{storage.error}</p>
    <div><button type="button" className="terminal-button" onClick={storage.download}>Download saved model</button>
      <button type="button" className="terminal-button" onClick={() => {
        if (window.confirm('Reload the saved model? Unsaved edits in this tab will be discarded.')) window.location.reload();
      }}>Reload model</button></div>
    {storage.notice && <p role="status">{storage.notice}</p>}
  </section>;
}
