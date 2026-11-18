import { expect, it } from 'vitest';
import { z } from 'zod';

import { writeRecords } from './record-storage';

const schema = z.array(z.object({ value: z.number().finite().nonnegative() }));
function store(raw: string | null) {
  return { getItem: () => raw, setItem: (_key: string, next: string) => { raw = next; } };
}
it('does not overwrite records changed after loading', () => {
  const storage = store('[{"value":2}]');
  expect(() => writeRecords(storage, 'records', '[]', [], schema)).toThrow('another tab');
  expect(storage.getItem()).toBe('[{"value":2}]');
});
it('rejects invalid values without touching existing data', () => {
  const storage = store('[]');
  expect(() => writeRecords(storage, 'records', '[]', [{value: NaN}], schema)).toThrow('invalid');
  expect(storage.getItem()).toBe('[]');
});
it('writes validated records and returns the next comparison snapshot', () => {
  const storage = store(null);
  const raw = writeRecords(storage, 'records', null, [{value: 3}], schema);
  expect(raw).toBe('[{"value":3}]');
  expect(storage.getItem()).toBe(raw);
});
