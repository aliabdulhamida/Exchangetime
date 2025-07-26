"use client"

import { Calendar, Clock, Info } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// Earnings-Daten aus JS-Snippet
const EARNINGS_DATA: Record<string, any[]> = {
  '2025-07-28': [
    { ticker: 'BOH', company_name: 'Bank of Hawaii', release_time: 'Before Market Open', eps_estimate: '1.06', revenue_estimate: null },
    { ticker: 'EPD', company_name: 'Enterprise Products Partners', release_time: 'Before Market Open', eps_estimate: '0.64', revenue_estimate: null },
    { ticker: 'RVTY', company_name: 'Revvity, Inc.', release_time: 'Before Market Open', eps_estimate: '1.14', revenue_estimate: null },
    { ticker: 'ABCB', company_name: 'Ameris Bancorp', release_time: 'After Market Close', eps_estimate: '1.33', revenue_estimate: null },
    { ticker: 'AMKR', company_name: 'Amkor Technology', release_time: 'After Market Close', eps_estimate: '0.16', revenue_estimate: null },
    { ticker: 'CDNS', company_name: 'Cadence Design', release_time: 'After Market Close', eps_estimate: '1.56', revenue_estimate: null },
    /* plus many of the other post-market names like HIG, NUE, WM, etc. as needed */
  ],
  '2025-07-29': [
    { ticker: 'PG', company_name: 'Procter & Gamble', release_time: 'Before Market Open', eps_estimate: '1.42', revenue_estimate: '20.9' },
    { ticker: 'PYPL', company_name: 'PayPal Holdings', release_time: 'Before Market Open', eps_estimate: '1.30', revenue_estimate: null },
    { ticker: 'SPOT', company_name: 'Spotify Technology', release_time: 'Before Market Open', eps_estimate: '1.33', revenue_estimate: null },
    { ticker: 'UNH', company_name: 'UnitedHealth Group', release_time: 'Before Market Open', eps_estimate: null, revenue_estimate: null },
    { ticker: 'V', company_name: 'Visa Inc.', release_time: 'After Market Close', eps_estimate: null, revenue_estimate: null },
    { ticker: 'BKNG', company_name: 'Booking Holdings', release_time: 'After Market Close', eps_estimate: null, revenue_estimate: null }
  ],
  '2025-07-30': [
    { ticker: 'META', company_name: 'Meta Platforms, Inc.', release_time: 'After Market Close', eps_estimate: null, revenue_estimate: null },
    { ticker: 'MSFT', company_name: 'Microsoft Corporation', release_time: 'After Market Close', eps_estimate: null, revenue_estimate: null },
    { ticker: 'AMZN', company_name: 'Amazon.com, Inc.', release_time: 'After Market Close', eps_estimate: '1.32', revenue_estimate: '162.0' },
    { ticker: 'QCOM', company_name: 'Qualcomm Incorporated', release_time: 'After Market Close', eps_estimate: null, revenue_estimate: null },
    { ticker: 'ADP', company_name: 'Automatic Data Processing, Inc.', release_time: 'Before Market Open', eps_estimate: null, revenue_estimate: null }
  ],
  '2025-07-31': [
    { ticker: 'AAPL', company_name: 'Apple Inc.', release_time: 'After Market Close', eps_estimate: '1.41', revenue_estimate: '90.7' },
    { ticker: 'CVX', company_name: 'Chevron Corporation', release_time: 'Before Market Open', eps_estimate: null, revenue_estimate: null },
    { ticker: 'XOM', company_name: 'Exxon Mobil Corporation', release_time: 'Before Market Open', eps_estimate: null, revenue_estimate: null },
    { ticker: 'ABBV', company_name: 'AbbVie Inc.', release_time: 'Before Market Open', eps_estimate: null, revenue_estimate: null },
    { ticker: 'NET', company_name: 'Cloudflare, Inc.', release_time: 'After Market Close', eps_estimate: null, revenue_estimate: null }
  ],
  '2025-08-01': [
    // For this date, there are smaller-cap & international reports noted (Colgate, Oshkosh, etc.)
    { ticker: 'CL', company_name: 'Colgate-Palmolive Company', release_time: 'Before Market Open', eps_estimate: '0.90', revenue_estimate: null },
    { ticker: 'OSK', company_name: 'Oshkosh Corporation', release_time: 'Before Market Open', eps_estimate: '2.94', revenue_estimate: null },
    { ticker: 'RBC', company_name: 'RBC Bearings Incorporated', release_time: 'Before Market Open', eps_estimate: '2.74', revenue_estimate: null },
    { ticker: 'PFE', company_name: 'Pfizer Inc.', release_time: 'Before Market Open', eps_estimate: null, revenue_estimate: null },
    { ticker: 'CVX', company_name: 'Chevron Corporation', release_time: 'Before Market Open', eps_estimate: '1.77', revenue_estimate: null }
  ]
}

function getWeekDates(baseDate: Date) {
  const start = new Date(baseDate)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function EarningsCalendar() {
  const today = new Date()
  // Ermittle Wochenstart (Sonntag)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const [selectedDayIdx, setSelectedDayIdx] = useState(today.getDay())
  const selectedDate = weekDates[selectedDayIdx]
  const key = selectedDate.toISOString().split('T')[0]
  let items = EARNINGS_DATA[key] || []

  return (
    <div className="rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Earnings Calendar
        </h2>
      </div>
      {/* Calendar Week above Day Selector */}
      <div className="w-full flex justify-center">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg text-center">
          Calendar Week {getISOWeek(selectedDate)}
        </h3>
      </div>
      {/* Day Selector */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 flex justify-center py-2">
          <div className="flex gap-4 min-w-max px-2 justify-center">
            {weekDates.map((date, idx) => {
          const isSelected = selectedDayIdx === idx;
          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDayIdx(idx)}
                    className={`flex flex-col items-center justify-center min-w-[44px] px-2 py-1.5 rounded-md border transition-all duration-150
                      ${isSelected ? 'text-black dark:text-white border-gray-900 dark:border-white shadow-lg scale-105' : 'text-black dark:text-white border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#232329]'}
                      font-semibold text-sm`}
                    style={{ boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.12)' : undefined }}
                  >
                    <span className="text-base font-bold">{date.getDate()}</span>
                    <span className="text-[11px] font-medium mt-0.5">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
            </button>
          );
        })}
            </div>
          </div>
      </div>
      {/* Earnings List für ausgewählten Tag */}
      <div className="pl-4">
        {/* Datum entfernt */}
        {items.length === 0 ? (
          <div className="text-gray-400">No earnings scheduled.</div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-3 px-4 md:px-8 rounded-lg scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="border border-gray-200 dark:border-neutral-800 rounded-lg px-2 py-2 flex flex-row justify-between items-center shadow hover:shadow-md transition-shadow duration-200 min-h-0"
              >
                {/* Linke Seite: Ticker & Firmenname */}
                <div className="flex flex-col min-w-0">
                  <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400 tracking-wide leading-tight truncate">{item.ticker}</div>
                  <div className="text-sm text-gray-700 dark:text-neutral-300 font-medium leading-tight truncate">{item.company_name}</div>
                </div>
                {/* Rechte Seite: Release, EPS, Rev */}
                <div className="flex flex-col items-end min-w-[90px] ml-4">
                  <div className="text-teal-600 dark:text-teal-400 text-xs font-semibold leading-tight whitespace-nowrap">{item.release_time}</div>
                  <div className="text-gray-700 dark:text-neutral-400 text-xs font-bold flex gap-0.5 whitespace-nowrap">
                    EPS: <span className="text-black dark:text-white font-extrabold">{item.eps_estimate}</span>
                  </div>
                  <div className="text-gray-700 dark:text-neutral-400 text-xs font-bold flex gap-0.5 whitespace-nowrap">
                    Rev: <span className="text-black dark:text-white font-extrabold">{item.revenue_estimate}B</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

  )
}

// ISO 8601 Kalenderwochen-Berechnung
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() === 0 ? 7 : d.getUTCDay()));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
