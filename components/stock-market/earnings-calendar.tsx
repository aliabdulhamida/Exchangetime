"use client"

import { Calendar, Clock, Info } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// Earnings-Daten aus JS-Snippet
const EARNINGS_DATA: Record<string, any[]> = {
  '2025-07-21': [
    { ticker: 'VZ', company_name: 'Verizon Communications Inc.', release_time: 'Before Market Open', eps_estimate: '1.18', revenue_estimate: '33.20' },
    { ticker: 'DPZ', company_name: 'Dominos Pizza, Inc.', release_time: 'Before Market Open', eps_estimate: '3.93', revenue_estimate: '1.15' },
    { ticker: 'CLF', company_name: 'Cleveland‑Cliffs Inc.', release_time: 'Before Market Open', eps_estimate: '-0.67', revenue_estimate: '4.80' },
    { ticker: 'ROP', company_name: 'Roper Technologies, Inc.', release_time: 'Before Market Open', eps_estimate: '4.82', revenue_estimate: '1.65' },
    { ticker: 'GE', company_name: 'GE Aerospace', release_time: 'Before Market Open', eps_estimate: '1.20', revenue_estimate: '9.50' },
    { ticker: 'GM', company_name: 'General Motors Company', release_time: 'Before Market Open', eps_estimate: '2.75', revenue_estimate: '45.50' },
    { ticker: 'PM', company_name: 'Philip Morris International Inc.', release_time: 'Before Market Open', eps_estimate: '1.68', revenue_estimate: '9.20' },
    { ticker: 'ISRG', company_name: 'Intuitive Surgical, Inc.', release_time: 'After Market Close', eps_estimate: '1.85', revenue_estimate: '2.25' },
    { ticker: 'T', company_name: 'AT&T Inc.', release_time: 'Before Market Open', eps_estimate: '0.57', revenue_estimate: '30.10' },
    { ticker: 'CME', company_name: 'CME Group Inc.', release_time: 'Before Market Open', eps_estimate: '2.15', revenue_estimate: '1.40' },
    { ticker: 'GEV', company_name: 'GE Vernova', release_time: 'Before Market Open', eps_estimate: '0.95', revenue_estimate: '8.80' },
    { ticker: 'TMO', company_name: 'Thermo Fisher Scientific Inc.', release_time: 'Before Market Open', eps_estimate: '5.05', revenue_estimate: '10.75' }
  ],
  '2025-07-22': [
    { ticker: 'KO', company_name: 'Coca‑Cola Company', release_time: 'Before Market Open', eps_estimate: '0.84', revenue_estimate: '12.60' },
    { ticker: 'KDP', company_name: 'Keurig Dr Pepper Inc.', release_time: 'Before Market Open', eps_estimate: '0.42', revenue_estimate: '3.85' }
  ],
  '2025-07-23': [
    { ticker: 'GOOG', company_name: 'Alphabet Inc. (Class C)', release_time: 'After Market Close', eps_estimate: '2.17', revenue_estimate: '93.70' },
    { ticker: 'GOOGL', company_name: 'Alphabet Inc. (Class A)', release_time: 'After Market Close', eps_estimate: '2.17', revenue_estimate: '93.70' },
    { ticker: 'IBM', company_name: 'International Business Machines Corp.', release_time: 'After Market Close', eps_estimate: '1.95', revenue_estimate: '15.25' },
    { ticker: 'QS', company_name: 'QuantumScape Corporation', release_time: 'After Market Close', eps_estimate: '-0.18', revenue_estimate: '0.02' },
    { ticker: 'NOW', company_name: 'ServiceNow, Inc.', release_time: 'After Market Close', eps_estimate: '3.15', revenue_estimate: '2.95' }
  ],
  '2025-07-24': [
    { ticker: 'TSLA', company_name: 'Tesla, Inc.', release_time: 'After Market Close', eps_estimate: '0.44', revenue_estimate: '22.70' },
    { ticker: 'CMCSA', company_name: 'Comcast Corporation', release_time: 'After Market Close', eps_estimate: '1.06', revenue_estimate: '29.85' },
    { ticker: 'DOW', company_name: 'Dow Inc.', release_time: 'After Market Close', eps_estimate: '0.52', revenue_estimate: '10.80' }
  ],
  '2025-07-25': [
    { ticker: 'AN', company_name: 'AutoNation, Inc.', release_time: 'Before Market Open', eps_estimate: '4.25', revenue_estimate: '6.45' },
    { ticker: 'CHTR', company_name: 'Charter Communications, Inc.', release_time: 'Before Market Open', eps_estimate: '8.95', revenue_estimate: '13.75' },
    { ticker: 'HCA', company_name: 'HCA Healthcare, Inc.', release_time: 'Before Market Open', eps_estimate: '4.55', revenue_estimate: '17.20' },
    { ticker: 'PSX', company_name: 'Phillips 66', release_time: 'Before Market Open', eps_estimate: '2.15', revenue_estimate: '37.50' },
    { ticker: 'BX', company_name: 'Blackstone Inc.', release_time: 'Before Market Open', eps_estimate: '1.15', revenue_estimate: '2.80' },
    { ticker: 'INTC', company_name: 'Intel Corporation', release_time: 'After Market Close', eps_estimate: '-0.03', revenue_estimate: '12.95' },
    { ticker: 'NEM', company_name: 'Newmont Corporation', release_time: 'After Market Close', eps_estimate: '0.85', revenue_estimate: '4.25' },
    { ticker: 'AON', company_name: 'Aon plc', release_time: 'Before Market Open', eps_estimate: '2.95', revenue_estimate: '3.15' }
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
