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
import { X } from "lucide-react";

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
        {visibleModules.includes("BacktestTool") && (
          <ModuleWrapper onClose={() => hideModule("BacktestTool")}> <BacktestTool /> </ModuleWrapper>
        )}
        {visibleModules.includes("PortfolioTracker") && (
          <ModuleWrapper onClose={() => hideModule("PortfolioTracker")}> <PortfolioTracker /> </ModuleWrapper>
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
    </div>
  );
}
