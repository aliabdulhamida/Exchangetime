import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { parseAssetSnapshot } from '../asset-snapshot';
import { findSeoAsset } from '../seo-assets';
import { buildYahooChartUrl } from './yahoo-finance';

const loadSnapshot = unstable_cache(async (slug: string) => {
  const asset = findSeoAsset(slug);
  if (!asset) throw new Error('Unsupported asset');
  const response = await fetch(buildYahooChartUrl(asset.symbol, new URLSearchParams({interval: '1d', range: '1y'})), {
    cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: {'User-Agent': 'Mozilla/5.0 (compatible; ExchangeTime/1.0)', Accept: 'application/json'},
  });
  if (!response.ok) throw new Error('Asset provider unavailable');
  return parseAssetSnapshot(await response.json(), new Date().toISOString());
}, ['public-asset-snapshot-v1'], {revalidate: 300, tags: ['public-assets']});

export const getSeoAssetSnapshot = cache(async (slug: string) => {
  try { return await loadSnapshot(slug); }
  catch { return null; }
});
