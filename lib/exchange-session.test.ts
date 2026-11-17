import { expect, it } from 'vitest';

import { exchangeSession } from './exchange-session';
import marketHours from './exchangeinfo';

it('uses the local exchange date across UTC midnight', () => {
  const state = exchangeSession(marketHours.NYSE, new Date('2026-11-27T02:00:00Z'));
  expect(state.date).toBe('2026-11-26');
  expect(state.status).toBe('Closed');
  expect(state.next).toBe('Opens 2026-11-27 · 09:30');
});
it('ends the NYSE session exactly at the configured early close', () => {
  expect(exchangeSession(marketHours.NYSE, new Date('2026-11-27T17:59:59Z')).status).toBe('Open');
  expect(exchangeSession(marketHours.NYSE, new Date('2026-11-27T18:00:00Z')).next).toBe(
    'Opens 2026-11-30 · 09:30',
  );
});
it('uses both Tokyo sessions and excludes the lunch break', () => {
  expect(exchangeSession(marketHours.JPX, new Date('2026-11-17T02:30:00Z')).next).toBe(
    'Opens 12:30',
  );
  expect(exchangeSession(marketHours.JPX, new Date('2026-11-17T06:29:00Z')).status).toBe('Open');
  expect(exchangeSession(marketHours.JPX, new Date('2026-11-17T06:30:00Z')).status).toBe('Closed');
});
it('does not claim an open session in a year without calendar coverage', () => {
  expect(exchangeSession(marketHours.NYSE, new Date('2040-11-16T15:00:00Z')).status).toBe(
    'Schedule only',
  );
});
