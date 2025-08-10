'use client';

import { useEffect, useState } from 'react';

type Props = { slug: string };

export default function ViewCounter({ slug }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // 1) aktuelle Views lesen
        const res = await fetch(`/api/views?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        const base = typeof data?.views === 'number' ? data.views : 0;
        if (!cancelled) setCount(base);

        // 2) Inkrement anstoßen (best effort)
        fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (!cancelled && d && typeof d.views === 'number') setCount(d.views);
          })
          .catch(() => {});
      } catch (e: any) {
        if (!cancelled) setError('—');
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) return <span aria-label="views">—</span>;
  if (count == null) return <span aria-label="views">…</span>;
  return <span aria-label="views">{count.toLocaleString()}</span>;
}
