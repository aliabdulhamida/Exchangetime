'use client';

import { CalendarX } from 'lucide-react';
import { useState } from 'react';

import { CustomCalendar as Calendar } from '@/components/ui/calendar';
import marketHours from '@/lib/exchangeinfo.js';

interface MarketHoliday {
  name: string;
  date: string;
  markets: string[];
  type: 'full' | 'early';
  earlyCloseTime?: string;
}

export default function HolidayCalendar() {
  // Extrahiere Feiertage aus marketHours
  const holidays: MarketHoliday[] = [];
  Object.entries(marketHours).forEach(([market, info]: any) => {
    if (info.holidays) {
      Object.entries(info.holidays).forEach(([date, details]: any) => {
        holidays.push({
          name: details.reason,
          date,
          markets: [market],
          type: details.closeEarly ? 'early' : 'full',
          earlyCloseTime: details.earlyCloseTime ? details.earlyCloseTime : undefined,
        });
      });
    }
  });

  const isUpcoming = (date: string) => {
    return new Date(date) > new Date();
  };

  // Für Kalender: Alle Feiertage als Date-Objekte

  // Hilfsfunktion: Datum zu YYYY-MM-DD (ohne Zeitzonenverschiebung)
  function toISODateString(date: Date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const holidayDates = holidays.map((h) => h.date);
  // Wir speichern das ausgewählte Datum als String, initial auf heute
  const todayISO = toISODateString(new Date());
  const [selected, setSelected] = useState<string | undefined>(todayISO);

  // Finde alle Holidays für ein bestimmtes Datum
  const getHolidayForDate = (dateString: string) => {
    return holidays.filter((h) => h.date === dateString);
  };

  return (
    <div className="px-1 pb-1 sm:px-2 sm:pb-2">
      <h2 className="mb-3 pr-16 text-base font-semibold text-foreground sm:mb-4 sm:pr-20">
        Holiday Calendar
      </h2>
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="w-full overflow-x-auto pb-1">
          <div className="mx-auto w-fit">
            <Calendar
              value={selected ? new Date(selected) : undefined}
              onChange={(value) => {
                if (Array.isArray(value)) return;
                setSelected(value ? toISODateString(value) : undefined);
              }}
              tileClassName={({ date }) =>
                holidayDates.includes(toISODateString(date))
                  ? 'border-2 border-red-400 bg-red-200 font-bold text-red-700 hover:bg-gray-300 dark:text-red-400 dark:hover:bg-gray-800'
                  : 'hover:bg-gray-300 dark:hover:bg-gray-800'
              }
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pr-1 sm:max-h-80 sm:pr-2">
          {/* Feiertagsdetails anzeigen, falls ein Feiertag ausgewählt ist */}
          {selected &&
            (getHolidayForDate(selected).length > 0 ? (
              <div className="mb-2 p-0 sm:mb-3">
                {getHolidayForDate(selected).map((h, i) => (
                  <div key={i} className="mb-2 flex items-start gap-2 last:mb-0">
                    <span className="mt-1 text-xl">
                      <i className="bi bi-dot"></i>
                    </span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{h.markets.join(', ')}</div>
                      {h.earlyCloseTime && (
                        <div className="text-xs text-yellow-300">Early Close: {h.earlyCloseTime}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[72px] flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
                <CalendarX className="mb-1 h-5 w-5" />
                <span className="block text-center">No holidays for this date.</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
