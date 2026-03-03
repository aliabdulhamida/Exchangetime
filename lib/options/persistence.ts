export interface SavedStrategyEntry<TLeg, TSettings> {
  id: string;
  name: string;
  timestamp: string;
  legs: TLeg[];
  settings: TSettings;
}

export function normalizeStrategyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function makeUniqueStrategyName(baseName: string, existingNames: string[]): string {
  const normalizedBase = normalizeStrategyName(baseName);
  if (!normalizedBase) return '';

  const lowerSet = new Set(existingNames.map((name) => normalizeStrategyName(name).toLowerCase()));
  if (!lowerSet.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  let suffix = 2;
  while (suffix < 10_000) {
    const candidate = `${normalizedBase} (${suffix})`;
    if (!lowerSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    suffix += 1;
  }

  return `${normalizedBase} (${Date.now()})`;
}

function isValidSavedEntryShape(value: unknown): value is SavedStrategyEntry<unknown, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.timestamp === 'string' &&
    Array.isArray(item.legs)
  );
}

export function sanitizeSavedStrategies<TLeg, TSettings>(
  raw: unknown,
): SavedStrategyEntry<TLeg, TSettings>[] {
  if (!Array.isArray(raw)) return [];

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const output: SavedStrategyEntry<TLeg, TSettings>[] = [];

  for (const entry of raw) {
    if (!isValidSavedEntryShape(entry)) continue;

    const id = entry.id.trim();
    const name = normalizeStrategyName(entry.name);
    if (!id || !name) continue;
    if (Number.isNaN(new Date(entry.timestamp).getTime())) continue;

    const nameKey = name.toLowerCase();
    if (seenIds.has(id) || seenNames.has(nameKey)) continue;

    seenIds.add(id);
    seenNames.add(nameKey);
    output.push({
      id,
      name,
      timestamp: entry.timestamp,
      legs: entry.legs as TLeg[],
      settings: (entry as { settings: TSettings }).settings,
    });
  }

  return output;
}

export function addSavedStrategyEntry<TLeg, TSettings>(
  existing: SavedStrategyEntry<TLeg, TSettings>[],
  entry: SavedStrategyEntry<TLeg, TSettings>,
  limit = 30,
): SavedStrategyEntry<TLeg, TSettings>[] {
  const safeLimit = Math.max(1, Math.floor(limit));
  return [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, safeLimit);
}
