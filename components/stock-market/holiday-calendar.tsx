"use client"


import { AlertCircle, CalendarX } from "lucide-react"
import marketHours from "@/lib/exchangeinfo.js"
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"


interface MarketHoliday {
  name: string
  date: string
  markets: string[]
  type: "full" | "early"
  earlyCloseTime?: string
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
          type: details.closeEarly ? "early" : "full",
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

  const holidayDates = holidays.map(h => h.date);
  // Wir speichern das ausgewählte Datum als String, initial auf heute
  const todayISO = toISODateString(new Date());
  const [selected, setSelected] = useState<string | undefined>(todayISO);

  // Finde alle Holidays für ein bestimmtes Datum
  const getHolidayForDate = (dateString: string) => {
    return holidays.filter(h => h.date === dateString);
  };


  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-[#1F1F23]">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Holiday Calendar
      </h2>
      <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row">
        <div className="w-full sm:w-auto flex justify-center">
          <Calendar
            mode="single"
            selected={selected ? new Date(selected) : undefined}
            onSelect={(date: Date | undefined) => {
              setSelected(date ? toISODateString(date) : undefined);
            }}
            modifiers={{
              holiday: (date: Date) => holidayDates.includes(toISODateString(date)),
            }}
            modifiersClassNames={{
              holiday: "bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 border-red-400 border-2",
            }}
          />
        </div>
        <div className="flex-1 min-w-0 sm:min-w-[220px] pr-0 sm:pr-4 max-h-60 sm:max-h-80 overflow-y-auto flex flex-col">
          {/* Feiertagsdetails anzeigen, falls ein Feiertag ausgewählt ist */}
          {selected && (
            getHolidayForDate(selected).length > 0 ? (
              <div className="mb-2 sm:mb-4 p-0">
                {getHolidayForDate(selected).map((h, i) => (
                  <div key={i} className="mb-2 last:mb-0 flex items-start gap-2">
                    <span className="mt-1 text-xl"><i className="bi bi-dot"></i></span>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{h.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{h.markets.join(", ")}</div>
                      {h.earlyCloseTime && (
                        <div className="text-xs text-yellow-700 dark:text-yellow-300">Early Close: {h.earlyCloseTime}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[60px] text-sm text-gray-500 dark:text-gray-400">
                <CalendarX className="w-5 h-5 mb-1" />
                <span className="block text-center">No holidays for this date.</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
