'use client';
import { useState, useEffect } from 'react';

import Content from './content';
import Layout from './layout';
import Sidebar from './sidebar';

const MODULES = [
  'TechnicalAnalysis',
  'ExchangeTimes',
  'StockAnalysis',
  'InsiderTrades',
  'BacktestTool',
  'PortfolioTracker',
  'CurrencyConverter',
  'FearGreedIndex',
  'EarningsCalendar',
  'HolidayCalendar',
  'CompoundInterest',
  'PersonalBudget',
  'TaxCalculator',
  'EconomicCalendar', // EconomicCalendar immer als Standardmodul
];

export default function Dashboard() {
  // EconomicCalendar immer beim ersten Laden sichtbar
  const [visibleModules, setVisibleModules] = useState<string[]>([...MODULES]);

  function showModule(module: string) {
    setVisibleModules((prev) => (prev.includes(module) ? prev : [...prev, module]));
  }
  function hideModule(module: string) {
    // EconomicCalendar kann ausgeblendet werden, aber nicht dauerhaft entfernt werden
    if (module === 'EconomicCalendar') {
      setVisibleModules((prev) => prev.filter((m) => m !== module));
    } else {
      setVisibleModules((prev) => prev.filter((m) => m !== module));
    }
  }

  // Event-Listener für "Nur dieses Modul anzeigen"
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'ALL') {
        // EconomicCalendar immer mit anzeigen, wenn alle angezeigt werden
        setVisibleModules([...MODULES]);
      } else if (customEvent.detail && MODULES.includes(customEvent.detail)) {
        setVisibleModules([customEvent.detail]);
      }
    };
    window.addEventListener('showOnlyModule', handler);
    return () => window.removeEventListener('showOnlyModule', handler);
  }, []);

  // EconomicCalendar beim Reload immer wieder anzeigen, falls es ausgeblendet wurde
  useEffect(() => {
    if (!visibleModules.includes('EconomicCalendar')) {
      setVisibleModules((prev) => [...prev, 'EconomicCalendar']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout
      sidebar={
        <Sidebar visibleModules={visibleModules} showModule={showModule} hideModule={hideModule} />
      }
    >
      <Content visibleModules={visibleModules} hideModule={hideModule} />
    </Layout>
  );
}
