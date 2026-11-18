import { describe, expect, it } from 'vitest';

import { exportBackup, exportRecoveryCopy, readBackup, restoreBackup } from './personal-backup';

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
  it('preserves unreadable raw values in a separate recovery file, without unrelated keys', () => {
    const recovery = exportRecoveryCopy(storage({'et.goals.v1': '{broken', secret: 'private'}));
    expect(JSON.parse(recovery).records['et.goals.v1']).toBe('{broken');
    expect(JSON.parse(recovery).unreadable).toEqual(['et.goals.v1']);
    expect(recovery).not.toContain('secret');
    expect(() => readBackup(recovery)).toThrow();
  });
  it('restores only explicitly selected groups', () => {
    const target = storage({portfolioBaseCurrency: 'USD', 'et.goals.v1': '[]'});
    restoreBackup(target, exportBackup(storage(records)), ['et.goals.v1']);
    expect(target.getItem('portfolioBaseCurrency')).toBe('USD');
  });
  it('rejects changed preview baselines before writing any group', () => {
    const target = storage({portfolioBaseCurrency: 'USD', 'et.goals.v1': '[]'});
    expect(() => restoreBackup(target, exportBackup(storage(records)), ['portfolioBaseCurrency'],
      {portfolioBaseCurrency: 'GBP'})).toThrow('changed since');
    expect(target.getItem('portfolioBaseCurrency')).toBe('USD');
  });
  it('rejects empty or unknown restore selections', () => {
    for (const selection of [[], ['unknown']])
      expect(() => restoreBackup(storage({}), exportBackup(storage(records)), selection)).toThrow();
  });
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
