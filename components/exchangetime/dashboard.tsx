"use client";
import Content from "./content";
import Layout from "./layout";
import Sidebar from "./sidebar";
import { useState } from "react";


const MODULES = [
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

  return (
    <Layout
      sidebar={<Sidebar visibleModules={visibleModules} showModule={showModule} hideModule={hideModule} />}
    >
      <Content visibleModules={visibleModules} hideModule={hideModule} />
    </Layout>
  );
}
