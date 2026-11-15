import { describe, expect, it } from 'vitest';
import { rankWorkspaceCommand } from './workspace-search';

describe('workspace command ranking', () => {
  it('prioritizes named tools over ticker actions', () => {
    expect(rankWorkspaceCommand('Position sizing', 'position')).toBeGreaterThan(
      rankWorkspaceCommand('Research POSITION', 'position'),
    );
  });
  it('matches descriptive keywords without hiding direct matches', () => {
    expect(
      rankWorkspaceCommand('Global macro', 'inflation', ['Growth, inflation, and rates']),
    ).toBe(0.5);
    expect(rankWorkspaceCommand('Inflation', 'inflation')).toBe(1);
  });
  it('does not match unrelated scattered letters', () => {
    expect(
      rankWorkspaceCommand('Tax calculator', 'position', ['Estimate income tax assumptions']),
    ).toBe(0);
  });
  it('accepts multiword queries across labels and keywords', () => {
    expect(
      rankWorkspaceCommand('Market screener', 'saved screens', ['Filter and save screens']),
    ).toBe(0);
    expect(
      rankWorkspaceCommand('Market screener', 'market volume', ['Price and volume moves']),
    ).toBe(0.5);
  });
});
