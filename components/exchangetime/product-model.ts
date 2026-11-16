export const sections = {
  Markets: {
    MarketOverview: 'Market overview',
    ExchangeTimes: 'Exchange hours',
    MarketScreener: 'Market screener',
    SectorAnalysis: 'Sector performance',
    AssetComparison: 'Asset comparison',
  },
  Portfolio: { PortfolioTracker: 'Portfolio dashboard' },
  Research: {
    StockAnalysis: 'Asset research',
    InsiderScanner: 'Insider buy/sell scanner',
    EconomicIndicators: 'Global macro',
    News: 'Market news',
  },
  Trading: {
    TechnicalAnalysis: 'Technical analysis',
    BacktestTool: 'Backtesting',
    OptionsPayoffLab: 'Options payoff lab',
    PositionSizing: 'Position sizing',
    TradeBreakEven: 'Trade break-even',
    TradeJournal: 'Trade journal',
  },
  'Personal Finance': {
    PersonalBudget: 'Budget',
    NetWorth: 'Net worth',
    FinancialGoals: 'Financial goals',
    LoanPlanner: 'Loan repayment',
    CompoundInterest: 'Compound interest',
    DCFCalculator: 'DCF valuation',
    TaxCalculator: 'Tax calculator',
    CurrencyConverter: 'Currency converter',
  },
  Calendar: {
    EconomicCalendar: 'Economic calendar',
    EarningsCalendar: 'Earnings calendar',
    DividendCalendar: 'Dividend calendar',
    HolidayCalendar: 'Market holidays',
  },
} as const;

export const workspaces = Object.entries(sections).flatMap(([section, entries]) =>
  Object.entries(entries).map(([key, label]) => ({ section, key, label })),
);
export const workspaceUrl = (key: string) => '/dashboard?view=' + encodeURIComponent(key);
export const researchUrl = (symbol: string, priceProfile = false) =>
  workspaceUrl('StockAnalysis') + '&symbol=' + encodeURIComponent(symbol) + (priceProfile ? '&profile=price' : '');

export const workspaceDescriptions: Record<string, string> = {
  MarketOverview: 'Global markets, sector rotation, and the sessions that matter.',
  AssetComparison: 'Compare two instruments over identical trading dates using observed closing prices.',
  TradeBreakEven: 'Find the exit price a long position needs to cover entry and exit costs.',
  LoanPlanner: 'Calculate a fixed-rate monthly payment and the effect of an extra payment every month.',
  ExchangeTimes: 'Exchange schedules, holidays, and local trading sessions.',
  SectorAnalysis: 'Compare US sector ETFs across daily, weekly, and monthly horizons.',
  MarketScreener: 'Screen reported market movers by volume, valuation, and the 200-day trend.',
  PortfolioTracker: 'Track holdings, cash flows, allocation, and performance.',
  StockAnalysis: 'Research a company or explore the price history of a fund, index, currency, or commodity.',
  InsiderScanner: 'Find reported insider purchases and sales by ticker, role, transaction date, and trade size.',
  EconomicIndicators: 'Compare growth, inflation, employment, and policy across economies.',
  News: 'Market headlines and research articles.',
  TechnicalAnalysis: 'Two chart panes, saved presets, indicators, drawings, and alerts.',
  BacktestTool: 'Model historical contributions, reinvested dividends, and investment returns.',
  OptionsPayoffLab: 'Build multi-leg strategies and explore price, time, and volatility.',
  PositionSizing: 'Translate a risk budget and stop price into position size.',
  TradeJournal: 'Record execution, realized results, and the reasoning behind each trade.',
  PersonalBudget: 'Organize recurring income, spending, investment contributions, and reserves.',
  NetWorth: 'Track assets, liabilities, and your balance sheet over time.',
  FinancialGoals: 'Plan contributions and measure progress toward your next milestone.',
  CompoundInterest: 'Project investment growth with contributions and inflation.',
  DCFCalculator: 'Value projected cash flows and test the assumptions behind intrinsic value.',
  TaxCalculator: 'Estimate the effect of taxes using explicit country and income assumptions.',
  CurrencyConverter: 'Convert cash amounts using sourced exchange rates.',
  EconomicCalendar: 'Track upcoming economic releases by region and impact.',
  EarningsCalendar: 'Plan around company reporting dates.',
  DividendCalendar: 'Review ex-dividend dates and expected distributions.',
  HolidayCalendar: 'Check exchange closures and shortened trading sessions.',
};

export const workflows = [
  { title: 'Understand a market move', steps: ['MarketOverview', 'SectorAnalysis', 'AssetComparison', 'StockAnalysis'] },
  { title: 'Review your investments', steps: ['PortfolioTracker', 'AssetComparison', 'NetWorth', 'FinancialGoals'] },
  { title: 'Research a business', steps: ['MarketScreener', 'StockAnalysis', 'EarningsCalendar', 'DCFCalculator'] },
  { title: 'Plan and review a trade', steps: ['TechnicalAnalysis', 'PositionSizing', 'TradeBreakEven', 'TradeJournal'] },
  { title: 'Plan monthly cash flow', steps: ['PersonalBudget', 'LoanPlanner', 'FinancialGoals', 'CompoundInterest'] },
  { title: 'Prepare for the week', steps: ['EconomicCalendar', 'EconomicIndicators', 'EarningsCalendar', 'MarketOverview'] },
];
