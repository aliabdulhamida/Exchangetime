'use client';
/* eslint-disable import/order */
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useTheme } from 'next-themes';
import { X } from 'lucide-react';
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import TaxCalculator from '../tax-calculator';
import BacktestTool from '../stock-market/backtest-tool';
import CurrencyConverter from '../stock-market/currency-converter';
import EarningsCalendar from '../stock-market/earnings-calendar';
import ExchangeTimes from '../stock-market/exchange-times';
import HolidayCalendar from '../stock-market/holiday-calendar';
import InsiderTrades from '../stock-market/insider-trades';
import PortfolioTracker from '../stock-market/portfolio-tracker';
import SankeyBudget from '../stock-market/sankey-budget';
import StockAnalysis from '../stock-market/stock-analysis';
import TradingviewEcCalendar from '../stock-market/TradingviewEc-Calendar.jsx';
import TradingViewWidget from '../stock-market/TradingViewWidget';

interface ContentProps {
  visibleModules?: string[];
  hideModule: (module: string) => void;
}

function ModuleWrapper({
  children,
  onClose,
  onSolo,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onSolo?: () => void;
}) {
  return (
    <div className="relative p-2">
      <div className="absolute right-5 top-5 flex gap-2" style={{ zIndex: 10 }}>
        {onSolo && (
          <button
            onClick={onSolo}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-400 rounded p-1 transition"
            aria-label="Show only this module"
            title="Show only this module"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
          aria-label="Close"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

// Standardmäßig sichtbare Module, wenn keine explizite Steuerung erfolgt
const DEFAULT_VISIBLE_MODULES = [
  'TechnicalAnalysis',
  'StockAnalysis',
  'ExchangeTimes',
  'BacktestTool',
  'PortfolioTracker',
  'CurrencyConverter',
  'CompoundInterest',
  'PersonalBudget',
  'TaxCalculator',
  'InsiderTrades',
  'EarningsCalendar',
  'HolidayCalendar',
  // ... weitere Standardmodule falls gewünscht
];

export default function Content(props: ContentProps) {
  const { visibleModules, hideModule } = props;
  // Wenn visibleModules nicht gesetzt oder leer ist, TechnicalAnalysis standardmäßig anzeigen
  const modules =
    !visibleModules || visibleModules.length === 0 ? DEFAULT_VISIBLE_MODULES : visibleModules;
  // Wenn nur ein Modul sichtbar ist, ist es "solo". Sonst nicht.
  const isSolo = modules.length === 1 ? modules[0] : null;
  // Toggle-Funktion: Solo oder alle anzeigen
  const showOnlyModule = (module: string) => {
    if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
      if (isSolo === module) {
        // Wenn bereits solo, dann alle anzeigen
        window.dispatchEvent(new CustomEvent('showOnlyModule', { detail: 'ALL' }));
      } else {
        // Sonst nur dieses anzeigen
        window.dispatchEvent(new CustomEvent('showOnlyModule', { detail: module }));
      }
    }
  };
  // Kein flex-zentriertes Layout mehr, sondern immer nur space-y-6
  return (
    <div className="space-y-6">
      {/* Module-Rendering: Wenn nur ein Modul sichtbar ist, trotzdem Grid-Layout */}
      {/* Das bisherige Grid-Layout bleibt immer erhalten */}
      <>
        {/* Top Row - Exchange Times */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {modules.includes('ExchangeTimes') && (
            <ModuleWrapper
              onClose={() => hideModule('ExchangeTimes')}
              onSolo={() => showOnlyModule('ExchangeTimes')}
            >
              <ExchangeTimes />
            </ModuleWrapper>
          )}
        </div>

        {/* Zweite Zeile: Stock Analysis, Insider Trades, Backtest Tool (Backtest rechts von Insider Trades) */}
        {(modules.includes('StockAnalysis') ||
          modules.includes('InsiderTrades') ||
          modules.includes('BacktestTool')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {modules.includes('StockAnalysis') && (
              <div
                className={
                  (modules.length === 1 ? 'w-full max-w-2xl mx-auto ' : '') + 'flex flex-col'
                }
              >
                <div className="flex flex-col h-full min-h-[420px]">
                  <ModuleWrapper
                    onClose={() => hideModule('StockAnalysis')}
                    onSolo={() => showOnlyModule('StockAnalysis')}
                  >
                    <div className="flex flex-col h-full min-h-[420px]">
                      <StockAnalysis />
                    </div>
                  </ModuleWrapper>
                </div>
              </div>
            )}
            {modules.includes('InsiderTrades') && (
              <div
                className={
                  (modules.length === 1 ? 'w-full md:max-w-xl md:mx-auto ' : 'w-full ') +
                  'flex flex-col h-full min-h-[420px]'
                }
              >
                <ModuleWrapper
                  onClose={() => hideModule('InsiderTrades')}
                  onSolo={() => showOnlyModule('InsiderTrades')}
                >
                  <div className="flex flex-col h-full min-h-[420px]">
                    <InsiderTrades />
                  </div>
                </ModuleWrapper>
              </div>
            )}
            {/* Backtest Tool now placed to the right of Insider Trades (3rd column) */}
            {modules.includes('BacktestTool') && (
              <div className={modules.length === 1 ? 'w-full max-w-xl mx-auto ' : 'w-full '}>
                <ModuleWrapper
                  onClose={() => hideModule('BacktestTool')}
                  onSolo={() => showOnlyModule('BacktestTool')}
                >
                  <BacktestTool />
                </ModuleWrapper>
              </div>
            )}
          </div>
        )}

        {/* Full-width Portfolio Tracker Row (same sizing as Technical Analysis) */}
        {modules.includes('PortfolioTracker') && (
          <div className="grid grid-cols-1 gap-6">
            <div
              className={
                `flex-1 min-w-0 w-full max-w-full 2xl:max-w-screen-2xl mx-auto border border-gray-200 dark:border-[#23232a] rounded-xl mt-0 md:mt-2 flex flex-col h-full ` +
                (modules.length === 1 ? '' : '')
              }
            >
              <ModuleWrapper
                onClose={() => hideModule('PortfolioTracker')}
                onSolo={() => showOnlyModule('PortfolioTracker')}
              >
                <div className="p-4 flex flex-col h-full">
                  <PortfolioTracker />
                </div>
              </ModuleWrapper>
            </div>
          </div>
        )}

        {/* Neue Zeile: Technical Analysis */}
        <div className="grid grid-cols-1 gap-6">
          {modules.includes('TechnicalAnalysis') && (
            <div
              className={
                `flex-1 min-w-0 w-full max-w-full 2xl:max-w-screen-2xl mx-auto border border-gray-200 dark:border-[#23232a] rounded-xl mt-0 md:mt-2 flex flex-col h-full ` +
                (modules.length === 1 ? '' : '')
              }
            >
              <ModuleWrapper
                onClose={() => hideModule('TechnicalAnalysis')}
                onSolo={() => showOnlyModule('TechnicalAnalysis')}
              >
                <div className="p-4 flex flex-col h-full">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Technical Analysis
                  </h2>
                  <div className="flex-1 min-h-[700px]">
                    <TradingViewWidget />
                  </div>
                </div>
              </ModuleWrapper>
            </div>
          )}
        </div>

        {/* Third Row - Trading Tools (Compound Interest + Currency Converter) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modules.includes('CompoundInterest') && (
            <div className="flex-1 min-w-0 w-full max-w-2xl mx-auto md:mx-0 min-h-[220px] border border-gray-200 dark:border-[#23232a] rounded-xl mt-0 md:mt-2 flex flex-col justify-center">
              <div className="flex items-center justify-between px-6 pt-4 pb-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Compound Interest
                </h2>
                <div className="flex gap-2 items-center">
                  {/* Augen-Button und X-Button aus ModuleWrapper */}
                  <button
                    onClick={() => showOnlyModule('CompoundInterest')}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-400 rounded p-1 transition"
                    aria-label="Show only this module"
                    title="Show only this module"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => hideModule('CompoundInterest')}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    aria-label="Close"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-col h-full">
                <div className="flex-1 flex flex-col justify-between">
                  <CompoundInterestCalculator />
                </div>
              </div>
            </div>
          )}
          {modules.includes('CurrencyConverter') && (
            <div className="flex-1 min-w-0 w-full max-w-2xl mx-auto md:mx-0 border border-gray-200 dark:border-[#23232a] rounded-xl mt-0 md:mt-2 flex flex-col">
              <ModuleWrapper
                onClose={() => hideModule('CurrencyConverter')}
                onSolo={() => showOnlyModule('CurrencyConverter')}
              >
                <div className="p-4 flex flex-col h-full">
                  <CurrencyConverter />
                </div>
              </ModuleWrapper>
            </div>
          )}
        </div>

        {/* Fourth Row - Market Data (Currency Converter moved above) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{/* MarketSummary removed */}</div>

        {/* Fifth Row - Calendar und Holiday Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Neues Modul links neben Earnings Calendar */}
          {modules.includes('EconomicCalendar') && (
            <div
              className={
                (modules.length === 1 ? 'w-full max-w-xl mx-auto ' : '') +
                'border border-gray-200 dark:border-[#23232a] rounded-xl'
              }
            >
              <ModuleWrapper
                onClose={() => hideModule('EconomicCalendar')}
                onSolo={() => showOnlyModule('EconomicCalendar')}
              >
                <div className="flex flex-col h-full min-h-[220px] items-start justify-start px-6 pb-4 mt-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Economic Calendar
                  </h2>
                  <TradingviewEcCalendar />
                </div>
              </ModuleWrapper>
            </div>
          )}
          {modules.includes('EarningsCalendar') && (
            <div className={modules.length === 1 ? 'w-full max-w-xl mx-auto' : ''}>
              <ModuleWrapper
                onClose={() => hideModule('EarningsCalendar')}
                onSolo={() => showOnlyModule('EarningsCalendar')}
              >
                <EarningsCalendar />
              </ModuleWrapper>
            </div>
          )}
          {modules.includes('HolidayCalendar') && (
            <div className={modules.length === 1 ? 'w-full max-w-xl mx-auto' : ''}>
              <ModuleWrapper
                onClose={() => hideModule('HolidayCalendar')}
                onSolo={() => showOnlyModule('HolidayCalendar')}
              >
                <HolidayCalendar />
              </ModuleWrapper>
            </div>
          )}
        </div>

        {/* Sixth Row - Personal Budget Sankey Diagramm */}
        <div
          className={`flex flex-col md:flex-row gap-6 items-stretch${modules.length === 1 ? ' justify-center' : ''}`}
        >
          {/* Personal Budget Sankey Diagramm */}
          {modules.includes('PersonalBudget') && (
            <div className="flex-1 min-w-0 w-full max-w-full sm:max-w-screen-2xl mx-auto md:mx-0 mt-[-0.5rem] md:mt-0 flex flex-col h-full">
              <ModuleWrapper
                onClose={() => hideModule('PersonalBudget')}
                onSolo={() => showOnlyModule('PersonalBudget')}
              >
                <div className="flex-1 flex flex-col h-full">
                  <SankeyBudget />
                </div>
              </ModuleWrapper>
            </div>
          )}
        </div>

        {/* Real Estate vs. Stocks Calculator removed */}

        {/* Eighth Row - Tax Calculator */}
        <div
          className={`flex flex-col md:flex-row gap-6 items-stretch${modules.length === 1 ? ' justify-center' : ''}`}
        >
          {modules.includes('TaxCalculator') && (
            <div className="flex-1 min-w-0 w-full max-w-full sm:max-w-screen-2xl mx-auto md:mx-0 mt-[-0.5rem] md:mt-0 flex flex-col h-full rounded-xl">
              <ModuleWrapper
                onClose={() => hideModule('TaxCalculator')}
                onSolo={() => showOnlyModule('TaxCalculator')}
              >
                <div className="flex-1 flex flex-col h-full">
                  <TaxCalculator />
                </div>
              </ModuleWrapper>
            </div>
          )}
        </div>
      </>
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
  const { theme } = useTheme();

  // Formel für Endkapital mit monatlichen Einzahlungen (Zinseszins mit Raten):
  // FV = P*(1+r/n)^(n*t) + PMT*(((1+r/n)^(n*t)-1)/(r/n))
  // P = Startkapital, PMT = monatliche Einzahlung, r = Zinssatz, n = Zinsperioden/Jahr, t = Jahre
  const r = rate / 100;
  const n = interval;
  const t = years;
  const PMT = (monthly * 12) / n; // monatliche Einzahlung auf Zinsperiode umgerechnet

  const result =
    start * Math.pow(1 + r / n, n * t) +
    (PMT > 0 && r > 0 ? (PMT * (Math.pow(1 + r / n, n * t) - 1)) / (r / n) : PMT * n * t);

  // Chart data: calculate capital for each year
  const chartData = Array.from({ length: years + 1 }, (_, i) => {
    const base = start * Math.pow(1 + r / n, n * i);
    const pmtPart =
      PMT > 0 && r > 0 ? (PMT * (Math.pow(1 + r / n, n * i) - 1)) / (r / n) : PMT * n * i;
    return { year: i, capital: base + pmtPart };
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Linke Spalte: Eingaben */}
      <form className="flex flex-col gap-4 p-2 md:w-1/2 w-full max-w-md">
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Initial Capital
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={start}
            min={0}
            onChange={(e) => setStart(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Monthly Deposit
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={monthly}
            min={0}
            onChange={(e) => setMonthly(Number(e.target.value))}
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
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
          Years
          <input
            type="number"
            className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            value={years}
            min={1}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </label>
        <div className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200 mt-4">
          <FormControl size="small" fullWidth>
            <InputLabel
              id="interval-label"
              sx={
                theme === 'dark'
                  ? {
                      color: '#fff',
                      fontSize: 14,
                      top: 2,
                      backgroundColor: '#23232a',
                      px: 0.5,
                    }
                  : {
                      color: '#222',
                      fontSize: 14,
                      top: 2,
                      backgroundColor: '#fff',
                      px: 0.5,
                    }
              }
            >
              Payout Interval
            </InputLabel>
            <Select
              labelId="interval-label"
              id="interval-select"
              value={interval}
              label="Payout Interval"
              onChange={(e) => setInterval(Number(e.target.value))}
              sx={
                theme === 'dark'
                  ? {
                      backgroundColor: '#23232a',
                      color: '#fff',
                      fontSize: 14,
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: '#444',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#fff',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#fff',
                      },
                      '.MuiSvgIcon-root': {
                        color: '#fff',
                      },
                    }
                  : {
                      backgroundColor: '#fff',
                      color: '#000',
                      fontSize: 14,
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: '#ccc',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#222',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#222',
                      },
                      '.MuiSvgIcon-root': {
                        color: '#000',
                      },
                    }
              }
              MenuProps={{
                PaperProps: {
                  sx:
                    theme === 'dark'
                      ? {
                          backgroundColor: '#23232a',
                          color: '#fff',
                        }
                      : {
                          backgroundColor: '#fff',
                          color: '#000',
                        },
                },
              }}
            >
              <MenuItem value={12}>Monthly</MenuItem>
              <MenuItem value={4}>Quarterly</MenuItem>
              <MenuItem value={1}>Yearly</MenuItem>
            </Select>
          </FormControl>
        </div>
      </form>
      {/* Rechte Spalte: Ergebnisse und Chart */}
      <div className="flex flex-col gap-2 md:w-1/2 w-full justify-center">
        <div className="text-base font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#23232a] rounded-md px-3 py-2">
          Final Capital:{' '}
          {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          €
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#23232a] rounded-md px-3 py-2">
          Initial Capital:{' '}
          {start.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          €<br />
          Total Deposits:{' '}
          {(monthly * 12 * years).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          €<br />
          Return:{' '}
          {(result - start - monthly * 12 * years).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          €
        </div>
        <div className="w-full h-80 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  function formatPrice(num: number) {
                    if (typeof num !== 'number') return '-';
                    return num
                      .toFixed(2)
                      .replace('.', ',')
                      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                  }
                  return (
                    <div className="min-w-[110px] max-w-[180px] rounded-lg bg-black text-white dark:bg-white dark:text-black border border-gray-200 px-2 py-1 text-[11px] shadow-lg flex flex-col gap-1">
                      <div className="font-semibold mb-0.5">
                        {item && item.year !== undefined ? `Year ${item.year}` : label}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[12px]">€{formatPrice(item?.capital)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="capital"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#colorCapital)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
