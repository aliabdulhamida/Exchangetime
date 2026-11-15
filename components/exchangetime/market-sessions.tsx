'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import marketHours from '@/lib/exchangeinfo.js';

import { workspaceUrl } from './product-model';

type Schedule = {
  open: string;
  close: string;
  timezone: string;
  holidays: Record<string, { closeEarly: boolean; earlyCloseTime?: string; reason: string }>;
};

export default function MarketSessions() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <section className="market-sessions" aria-label="Exchange sessions">
      {['NYSE', 'NASDAQ', 'XETRA', 'LSE'].map((name) => {
        const schedule = (marketHours as unknown as Record<string, Schedule>)[name];
        const parts = now
          ? new Intl.DateTimeFormat('en-US', {
              timeZone: schedule.timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            }).formatToParts(now)
          : [];
        const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
        const date = part('year') + '-' + part('month') + '-' + part('day');
        const holiday = schedule.holidays[date];
        const close = holiday?.closeEarly
          ? holiday.earlyCloseTime || schedule.close
          : schedule.close;
        const time = part('hour') + ':' + part('minute');
        const weekend = ['Sat', 'Sun'].includes(part('weekday'));
        const open =
          !!now &&
          !weekend &&
          (!holiday || holiday.closeEarly) &&
          time >= schedule.open &&
          time < close;
        const knownYear =
          now && Object.keys(schedule.holidays).some((date) => date.startsWith(part('year')));
        return (
          <Link
            key={name}
            href={workspaceUrl('ExchangeTimes')}
            className="market-session"
            title={
              (now ? time + ' local · ' : '') +
              (holiday ? holiday.reason : schedule.open + '–' + close)
            }
          >
            <span className={'session-dot ' + (open ? 'is-open' : '')} />
            <strong>{name}</strong>
            <span>{!now ? '…' : !knownYear ? 'Schedule only' : open ? 'Open' : 'Closed'}</span>
          </Link>
        );
      })}
    </section>
  );
}
