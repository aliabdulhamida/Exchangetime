import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import ExchangeTimes from "../stock-market/exchange-times";
import StockAnalysis from "../stock-market/stock-analysis";
import CurrencyConverter from "../stock-market/currency-converter";
import BacktestTool from "../stock-market/backtest-tool";
import PortfolioTracker from "../stock-market/portfolio-tracker";

import FearGreedIndex from "../stock-market/fear-greed-index";
import MarketSummary from "../stock-market/market-summary";
import InsiderTrades from "../stock-market/insider-trades";
import EarningsCalendar from "../stock-market/earnings-calendar";
import HolidayCalendar from "../stock-market/holiday-calendar";
import SankeyBudget from "../stock-market/sankey-budget";
import { X } from "lucide-react";
import React, { useState } from "react";

interface ContentProps {
  visibleModules: string[];
  hideModule: (module: string) => void;
}

function ModuleWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="relative rounded shadow p-2">
      <button
        onClick={onClose}
        className="absolute right-5 top-5 text-gray-400 hover:text-gray-700 dark:hover:text-white"
        aria-label="Schließen"
        style={{ zIndex: 10 }}
      >
        <X className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}

export default function Content({ visibleModules, hideModule }: ContentProps) {
  return (
    <div className="space-y-6">
      {/* Top Row - Exchange Times */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {visibleModules.includes("ExchangeTimes") && (
          <ModuleWrapper onClose={() => hideModule("ExchangeTimes")}> <ExchangeTimes /> </ModuleWrapper>
        )}
      </div>

      {/* Zweite Zeile: Stock Analysis und Insider Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleModules.includes("StockAnalysis") && (
          <ModuleWrapper onClose={() => hideModule("StockAnalysis")}> <StockAnalysis /> </ModuleWrapper>
        )}
        {visibleModules.includes("InsiderTrades") && (
          <ModuleWrapper onClose={() => hideModule("InsiderTrades")}> <InsiderTrades /> </ModuleWrapper>
        )}
      </div>


      {/* Third Row - Trading Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleModules.includes("PortfolioTracker") && (
          <ModuleWrapper onClose={() => hideModule("PortfolioTracker")}> <PortfolioTracker /> </ModuleWrapper>
        )}
        {visibleModules.includes("BacktestTool") && (
          <ModuleWrapper onClose={() => hideModule("BacktestTool")}> <BacktestTool /> </ModuleWrapper>
        )}
      </div>

      {/* Fourth Row - Market Data & Currency Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleModules.includes("MarketSummary") && (
          <ModuleWrapper onClose={() => hideModule("MarketSummary")}> <MarketSummary /> </ModuleWrapper>
        )}
        {visibleModules.includes("CurrencyConverter") && (
          <ModuleWrapper onClose={() => hideModule("CurrencyConverter")}> <CurrencyConverter /> </ModuleWrapper>
        )}
      </div>

      {/* Fifth Row - Calendar und Holiday Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleModules.includes("EarningsCalendar") && (
          <ModuleWrapper onClose={() => hideModule("EarningsCalendar")}> <EarningsCalendar /> </ModuleWrapper>
        )}
        {visibleModules.includes("HolidayCalendar") && (
          <ModuleWrapper onClose={() => hideModule("HolidayCalendar")}> <HolidayCalendar /> </ModuleWrapper>
        )}
      </div>

      {/* Sixth Row - Personal Budget Sankey Diagram mit Compound Interest Calculator */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Compound Interest Calculator Container */}
        {visibleModules.includes("CompoundInterest") && (
          <div className="flex-1 min-w-0 max-w-sm mx-auto md:mx-0 border border-gray-200 dark:border-[#23232a] rounded-xl mt-0 md:mt-2 flex flex-col h-full">
            <ModuleWrapper onClose={() => hideModule("CompoundInterest") }>
              <div className="p-4 flex flex-col h-full">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compound Interest</h2>
                <div className="flex-1 flex flex-col justify-between">
                  <CompoundInterestCalculator />
                </div>
              </div>
            </ModuleWrapper>
          </div>
        )}
        {/* Personal Budget Sankey Diagramm */}
        {visibleModules.includes("PersonalBudget") && (
          <div className="flex-1 min-w-0 max-w-5xl mx-auto flex flex-col h-full pt-0 pb-6 px-6 relative">
            <ModuleWrapper onClose={() => hideModule("PersonalBudget") }>
              <div className="flex-1 flex flex-col h-full">
                <SankeyBudget />
              </div>
            </ModuleWrapper>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Zinseszins-Rechner Komponente ---
function CompoundInterestCalculator() {
  const [start, setStart] = useState(1000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(10);
  const [interval, setInterval] = useState(1);
  const [monthly, setMonthly] = useState(0);

  // Formel für Endkapital mit monatlichen Einzahlungen (Zinseszins mit Raten):
  // FV = P*(1+r/n)^(n*t) + PMT*(((1+r/n)^(n*t)-1)/(r/n))
  // P = Startkapital, PMT = monatliche Einzahlung, r = Zinssatz, n = Zinsperioden/Jahr, t = Jahre
  const r = rate / 100;
  const n = interval;
  const t = years;
  const PMT = monthly * 12 / n; // monatliche Einzahlung auf Zinsperiode umgerechnet

  const result =
    start * Math.pow(1 + r / n, n * t) +
    (PMT > 0 && r > 0
      ? PMT * (Math.pow(1 + r / n, n * t) - 1) / (r / n)
      : PMT * n * t);

  // Chart data: calculate capital for each year
  const chartData = Array.from({ length: years + 1 }, (_, i) => {
    const base = start * Math.pow(1 + r / n, n * i);
    const pmtPart =
      PMT > 0 && r > 0
        ? PMT * (Math.pow(1 + r / n, n * i) - 1) / (r / n)
        : PMT * n * i;
    return { year: i, capital: base + pmtPart };
  });

  return (
    <>
      <form className="flex flex-col gap-4 p-2">
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Initial Capital
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={start}
            min={0}
            onChange={e => setStart(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Monthly Deposit
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={monthly}
            min={0}
            onChange={e => setMonthly(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Interest Rate (% p.a.)
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={rate}
            min={0}
            step={0.01}
            onChange={e => setRate(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Years
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={years}
            min={1}
            onChange={e => setYears(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Payout Interval
          <select
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={interval}
            onChange={e => setInterval(Number(e.target.value))}
          >
            <option value={12}>Monthly</option>
            <option value={4}>Quarterly</option>
            <option value={1}>Yearly</option>
          </select>
        </label>
        <div className="mt-4 text-base font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#23232a] rounded-md px-3 py-2">
          Final Capital: {result.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} €
        </div>
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#23232a] rounded-md px-3 py-2">
          Initial Capital: {start.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} €<br />
          Total Deposits: {(monthly * 12 * years).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} €<br />
          Return: {(result - start - (monthly * 12 * years)).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} €
        </div>
      </form>
      <div className="w-full h-80 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={v => v.toLocaleString()} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-4 py-2 shadow-lg text-xs min-w-[120px]">
                    {/* Jahreszahl entfernt, nur noch Capital anzeigen */}
                    <div>
                      <span className="text-gray-300">Capital:</span> {typeof payload[0]?.value === 'number' ? payload[0].value.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '-'} €
                    </div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="capital" stroke="#2563eb" fillOpacity={1} fill="url(#colorCapital)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
