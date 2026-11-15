'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ZodType } from 'zod';

export function useLocalRecords<RecordType>(key: string, schema: ZodType<RecordType[]>) {
  const [records, setRecords] = useState<RecordType[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) setRecords(parsed.data);
        else
          setError(
            'Saved records could not be read. Export or recover browser data before replacing them.',
          );
      }
    } catch {
      setError('Browser storage is unavailable or saved data could not be read.');
    }
    setReady(true);
  }, [key, schema]);
  const save = useCallback(
    (next: RecordType[]) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
        setRecords(next);
        setError('');
        return true;
      } catch {
        setError('Changes could not be saved. Browser storage may be full or disabled.');
        return false;
      }
    },
    [key],
  );
  return { records, save, ready, error };
}
