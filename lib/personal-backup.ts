import { z } from 'zod';

import { balanceSchema, historySchema, goalSchema, tradeSchema } from './record-schemas';

const amount = z.number().finite().nonnegative();
const currencies = z.enum(['EUR', 'GBP', 'USD']);
const budgetRows = z.array(z.object({ id: z.string(), name: z.string(), amount }));
const groups = {
  portfolioTransactions: ['Transactions', z.array(z.object({
    id: z.string(), symbol: z.string().min(1), shares: amount.positive(), date: z.string(),
    side: z.enum(['BUY', 'SELL']), price: amount, fees: amount, taxes: amount, currency: z.string().regex(/^[A-Z]{3}$/),
  }))],
  portfolioBaseCurrency: ['Portfolio currency', z.string().regex(/^[A-Z]{3}$/)],
  portfolioDividendWithholdingPct: ['Dividend withholding', z.string().regex(/^\d+(\.\d+)?$/).refine(value => Number(value) <= 100)],
  et_watchlists: ['Watchlists', z.array(z.object({id: z.string(), title: z.string(), items: z.array(z.object({ticker: z.string()}))}))],
  'exchangetime.personal-budget.v6': ['Budget', z.object({
    currency: currencies, fixedCosts: budgetRows, incomeSources: budgetRows, incomeBasis: z.enum(['monthly','annual']),
    fixedCostTotal: amount.optional(), fixedCostMode: z.enum(['total','breakdown']).optional(), reserveCash: amount,
    variableCosts: amount.optional(), reserveTargetMonths: amount, targetInvestmentPct: amount.max(100),
  })],
  'et.networth.v1': ['Assets and debts', balanceSchema],
  'et.networth.history.v1': ['Net worth history', historySchema],
  'et.goals.v1': ['Financial goals', goalSchema],
  'et.journal.v1': ['Trade journal', tradeSchema],
} as const;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const envelope = z.object({ format: z.literal('exchange-time/personal'), version: z.literal(1), records: z.record(z.string(), z.string()) });
export function readBackup(input: string) {
  const backup = envelope.parse(JSON.parse(input));
  const entries = Object.entries(backup.records).map(([key, raw]) => {
    if (!Object.prototype.hasOwnProperty.call(groups, key)) throw new Error('Unknown record type');
    const [label, schema] = groups[key as keyof typeof groups];
    const value = key === 'portfolioBaseCurrency' || key === 'portfolioDividendWithholdingPct' ? raw : JSON.parse(raw);
    schema.parse(value);
    return { key, raw, label, count: Array.isArray(value) ? value.length : 1 };
  });
  if (!entries.length) throw new Error('Empty backup');
  return entries;
}

export function exportBackup(storage: Store) {
  const records: Record<string, string> = {};
  for (const key of Object.keys(groups)) {
    const value = storage.getItem(key);
    if (value !== null) records[key] = value;
  }
  const content = JSON.stringify({ format: 'exchange-time/personal', version: 1, records });
  readBackup(content);
  return content;
}

export function restoreBackup(storage: Store, content: string) {
  const changes = readBackup(content).map(entry => ({ ...entry, previous: storage.getItem(entry.key) }));
  let written = 0;
  try {
    for (const { key, raw } of changes) {
      storage.setItem(key, raw);
      written++;
    }
  } catch (error) {
    for (const { key, previous } of changes.slice(0, written).reverse()) {
      if (previous === null) storage.removeItem(key);
      else storage.setItem(key, previous);
    }
    throw error;
  }
}
