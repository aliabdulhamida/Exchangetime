import { expect, it } from 'vitest';

import { calendarEmptyMessage, localCalendarKey, parseCalendarDate } from './calendar-view';

it('parses local calendar dates without accepting normalized invalid days', () => {
  expect(localCalendarKey(parseCalendarDate('2026-11-18')!)).toBe('2026-11-18');
  expect(parseCalendarDate('2026-02-30')).toBeNull();
  expect(parseCalendarDate('bad')).toBeNull();
});
it('distinguishes empty filters, missing coverage, no events and failures', () => {
  expect(calendarEmptyMessage(false, '', true, 2).title).toBe('No matching events');
  expect(calendarEmptyMessage(false, '', true, 0).title).toBe('No events reported');
  expect(calendarEmptyMessage(false, '', false, 0).title).toBe('Date outside feed coverage');
  expect(calendarEmptyMessage(false, 'Unavailable', false, 0).title).toBe('Calendar unavailable');
});
