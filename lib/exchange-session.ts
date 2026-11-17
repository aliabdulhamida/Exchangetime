export type ExchangeSchedule = {
  timezone: string;
  open?: string;
  close?: string;
  open1?: string;
  close1?: string;
  open2?: string;
  close2?: string;
  holidays: Record<string, { closeEarly?: boolean; earlyCloseTime?: string; reason?: string }>;
  weekdays?: number[];
};

const formatters = new Map<string, Intl.DateTimeFormat>();
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export function exchangeSession(schedule: ExchangeSchedule, now: Date) {
  let formatter = formatters.get(schedule.timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: schedule.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(schedule.timezone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const date = parts.year + '-' + parts.month + '-' + parts.day;
  const localTime = parts.hour + ':' + parts.minute;
  const sessions = [
    [schedule.open ?? schedule.open1, schedule.close ?? schedule.close1],
    [schedule.open2, schedule.close2],
  ].filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]));
  const label = sessions.map((pair) => pair.join('–')).join(' / ');
  const years = new Set(Object.keys(schedule.holidays).map((key) => key.slice(0, 4)));
  const start = Date.parse(date + 'T00:00:00Z');
  const weekday = schedule.weekdays ?? [1, 2, 3, 4, 5];
  let status = 'Closed';
  let progress = 0;
  let next = '';
  for (let offset = 0; offset < 32; offset++) {
    const day = new Date(start + offset * 86400000);
    const key = day.toISOString().slice(0, 10);
    if (!years.has(key.slice(0, 4))) {
      if (!offset) status = 'Schedule only';
      break;
    }
    const holiday = schedule.holidays[key];
    if (!weekday.includes(day.getUTCDay()) || (holiday && !holiday.closeEarly)) continue;
    for (const [open, regularClose] of sessions) {
      const close =
        holiday?.earlyCloseTime && holiday.earlyCloseTime < regularClose
          ? holiday.earlyCloseTime
          : regularClose;
      if (open >= close) continue;
      if (offset || localTime < open) {
        next = 'Opens ' + (offset ? key + ' · ' : '') + open;
        break;
      }
      if (localTime < close) {
        status = 'Open';
        next = 'Closes ' + close;
        progress = (minutes(localTime) - minutes(open)) / (minutes(close) - minutes(open));
        break;
      }
    }
    if (next) break;
  }
  return {
    date,
    localTime,
    status,
    next,
    progress,
    hours: label,
    holiday: schedule.holidays[date]?.reason,
  };
}
