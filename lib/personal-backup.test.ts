import { describe, expect, it } from 'vitest';
import { exportBackup, readBackup, restoreBackup } from './personal-backup';

function storage(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}
const records = { portfolioBaseCurrency: 'EUR', 'et.goals.v1': '[]' };
describe('personal backup', () => {
  it('round trips supported groups without copying unrelated data', () => {
    const file = exportBackup(storage({ ...records, secret: 'private' }));
    expect(file).not.toContain('secret');
    expect(readBackup(file)).toHaveLength(2);
    const target = storage({ portfolioBaseCurrency: 'USD', unrelated: 'keep' });
    restoreBackup(target, file);
    expect(target.getItem('portfolioBaseCurrency')).toBe('EUR');
    expect(target.getItem('unrelated')).toBe('keep');
  });
  it.each(['unknown', 'et.goals.v1', 'constructor'])('rejects invalid %s before writing', key => {
    const backup = JSON.parse(exportBackup(storage(records)));
    backup.records[key] = '[{}]';
    const target = storage({});
    expect(() => restoreBackup(target, JSON.stringify(backup))).toThrow();
    expect(target.getItem('portfolioBaseCurrency')).toBeNull();
  });
  it('rolls back completed writes on quota failure', () => {
    const target = storage({ portfolioBaseCurrency: 'GBP' });
    const write = target.setItem;
    target.setItem = (key, value) => {
      if (key === 'et.goals.v1') throw new Error('quota');
      write(key, value);
    };
    expect(() => restoreBackup(target, exportBackup(storage(records)))).toThrow();
    expect(target.getItem('portfolioBaseCurrency')).toBe('GBP');
  });
});
