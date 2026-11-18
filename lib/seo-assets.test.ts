import { describe, expect, it } from 'vitest';

import { parseAssetSnapshot } from './asset-snapshot';
import { assetPageUrl, findSeoAsset, seoAssets, serializeJsonLd } from './seo-assets';

const stamp = Date.parse('2026-01-02T16:00:00Z') / 1000;
const payload = (meta: Record<string, unknown>) => ({chart: {result: [{meta,
  timestamp: [stamp - 86400, stamp], indicators: {quote: [{close: [100, 110]}]},
}]}});
describe('public asset pages', () => {
  it('uses unique known slugs rather than unrestricted ticker URLs', () => {
    expect(new Set(seoAssets.map(asset => asset.slug)).size).toBe(seoAssets.length);
    expect(assetPageUrl('EURUSD=X')).toBe('/dashboard/eur-usd');
    expect(assetPageUrl('UNKNOWN')).toBeNull();
    expect(findSeoAsset('constructor')).toBeUndefined();
  });
  it('escapes script delimiters in JSON-LD without changing the underlying content', () => {
    const value = {name: '</script><script>alert(1)</script>'};
    const encoded = serializeJsonLd(value);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded)).toEqual(value);
  });
  it('uses daily history, never the start-of-year chart comparison, for daily changes', () => {
    const snapshot = parseAssetSnapshot(payload({regularMarketPrice: 110, regularMarketTime: stamp, chartPreviousClose: 50}), '2026-01-02T17:00:00Z');
    expect(snapshot.changePercent).toBeCloseTo(10);
    expect(snapshot.week52High).toBeNull();
    expect(snapshot.week52Low).toBeNull();
  });
  it('does not fabricate a daily comparison when observations do not align', () => {
    expect(parseAssetSnapshot(payload({regularMarketPrice: 110, regularMarketTime: stamp + 86400}), '').changePercent).toBeNull();
    expect(parseAssetSnapshot(payload({regularMarketPrice: 110, previousClose: 0}), '').changePercent).toBeNull();
  });
  it('preserves provider-supplied 52-week bounds, currency and observation time', () => {
    const snapshot = parseAssetSnapshot(payload({regularMarketPrice: 110, regularMarketTime: stamp,
      previousClose: 100, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 70, currency: 'USD'}), '2026-01-02T17:00:00Z');
    expect(snapshot).toMatchObject({price: 110, observedAt: stamp, currency: 'USD', week52High: 120, week52Low: 70});
    expect(snapshot.points).toHaveLength(2);
    expect(() => parseAssetSnapshot({}, '')).toThrow('Missing asset data');
  });
});
