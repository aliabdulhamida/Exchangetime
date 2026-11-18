import { expect, it } from 'vitest';

import { projectGoal } from './financial-goals';

const base = {target: 12000, saved: 0, years: 1, rate: 0, inflation: 0};
it('solves monthly deposits at zero return', () => {
  const result = projectGoal(base)!;
  expect(result.contribution).toBe(1000);
  expect(result.projection.at(-1)?.balance).toBeCloseTo(12000);
});
it('accepts saved records with a name and identifier', () => {
  const savedGoal = {...base, id: 'goal-1', name: 'Emergency fund'};
  expect(projectGoal(savedGoal)?.contribution).toBe(1000);
});
it.each([4, -20, 0.000000001])('reconciles contributions with the final target at %s percent', rate => {
  const result = projectGoal({...base, saved: 2000, years: 5, rate, inflation: 2})!;
  expect(result.projection.at(-1)?.balance).toBeCloseTo(result.futureTarget, 5);
  expect(result.projection.at(-1)?.contributed).toBeCloseTo(2000 + result.months * result.contribution);
});
it('keeps projected growth distinct from money already saved', () => {
  const result = projectGoal({...base, saved: 6000, rate: 10})!;
  expect(result.progress).toBe(50);
  expect(result.withoutGrowth).toBe(500);
  expect(result.contribution).toBeLessThan(500);
});
it('does not suggest negative contributions when sufficiently funded', () => {
  const result = projectGoal({...base, saved: 15000})!;
  expect(result.contribution).toBe(0);
  expect(result.remaining).toBe(0);
  expect(result.progress).toBe(100);
});
it('supports a final partial year and rejects invalid assumptions', () => {
  expect(projectGoal({...base, years: 1.5})?.projection.at(-1)?.month).toBe(18);
  expect(projectGoal({...base, rate: -100})).toBeNull();
  expect(projectGoal({...base, target: NaN})).toBeNull();
});
