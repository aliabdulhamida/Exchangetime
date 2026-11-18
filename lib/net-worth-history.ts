export type BalanceSnapshot = { date: string; assets: number; liabilities: number; net: number };

export function summarizeBalanceHistory(records: BalanceSnapshot[]) {
  const sorted = [...records].sort((left, right) => left.date.localeCompare(right.date));
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  return {sorted, latest, previous,
    change: latest && previous ? latest.net - previous.net : null};
}
