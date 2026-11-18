import type { ZodType } from 'zod';

export function writeRecords<RecordType>(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  expected: string | null,
  next: RecordType[],
  schema: ZodType<RecordType[]>,
) {
  if (storage.getItem(key) !== expected)
    throw new Error('These records changed in another tab. Reload saved records before editing.');
  const result = schema.safeParse(next);
  if (!result.success) throw new Error('The changes contain invalid values and were not saved.');
  const raw = JSON.stringify(result.data);
  storage.setItem(key, raw);
  return raw;
}
