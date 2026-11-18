export function localCalendarKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function parseCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00');
  return Number.isFinite(date.getTime()) && localCalendarKey(date) === value ? date : null;
}

export function calendarEmptyMessage(loading: boolean, notice: string, covered: boolean, entries: number) {
  if (loading) return {title: 'Loading calendar', description: 'Checking reported events…'};
  if (entries > 0) return {title: 'No matching events', description: 'Clear filters to show the reported events for this date.'};
  if (notice && !covered) return {title: 'Calendar unavailable', description: 'This date has no saved events. Retry the calendar feed.'};
  if (!covered) return {title: 'Date outside feed coverage', description: 'The provider has not supplied a calendar for this date.'};
  return {title: 'No events reported', description: notice ? 'No events in the saved snapshot for this date.' : 'The provider returned no events for this date.'};
}
