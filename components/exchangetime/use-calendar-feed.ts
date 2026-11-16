'use client';

import { useEffect, useState } from 'react';

function isCalendar(value: unknown) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([day, rows]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(rows) &&
      rows.every(row => row && typeof row.symbol === 'string'));
}

export function useCalendarFeed<Row>(endpoint: string) {
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [retrieved, setRetrieved] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const key = 'et.feed.v1:' + endpoint;
    if (!revision) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (isCalendar(saved?.data) && typeof saved.retrieved === 'string') {
          setData(saved.data); setRetrieved(saved.retrieved); setNotice('Checking saved snapshot…');
        }
      } catch {}
    }
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(endpoint + (revision ? '?refresh=1' : ''), { signal: controller.signal });
        if (!response.ok) throw new Error();
        const payload = await response.json();
        if (!isCalendar(payload)) throw new Error();
        if (controller.signal.aborted) return;
        const retrieved = response.headers.get('X-Data-Retrieved-At') || '';
        setData(payload); setRetrieved(retrieved);
        setNotice(response.headers.get('X-Provider-Stale') === '1' ? 'Latest refresh failed. Showing a saved snapshot.' : '');
        try { localStorage.setItem(key, JSON.stringify({ data: payload, retrieved })); } catch {}
      } catch {
        if (!controller.signal.aborted) setNotice('Source unavailable. Any displayed events are from a saved snapshot.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [endpoint, revision]);
  return { data, loading, notice, retrieved, refresh: () => setRevision(value => value + 1) };
}
