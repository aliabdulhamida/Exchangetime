import { z } from 'zod';

export const balanceSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(['asset', 'liability']),
    category: z.string(),
    value: z.number().finite().nonnegative(),
  }),
);
export const historySchema = z.array(
  z.object({
    date: z.string(),
    assets: z.number().finite(),
    liabilities: z.number().finite(),
    net: z.number().finite(),
  }),
);
export const goalSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    target: z.number().positive(),
    saved: z.number().nonnegative(),
    years: z.number().positive(),
    rate: z.number().min(-99).max(50),
    inflation: z.number().min(0).max(30),
  }),
);

export const tradeSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string(),
    date: z.string(),
    side: z.enum(['long', 'short']),
    entry: z.number().positive(),
    exit: z.number().nonnegative(),
    quantity: z.number().positive(),
    fees: z.number().nonnegative(),
    currency: z.enum(['EUR', 'USD', 'GBP']),
    setup: z.string(),
    notes: z.string(),
  }),
);
