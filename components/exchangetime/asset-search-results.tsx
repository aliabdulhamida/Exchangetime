'use client';

import { useEffect, useState } from 'react';

import { CommandGroup, CommandItem } from '@/components/ui/command';
import { assetKinds, type AssetMatch } from '@/lib/asset-directory';

import { researchUrl } from './product-model';

type Result = { query: string; matches: AssetMatch[]; fetchedAt: string } | { query: string; failed: true };

export default function AssetSearchResults({ query, visit }: { query: string; visit: (url: string) => void }) {
  const term = query.trim();
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (term.length < 2 || term.length > 64) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/asset-search?q=' + encodeURIComponent(term), { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ query: term, matches: data.matches, fetchedAt: data.fetchedAt });
      } catch {
        if (!controller.signal.aborted) setResult({ query: term, failed: true });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, attempt]);
  const current = result?.query === term ? result : null;
  const status = term.length < 2 ? 'Enter at least two characters.'
    : term.length > 64 ? 'Use a shorter instrument name or ticker.'
    : !current ? 'Looking up instruments…' : 'failed' in current ? 'Instrument lookup is unavailable.'
    : !current.matches.length ? 'No supported instruments found. Try another name or ticker.'
    : current.matches.length + ' matches · Retrieved ' + new Date(current.fetchedAt).toLocaleTimeString();
  return <>
    <p className="asset-search-status" role="status">{status}</p>
    {current && 'failed' in current && <CommandItem value="retry" onSelect={() => { setResult(null); setAttempt(value => value + 1); }}>Retry lookup</CommandItem>}
    {current && 'matches' in current && current.matches.length > 0 && <CommandGroup heading="Matching instruments">
      {current.matches.map(asset => <CommandItem key={asset.symbol} value={asset.symbol} onSelect={() => visit(researchUrl(asset.symbol, asset.kind !== 'EQUITY'))}>
        <span className="asset-search-match"><strong>{asset.symbol}</strong><span>{asset.name}</span><small>{assetKinds[asset.kind]}{asset.exchange && ' · ' + asset.exchange}</small></span>
      </CommandItem>)}
    </CommandGroup>}
  </>;
}
