'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { exchangeSession, type ExchangeSchedule } from '@/lib/exchange-session';
import marketHours from '@/lib/exchangeinfo.js';

import { workspaceUrl } from './product-model';

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
        const schedule = (marketHours as Record<string, ExchangeSchedule>)[name];
        const session = now && exchangeSession(schedule, now);
        return (
          <Link
            key={name}
            href={workspaceUrl('ExchangeTimes')}
            className="market-session"
            title={session ? [session.localTime + ' local', session.holiday, session.next].filter(Boolean).join(' · ') : undefined}
          >
            <span className={'session-dot ' + (session?.status === 'Open' ? 'is-open' : '')} />
            <strong>{name}</strong>
            <span>{session?.status ?? '…'}</span>
          </Link>
        );
      })}
    </section>
  );
}
