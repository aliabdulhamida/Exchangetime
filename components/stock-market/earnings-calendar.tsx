"use client"

import { Calendar, Clock, Info, CalendarX } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"


const EARNINGS_DATA: Record<string, any[]> = {
  '2025-08-04': [
    { ticker: 'DVN', company_name: 'Devon Energy Corporation', release_time: 'Before Market Open', eps_estimate: '0.84', revenue_estimate: '4.28' },
    { ticker: 'SU', company_name: 'Suncor Energy Inc.', release_time: 'Before Market Open', eps_estimate: '0.51', revenue_estimate: '8.59' },
    { ticker: 'CNR', company_name: 'Core Natural Resources', release_time: 'Before Market Open', eps_estimate: '-0.70', revenue_estimate: '1.10' },
    { ticker: 'CRC', company_name: 'California Resources Corporation', release_time: 'Before Market Open', eps_estimate: '1.10', revenue_estimate: '0.98' },
    { ticker: 'MOS', company_name: 'The Mosaic Company', release_time: 'Before Market Open', eps_estimate: '0.51', revenue_estimate: '3.54' }
  ],
  '2025-08-05': [
    { ticker: 'BP', company_name: 'BP p.l.c.', release_time: 'Before Market Open', eps_estimate: '0.90', revenue_estimate: '46.63' },
    { ticker: 'MPC', company_name: 'Marathon Petroleum Corporation', release_time: 'Before Market Open', eps_estimate: '3.96', revenue_estimate: '34.10' },
    { ticker: 'ADM', company_name: 'Archer-Daniels-Midland Company', release_time: 'Before Market Open', eps_estimate: '0.93', revenue_estimate: '21.17' },
    { ticker: 'CAT', company_name: 'Caterpillar Inc.', release_time: 'Before Market Open', eps_estimate: '4.72', revenue_estimate: '16.69' },
    { ticker: 'PFE', company_name: 'Pfizer Inc.', release_time: 'Before Market Open', eps_estimate: '0.78', revenue_estimate: '14.70' },
    { ticker: 'ETN', company_name: 'Eaton Corporation plc', release_time: 'Before Market Open', eps_estimate: '2.95', revenue_estimate: '7.03' },
    { ticker: 'MAR', company_name: 'Marriott International Inc.', release_time: 'Before Market Open', eps_estimate: '2.65', revenue_estimate: '6.74' },
    { ticker: 'AMGN', company_name: 'Amgen Inc.', release_time: 'After Market Close', eps_estimate: '6.02', revenue_estimate: '9.18' },
    { ticker: 'AMD', company_name: 'Advanced Micro Devices, Inc.', release_time: 'After Market Close', eps_estimate: '0.48', revenue_estimate: '7.68' },
    { ticker: 'CPNG', company_name: 'Coupang, Inc.', release_time: 'After Market Close', eps_estimate: '0.02', revenue_estimate: '8.52' },
    { ticker: 'SMCI', company_name: 'Super Micro Computer, Inc.', release_time: 'After Market Close', eps_estimate: '0.41', revenue_estimate: '5.76' },
    { ticker: 'AFL', company_name: 'Aflac Incorporated', release_time: 'After Market Close', eps_estimate: '1.78', revenue_estimate: '4.16' },
    { ticker: 'ANET', company_name: 'Arista Networks, Inc.', release_time: 'After Market Close', eps_estimate: '0.73', revenue_estimate: '2.21' },
    { ticker: 'RIVN', company_name: 'Rivian Automotive, Inc.', release_time: 'After Market Close', eps_estimate: '-0.97', revenue_estimate: '1.30' },
    { ticker: 'SNAP', company_name: 'Snap Inc.', release_time: 'After Market Close', eps_estimate: '-0.16', revenue_estimate: '1.34' }
  ],
  '2025-08-06': [
    { ticker: 'CMI', company_name: 'Cummins Inc.', release_time: 'Before Market Open', eps_estimate: '6.43', revenue_estimate: '8.60' },
    { ticker: 'DUK', company_name: 'Duke Energy Corporation', release_time: 'Before Market Open', eps_estimate: '1.25', revenue_estimate: '7.51' },
    { ticker: 'FMS', company_name: 'Fresenius Medical Care AG & Co. KGaA', release_time: 'Before Market Open', eps_estimate: '0.52', revenue_estimate: '5.32' },
    { ticker: 'FOX', company_name: 'Fox Corporation', release_time: 'Before Market Open', eps_estimate: '1.27', revenue_estimate: '3.29' },
    { ticker: 'FOXA', company_name: 'Fox Corporation', release_time: 'Before Market Open', eps_estimate: '1.27', revenue_estimate: '3.29' },
    { ticker: 'PEG', company_name: 'Public Service Enterprise Group Incorporated', release_time: 'Before Market Open', eps_estimate: '0.77', revenue_estimate: '2.81' },
    { ticker: 'EXPD', company_name: 'Expeditors International of Washington, Inc.', release_time: 'Before Market Open', eps_estimate: '1.34', revenue_estimate: '2.65' },
    { ticker: 'TDG', company_name: 'TransDigm Group Incorporated', release_time: 'Before Market Open', eps_estimate: '9.60', revenue_estimate: '2.24' }
  ],
  '2025-08-07': [
    { ticker: 'TM', company_name: 'Toyota Motor Corporation', release_time: 'Before Market Open', eps_estimate: '4.47', revenue_estimate: '84.77' },
    { ticker: 'LLY', company_name: 'Eli Lilly and Company', release_time: 'Before Market Open', eps_estimate: '5.56', revenue_estimate: '14.60' },
    { ticker: 'NVO', company_name: 'Novo Nordisk A/S', release_time: 'Before Market Open', eps_estimate: '0.93', revenue_estimate: '12.00' },
    { ticker: 'COP', company_name: 'ConocoPhillips', release_time: 'Before Market Open', eps_estimate: '1.38', revenue_estimate: '14.90' },
    { ticker: 'GILD', company_name: 'Gilead Sciences, Inc.', release_time: 'Before Market Open', eps_estimate: '1.96', revenue_estimate: '7.00' }
  ],
  '2025-08-08': [
    { ticker: 'SNOW', company_name: 'Snowflake Inc.', release_time: 'After Market Close', eps_estimate: '0.05', revenue_estimate: '0.90' },
    { ticker: 'DDOG', company_name: 'Datadog, Inc.', release_time: 'After Market Close', eps_estimate: '0.41', revenue_estimate: '0.80' },
    { ticker: 'NET', company_name: 'Cloudflare, Inc.', release_time: 'After Market Close', eps_estimate: '0.19', revenue_estimate: '0.43' },
    { ticker: 'CRWD', company_name: 'CrowdStrike Holdings, Inc.', release_time: 'After Market Close', eps_estimate: '1.04', revenue_estimate: '0.98' },
    { ticker: 'ZS', company_name: 'Zscaler, Inc.', release_time: 'After Market Close', eps_estimate: '0.78', revenue_estimate: '0.50' }
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
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Earnings Calendar
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
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60px] text-sm text-gray-400">
            <CalendarX className="w-5 h-5 mb-1" />
            <span className="block text-center">No earnings scheduled.</span>
          </div>
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
