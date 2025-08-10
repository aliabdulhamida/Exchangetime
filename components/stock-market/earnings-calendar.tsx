'use client';

import { CalendarX } from 'lucide-react';
import { useState } from 'react';

const EARNINGS_DATA: Record<string, any[]> = {
  // Montag, 11.08.2025
  '2025-08-11': [
    // Keine prominenten Veröffentlichungen bekannt – leer lassen
  ],
  // Dienstag, 12.08.2025
  '2025-08-12': [
    {
      ticker: 'SE',
      company_name: 'Sea Limited',
      release_time: 'Before Market Open',
      eps_estimate: 0.72, // Nasdaq/Zacks Konsens
      revenue_estimate: 5.03, // Mrd. USD
    },
  ],
  // Mittwoch, 13.08.2025
  '2025-08-13': [
    {
      ticker: 'CSCO',
      company_name: 'Cisco Systems, Inc.',
      release_time: 'After Market Close',
      eps_estimate: 0.81, // MarketBeat Konsens Q4 FY25
      revenue_estimate: 14.5, // Mrd. USD
    },
    {
      ticker: 'BABA',
      company_name: 'Alibaba Group Holding Limited',
      release_time: 'Before Market Open',
      eps_estimate: 1.95, // Nasdaq/Zacks Konsens
      revenue_estimate: 34.26, // Mrd. USD
    },
  ],
  // Donnerstag, 14.08.2025
  '2025-08-14': [
    {
      ticker: 'NTES',
      company_name: 'NetEase, Inc.',
      release_time: 'Before Market Open',
      eps_estimate: 1.85, // Nasdaq/Zacks Konsens
      revenue_estimate: 3.86, // Mrd. USD
    },
    {
      ticker: 'AMAT',
      company_name: 'Applied Materials, Inc.',
      release_time: 'After Market Close',
      eps_estimate: 2.34, // MarketBeat Konsens Q3 FY25
      revenue_estimate: 7.2, // Mrd. USD
    },
    {
      ticker: 'NU',
      company_name: 'Nu Holdings Ltd.',
      release_time: 'After Market Close',
      eps_estimate: 0.13, // Nasdaq/Zacks Konsens
      revenue_estimate: 3.67, // Mrd. USD
    },
    {
      ticker: 'DE',
      company_name: 'Deere & Company',
      release_time: 'Before Market Open',
      eps_estimate: 4.62, // Nasdaq/Zacks Konsens
      revenue_estimate: 10.3, // Mrd. USD
    },
  ],
  // Freitag, 15.08.2025
  '2025-08-15': [
    // Optional: weitere ADRs/Unternehmen je nach Quelle
  ],
};

function getWeekDates(baseDate: Date) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function EarningsCalendar() {
  const today = new Date();
  // Ermittle Wochenstart (Sonntag)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const [selectedDayIdx, setSelectedDayIdx] = useState(today.getDay());
  const selectedDate = weekDates[selectedDayIdx];
  const key = selectedDate.toISOString().split('T')[0];
  let items = EARNINGS_DATA[key] || [];

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
                  <span className="text-[11px] font-medium mt-0.5">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
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
                  <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400 tracking-wide leading-tight truncate">
                    {item.ticker}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-neutral-300 font-medium leading-tight truncate">
                    {item.company_name}
                  </div>
                </div>
                {/* Rechte Seite: Release, EPS, Rev */}
                <div className="flex flex-col items-end min-w-[90px] ml-4">
                  <div className="text-teal-600 dark:text-teal-400 text-xs font-semibold leading-tight whitespace-nowrap">
                    {item.release_time}
                  </div>
                  <div className="text-gray-700 dark:text-neutral-400 text-xs font-bold flex gap-0.5 whitespace-nowrap">
                    EPS:{' '}
                    <span className="text-black dark:text-white font-extrabold">
                      {item.eps_estimate}
                    </span>
                  </div>
                  <div className="text-gray-700 dark:text-neutral-400 text-xs font-bold flex gap-0.5 whitespace-nowrap">
                    Rev:{' '}
                    <span className="text-black dark:text-white font-extrabold">
                      {String(item.revenue_estimate)}
                      {!isNaN(parseFloat(String(item.revenue_estimate))) ? 'B' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ISO 8601 Kalenderwochen-Berechnung
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() === 0 ? 7 : d.getUTCDay()));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}
