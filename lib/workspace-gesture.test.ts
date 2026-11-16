import { expect, it } from 'vitest';

import { workspaceSwipe } from './workspace-gesture';

it('switches only on a deliberate horizontal swipe', () => {
  expect(workspaceSwipe({ x: 150, y: 100 }, { x: 60, y: 105 })).toBe(1);
  expect(workspaceSwipe({ x: 50, y: 100 }, { x: 140, y: 105 })).toBe(-1);
  expect(workspaceSwipe({ x: 50, y: 100 }, { x: 55, y: 102 })).toBe(0);
  expect(workspaceSwipe({ x: 50, y: 100 }, { x: 120, y: 230 })).toBe(0);
});
