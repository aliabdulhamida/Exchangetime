"use client";
import Content from "./content";
import Layout from "./layout";
import Sidebar from "./sidebar";
import { useState, useEffect } from "react";


const MODULES = [
  "TechnicalAnalysis",
  "ExchangeTimes",
  "StockAnalysis",
  "InsiderTrades",
  "BacktestTool",
  "PortfolioTracker",
  "CurrencyConverter",
  "FearGreedIndex",
  "MarketSummary",
  "EarningsCalendar",
  "HolidayCalendar",
  "CompoundInterest",
  "PersonalBudget",
];


export default function Dashboard() {
  // Alle Module beim ersten Laden sichtbar
  const [visibleModules, setVisibleModules] = useState<string[]>([...MODULES]);

  function showModule(module: string) {
    setVisibleModules((prev) => prev.includes(module) ? prev : [...prev, module]);
  }
  function hideModule(module: string) {
    setVisibleModules((prev) => prev.filter((m) => m !== module));
  }

  // Event-Listener für "Nur dieses Modul anzeigen"
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'ALL') {
        setVisibleModules([...MODULES]);
      } else if (customEvent.detail && MODULES.includes(customEvent.detail)) {
        setVisibleModules([customEvent.detail]);
      }
    };
    window.addEventListener('showOnlyModule', handler);
    return () => window.removeEventListener('showOnlyModule', handler);
  }, []);

  return (
    <Layout
      sidebar={<Sidebar visibleModules={visibleModules} showModule={showModule} hideModule={hideModule} />}
    >
      <Content visibleModules={visibleModules} hideModule={hideModule} />
    </Layout>
  );
}
