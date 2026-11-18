'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZodType } from 'zod';

import { writeRecords } from '../../lib/record-storage';

export function useLocalRecords<RecordType>(key: string, schema: ZodType<RecordType[]>) {
  const [records, setRecords] = useState<RecordType[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const snapshot = useRef<string | null>(null);
  const readable = useRef(false);
  const reload = useCallback(() => {
    readable.current = false;
    try {
      const raw = localStorage.getItem(key);
      const parsed = schema.safeParse(raw === null ? [] : JSON.parse(raw));
      if (!parsed.success) throw new Error('Invalid records');
      setRecords(parsed.data);
      snapshot.current = raw;
      readable.current = true;
      setError('');
    } catch {
      setError('Saved records could not be read. Nothing was overwritten. Recover a backup in Settings.');
    }
    setReady(true);
  }, [key, schema]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    function changed(event: StorageEvent) {
      if (event.key === key || event.key === null) {
        readable.current = false;
        setError('Saved records changed in another tab. Reload saved records before continuing.');
      }
    }
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [key, schema]);
  const save = useCallback(
    (next: RecordType[]) => {
      try {
        if (!readable.current) return false;
        snapshot.current = writeRecords(localStorage, key, snapshot.current, next, schema);
        setRecords(next);
        setError('');
        return true;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Changes could not be saved.');
        return false;
      }
    },
    [key, schema],
  );
  return { records, save, ready, error, reload };
}
