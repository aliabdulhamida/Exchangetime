import { describe, expect, it } from 'vitest';

import { editNumberEntry, normalizeNumberEntry, validateNumberEntry } from './number-entry';

describe('number entry', () => {
  it('distinguishes formatted grouping from a decimal comma', () => {
    expect(normalizeNumberEntry('1,000.50', true)).toBe('1000.50');
    expect(normalizeNumberEntry('2,50')).toBe('2.50');
    expect(normalizeNumberEntry('1000')).toBe('1000');
  });
  it('replaces existing values on first digit and preserves decimals', () => {
    expect(editNumberEntry('1000', '2', true)).toBe('2');
    expect(editNumberEntry('2', '.')).toBe('2.');
    expect(editNumberEntry('2.', '.')).toBe('2.');
    expect(editNumberEntry('', '.')).toBe('0.');
  });
  it('supports correction, clearing and negative values', () => {
    expect(editNumberEntry('12', 'delete')).toBe('1');
    expect(editNumberEntry('12', 'clear')).toBe('');
    expect(editNumberEntry('12', 'sign')).toBe('-12');
    expect(editNumberEntry('-12', 'sign')).toBe('12');
  });
  it.each(['-', '.', 'Infinity', '1e2', '1.2.3'])('rejects invalid draft %s', (value) => {
    expect(validateNumberEntry(value)).not.toBeNull();
  });
  it('checks bounds and required values without rejecting zero or comma decimals', () => {
    expect(validateNumberEntry('', '', '', true)).not.toBeNull();
    expect(validateNumberEntry('')).toBeNull();
    expect(validateNumberEntry('0', '0', '100')).toBeNull();
    expect(validateNumberEntry('2,5', '0', '100')).toBeNull();
    expect(validateNumberEntry('-1', '0')).not.toBeNull();
    expect(validateNumberEntry('101', '0', '100')).not.toBeNull();
  });
});
