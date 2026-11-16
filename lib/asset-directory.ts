export const assetKinds = {
  EQUITY: 'Stock',
  ETF: 'ETF',
  MUTUALFUND: 'Fund',
  INDEX: 'Index',
  CRYPTOCURRENCY: 'Crypto',
  CURRENCY: 'Currency',
  FUTURE: 'Future',
} as const;

export type AssetMatch = {
  symbol: string;
  name: string;
  kind: keyof typeof assetKinds;
  exchange: string | null;
};

export function isPriceSymbol(symbol: string) {
  return /^(?:[A-Z0-9][A-Z0-9._-]{0,14}|\^[A-Z0-9.-]{1,15}|[A-Z0-9]{1,8}=F|[A-Z]{3}(?:[A-Z]{3})?=X)$/.test(symbol);
}

export function parseAssetMatches(payload: unknown): AssetMatch[] {
  if (!payload || typeof payload !== 'object' || !('quotes' in payload) || !Array.isArray(payload.quotes)) {
    throw new Error('Missing instrument directory');
  }
  const matches: AssetMatch[] = [];
  const seen = new Set<string>();
  for (const entry of payload.quotes) {
    if (!entry || typeof entry !== 'object') continue;
    const { symbol, quoteType: kind } = entry;
    if (typeof symbol !== 'string' || !isPriceSymbol(symbol) || seen.has(symbol) ||
        typeof kind !== 'string' || !Object.hasOwn(assetKinds, kind)) continue;
    const name = [entry.longname, entry.shortname].find(value => typeof value === 'string' && value.trim());
    if (!name) continue;
    const exchange = [entry.exchDisp, entry.exchange].find(value => typeof value === 'string' && value.trim());
    matches.push({ symbol, name, kind: kind as AssetMatch['kind'], exchange: exchange ?? null });
    seen.add(symbol);
  }
  return matches;
}
