'use client';

import dynamic from 'next/dynamic';
import { Component, type ComponentType, type ReactNode } from 'react';

const loading = () => (
  <div role="status" className="workspace-loading space-y-4 py-6">
    <div className="h-8 w-48 animate-pulse rounded bg-muted" />
    <div className="h-64 animate-pulse rounded bg-muted/40" />
    <p className="text-xs text-muted-foreground">Loading workspace…</p>
  </div>
);
const tools: Record<string, ComponentType> = {
  MarketOverview: dynamic(() => import('./market-overview'), { loading, ssr: false }),
  CompoundInterest: dynamic(() => import('./compound-interest'), { loading, ssr: false }),
  AssetComparison: dynamic(() => import('./asset-comparison'), { loading, ssr: false }),
  LoanPlanner: dynamic(() => import('./input-planners').then(module => module.LoanPlanner), { loading, ssr: false }),
  TradeBreakEven: dynamic(() => import('./input-planners').then(module => module.TradeBreakEven), { loading, ssr: false }),
  PersonalBudget: dynamic(() => import('../personal-budget-calculator'), { loading, ssr: false }),
  TaxCalculator: dynamic(() => import('../tax-calculator'), { loading, ssr: false }),
  BacktestTool: dynamic(() => import('../stock-market/backtest-tool'), { loading, ssr: false }),
  CurrencyConverter: dynamic(() => import('../stock-market/currency-converter'), {
    loading,
    ssr: false,
  }),
  DCFCalculator: dynamic(() => import('../dcf-calculator'), { loading, ssr: false }),
  DividendCalendar: dynamic(() => import('../stock-market/dividend-calendar'), {
    loading,
    ssr: false,
  }),
  EarningsCalendar: dynamic(() => import('../stock-market/earnings-calendar'), {
    loading,
    ssr: false,
  }),
  ExchangeTimes: dynamic(() => import('../stock-market/exchange-times'), { loading, ssr: false }),
  HolidayCalendar: dynamic(() => import('../stock-market/holiday-calendar'), {
    loading,
    ssr: false,
  }),
  MarketScreener: dynamic(() => import('../stock-market/market-screener'), { loading, ssr: false }),
  PortfolioTracker: dynamic(() => import('../stock-market/portfolio-tracker'), {
    loading,
    ssr: false,
  }),
  OptionsPayoffLab: dynamic(() => import('../stock-market/sankey-budget'), { loading, ssr: false }),
  StockAnalysis: dynamic(() => import('../stock-market/stock-analysis'), { loading, ssr: false }),
  InsiderScanner: dynamic(() => import('./insider-scanner'), { loading, ssr: false }),
  EconomicIndicators: dynamic(() => import('../stock-market/economic-indicators'), {
    loading,
    ssr: false,
  }),
  EconomicCalendar: dynamic(() => import('../stock-market/TradingviewEc-Calendar.jsx'), {
    loading,
    ssr: false,
  }),
  TechnicalAnalysis: dynamic(() => import('../stock-market/TradingViewWidget'), {
    loading,
    ssr: false,
  }),
  NetWorth: dynamic(() => import('./finance-planner').then((module) => module.NetWorth), {
    loading,
    ssr: false,
  }),
  FinancialGoals: dynamic(
    () => import('./finance-planner').then((module) => module.FinancialGoals),
    { loading, ssr: false },
  ),
  PositionSizing: dynamic(
    () => import('./trading-workbench').then((module) => module.PositionSizing),
    { loading, ssr: false },
  ),
  TradeJournal: dynamic(() => import('./trading-workbench').then((module) => module.TradeJournal), {
    loading,
    ssr: false,
  }),
  SectorAnalysis: dynamic(() => import('./sector-performance'), { loading, ssr: false }),
  News: dynamic(() => import('../stock-market/TradingViewNews'), { loading, ssr: false }),
};

class ToolBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div role="alert" className="terminal-empty">
          <p>This workspace could not render.</p>
          <button className="terminal-button mt-4" onClick={() => this.setState({ error: false })}>
            Try again
          </button>
        </div>
      );
    return this.props.children;
  }
}
export default function Content({ workspace }: { workspace: string }) {
  const key = workspace;
  const Tool = tools[key];
  return (
    <ToolBoundary key={key}>
      <div
        className={
          'terminal-workspace ' +
          (['TechnicalAnalysis', 'News'].includes(key) ? 'h-[780px] min-h-[70vh]' : '')
        }
        data-workspace={key}
      >
        {Tool ? <Tool /> : <p className="terminal-empty">Choose a workspace from navigation.</p>}
      </div>
    </ToolBoundary>
  );
}
