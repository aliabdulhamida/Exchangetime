import { describe, expect, it } from 'vitest';

import {
  addSavedStrategyEntry,
  makeUniqueStrategyName,
  sanitizeSavedStrategies,
} from './persistence';

describe('options persistence helpers', () => {
  it('auto-suffixes duplicate strategy names', () => {
    const unique = makeUniqueStrategyName('My Strategy', ['Core', 'My Strategy', 'My Strategy (2)']);
    expect(unique).toBe('My Strategy (3)');
  });

  it('sanitizes malformed and duplicate saved entries', () => {
    const input = [
      { id: ' a ', name: ' Alpha ', timestamp: '2026-03-01T10:00:00.000Z', legs: [], settings: {} },
      { id: 'a', name: 'Alpha', timestamp: '2026-03-01T10:00:01.000Z', legs: [], settings: {} },
      { id: 'b', name: 'Beta', timestamp: 'invalid-date', legs: [], settings: {} },
      { id: 'c', name: 'Gamma', timestamp: '2026-03-01T10:00:02.000Z', legs: [], settings: {} },
      { bad: true },
    ];

    const sanitized = sanitizeSavedStrategies(input);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0].id).toBe('a');
    expect(sanitized[0].name).toBe('Alpha');
    expect(sanitized[1].id).toBe('c');
  });

  it('prepends newly saved entry for immediate list refresh', () => {
    const existing = [
      { id: 'old-1', name: 'Old 1', timestamp: '2026-03-01T09:00:00.000Z', legs: [], settings: {} },
      { id: 'old-2', name: 'Old 2', timestamp: '2026-03-01T08:00:00.000Z', legs: [], settings: {} },
    ];
    const added = { id: 'new-1', name: 'New', timestamp: '2026-03-01T10:00:00.000Z', legs: [], settings: {} };

    const next = addSavedStrategyEntry(existing, added);
    expect(next[0].id).toBe('new-1');
    expect(next).toHaveLength(3);
  });
});
