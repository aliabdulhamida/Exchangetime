"use client"

import { Clock, Heart } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import marketHours from "@/lib/exchangeinfo.js"

type Exchange = {
  name: string;
  city: string;
  country: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  nextEvent: string;
  localTime?: string;
};


export default function ExchangeTimes() {
    const [filter, setFilter] = useState("");
    const { theme } = useTheme();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<string>("All");
    // Mapping marketHours to Exchange[]

    function getExchangesFromMarketHours(): Exchange[] {
      return Object.entries(marketHours).map(([key, value]: [string, any]) => {
        // Fallbacks für open/close (z.B. Tokio hat open1/close1)
        const openTime = value.open || value.open1 || "";
        const closeTime = value.close || value.close1 || "";
        // Fallback für country
        const country = value.country || value.region || "";
        return {
          name: key,
          city: value.city || "",
          country,
          timezone: value.timezone || "",
          openTime,
          closeTime,
          isOpen: false,
          nextEvent: "",
          localTime: getLocalTimeString(value.timezone || "")
        };
      });
    }

    const [exchanges, setExchanges] = useState<Exchange[]>(getExchangesFromMarketHours());

    // Regionen extrahieren
    const regions = Array.from(new Set(Object.values(marketHours).map((ex: any) => ex.region || "Other")));
    regions.sort();
    regions.unshift("All");

    function isOpen(exchange: Exchange) {
        const now = new Date();
        // Hole die aktuelle Zeit in der Zeitzone der Börse
        const localNow = new Date(
            now.toLocaleString("en-US", { timeZone: exchange.timezone })
        );
        const day = localNow.getDay(); // 0 = Sonntag, 6 = Samstag
        // Standard: Börsen sind am Samstag und Sonntag geschlossen
        if (day === 0 || day === 6) return false;
        // Feiertage prüfen
        const exInfo = (marketHours as any)[exchange.name];
        const holidays = exInfo?.holidays || {};
        const dateStr = localNow.toISOString().slice(0, 10); // YYYY-MM-DD
        if (holidays[dateStr]) {
            // Wenn geschlossen (closeEarly: false), dann nie offen
            if (!holidays[dateStr].closeEarly) return false;
        }
        // Öffnungs- und Schließzeiten ggf. für verkürzten Tag anpassen
        let openTime = exchange.openTime;
        let closeTime = exchange.closeTime;
        if (holidays[dateStr] && holidays[dateStr].closeEarly && holidays[dateStr].earlyCloseTime) {
            closeTime = holidays[dateStr].earlyCloseTime;
        }
        const [openHour, openMinute] = openTime.split(":");
        const [closeHour, closeMinute] = closeTime.split(":");
        const open = new Date(localNow);
        const close = new Date(localNow);
        open.setHours(Number(openHour), Number(openMinute), 0, 0);
        close.setHours(Number(closeHour), Number(closeMinute), 0, 0);
        return localNow >= open && localNow <= close;
    }

    function getLocalTimeString(timezone: string) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: timezone });
    }

    useEffect(() => {
        const updateExchangeStatus = () => {
            setExchanges((prev) =>
                prev.map((exchange) => ({
                    ...exchange,
                    isOpen: isOpen(exchange),
                    localTime: getLocalTimeString(exchange.timezone),
                }))
            );
        };
        updateExchangeStatus(); // Initiales Update
        const interval = setInterval(updateExchangeStatus, 1000); // Jede Sekunde für aktuelle Uhrzeit
        return () => clearInterval(interval);
    }, []);

    // Favoriten-Logik
    function toggleFavorite(name: string) {
        setFavorites((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
        );
    }


    // Filter- und Sortierlogik
    let filtered = exchanges.filter((ex) =>
        (selectedRegion === "All" || ((marketHours as any)[ex.name]?.region || "Other") === selectedRegion) &&
        (ex.name.toLowerCase().includes(filter.toLowerCase()) ||
        ex.city.toLowerCase().includes(filter.toLowerCase()))
    );
    let sorted = filtered;
    if (showOnlyFavorites) {
        sorted = sorted.filter((ex) => favorites.includes(ex.name));
    }

    return (
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6 text-white" />
          Exchange Times
        </h2>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2 w-full">
            <input
              type="text"
              placeholder="Search for exchange or city..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:bg-[#18181c] dark:text-white text-sm w-full max-w-xs"
            />
            <button
              onClick={() => setShowOnlyFavorites((prev) => !prev)}
              className="ml-2 p-1 rounded focus:outline-none border border-transparent hover:border-white transition"
              title={showOnlyFavorites ? 'Show all exchanges' : 'Show only favorites'}
              type="button"
            >
              <Heart
                size={22}
                className={
                  showOnlyFavorites
                    ? theme === 'dark'
                      ? 'text-white fill-white'
                      : 'text-red-500 fill-red-500'
                    : theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-gray-400'
                }
                fill={showOnlyFavorites ? 'currentColor' : 'none'}
              />
            </button>
          </div>
          <div className="flex gap-2 items-center mt-2 sm:mt-0">
            <label htmlFor="region-select" className="text-sm text-gray-700 dark:text-gray-300 font-medium">Region:</label>
            <select
              id="region-select"
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:bg-[#18181c] dark:text-white text-sm"
            >
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sorted.map((exchange) => {
              // Zeit bis zum nächsten Event berechnen, unter Berücksichtigung von Wochenenden und Feiertagen
              const now = new Date();
              const exInfo = (marketHours as any)[exchange.name];
              const holidays = exInfo?.holidays || {};
              let localNow = new Date(now.toLocaleString("en-US", { timeZone: exchange.timezone }));
              let day = localNow.getDay(); // 0 = Sonntag, 6 = Samstag
              let dateStr = localNow.toISOString().slice(0, 10);
              let openTime = exchange.openTime;
              let closeTime = exchange.closeTime;
              // Feiertag heute?
              if (holidays[dateStr]) {
                if (!holidays[dateStr].closeEarly) {
                  // Komplett geschlossen, nächste Öffnung suchen
                  let nextOpen = new Date(localNow);
                  let addDays = 1;
                  while (true) {
                    nextOpen.setDate(nextOpen.getDate() + addDays);
                    let nextDay = nextOpen.getDay();
                    let nextDateStr = nextOpen.toISOString().slice(0, 10);
                    if ((nextDay !== 0 && nextDay !== 6) && (!holidays[nextDateStr] || holidays[nextDateStr].closeEarly)) {
                      break;
                    }
                    addDays = 1;
                  }
                  openTime = exchange.openTime;
                  if (holidays[nextOpen.toISOString().slice(0, 10)]?.closeEarly && holidays[nextOpen.toISOString().slice(0, 10)]?.earlyCloseTime) {
                    closeTime = holidays[nextOpen.toISOString().slice(0, 10)].earlyCloseTime;
                  } else {
                    closeTime = exchange.closeTime;
                  }
                  const open = new Date(nextOpen);
                  const [openHour, openMinute] = openTime.split(":").map(Number);
                  open.setHours(openHour, openMinute, 0, 0);
                  let timeLeft = (open.getTime() - localNow.getTime()) / 1000;
                  let timeLeftLabel = "Opens in:";
                  let progress = 0;
                  let hours = Math.floor(timeLeft / 3600);
                  let minutes = Math.floor((timeLeft % 3600) / 60);
                  let currentTime = exchange.localTime || "";
                  return (
                    <div
                      key={exchange.name}
                      onClick={() => toggleFavorite(exchange.name)}
                      className={`relative flex flex-col items-center rounded-2xl px-5 py-5 min-w-[210px] max-w-[260px] mx-auto cursor-pointer transition-all duration-200 border-2
                        ${favorites.includes(exchange.name)
                          ? (theme === 'dark' ? 'border-white' : 'border-red-500')
                          : 'border-gray-300 dark:border-[#23232a] hover:border-gray-400 dark:hover:border-white'}
                        bg-white dark:bg-[#18181c] shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-lg
                      `}
                    >
                      <div className="absolute top-2 left-3 text-[11px] text-gray-800 dark:text-gray-400 font-semibold select-none pointer-events-none">
                        {exchange.city}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 items-center select-none pointer-events-none">
                        <span className="bg-red-600 dark:bg-red-700 text-white rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">CLOSED</span>
                      </div>
                      <div className="h-5" />
                      <div className="text-lg font-extrabold text-gray-900 dark:text-white tracking-widest mb-1 flex items-center gap-2">
                        {exchange.name}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-300 mb-2">
                        Open: <span className="font-bold text-gray-700 dark:text-gray-100">{openTime}</span> - Close: <span className="font-bold text-gray-700 dark:text-gray-100">{closeTime}</span>
                      </div>
                      <div className="text-base font-mono font-bold text-gray-500 dark:text-gray-300 mb-2 tracking-widest">
                        {currentTime}
                      </div>
                      <div className="flex justify-between w-full text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                        <span>{timeLeftLabel}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{hours > 0 ? `${hours}h ` : ''}{minutes}m</span>
                      </div>
                      <div className="w-full h-2 bg-gray-300 dark:bg-[#23232a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        ></div>
                      </div>
                      {/* Hinweistext entfernt */}
                    </div>
                  );
                }
                // Verkürzter Tag: closeTime anpassen
                if (holidays[dateStr].closeEarly && holidays[dateStr].earlyCloseTime) {
                  closeTime = holidays[dateStr].earlyCloseTime;
                }
              }
              // Wochenende prüfen
              if (day === 0 || day === 6) {
                // Nächste Öffnung am nächsten Werktag, der kein Feiertag ist
                let nextOpen = new Date(localNow);
                let addDays = 1;
                while (true) {
                  nextOpen.setDate(nextOpen.getDate() + addDays);
                  let nextDay = nextOpen.getDay();
                  let nextDateStr = nextOpen.toISOString().slice(0, 10);
                  if ((nextDay !== 0 && nextDay !== 6) && (!holidays[nextDateStr] || holidays[nextDateStr].closeEarly)) {
                    break;
                  }
                  addDays = 1;
                }
                openTime = exchange.openTime;
                if (holidays[nextOpen.toISOString().slice(0, 10)]?.closeEarly && holidays[nextOpen.toISOString().slice(0, 10)]?.earlyCloseTime) {
                  closeTime = holidays[nextOpen.toISOString().slice(0, 10)].earlyCloseTime;
                } else {
                  closeTime = exchange.closeTime;
                }
                const open = new Date(nextOpen);
                const [openHour, openMinute] = openTime.split(":").map(Number);
                open.setHours(openHour, openMinute, 0, 0);
                let timeLeft = (open.getTime() - localNow.getTime()) / 1000;
                let timeLeftLabel = "Opens in:";
                let progress = 0;
                let hours = Math.floor(timeLeft / 3600);
                let minutes = Math.floor((timeLeft % 3600) / 60);
                let currentTime = exchange.localTime || "";
                return (
                  <div
                    key={exchange.name}
                    onClick={() => toggleFavorite(exchange.name)}
                    className={`relative flex flex-col items-center rounded-2xl px-5 py-5 min-w-[210px] max-w-[260px] mx-auto cursor-pointer transition-all duration-200 border-2
                      ${favorites.includes(exchange.name)
                        ? (theme === 'dark' ? 'border-white' : 'border-red-500')
                        : 'border-gray-300 dark:border-[#23232a] hover:border-gray-400 dark:hover:border-white'}
                      bg-white dark:bg-[#18181c] shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-lg
                    `}
                  >
                    <div className="absolute top-2 left-3 text-[11px] text-gray-800 dark:text-gray-400 font-semibold select-none pointer-events-none">
                      {exchange.city}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 items-center select-none pointer-events-none">
                      <span className="bg-red-600 dark:bg-red-700 text-white rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">CLOSED</span>
                    </div>
                    <div className="h-5" />
                    <div className="text-lg font-extrabold text-gray-900 dark:text-white tracking-widest mb-1 flex items-center gap-2">
                      {exchange.name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-300 mb-2">
                      Open: <span className="font-bold text-gray-700 dark:text-gray-100">{openTime}</span> - Close: <span className="font-bold text-gray-700 dark:text-gray-100">{closeTime}</span>
                    </div>
                    <div className="text-base font-mono font-bold text-gray-500 dark:text-gray-300 mb-2 tracking-widest">
                      {currentTime}
                    </div>
                    <div className="flex justify-between w-full text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                      <span>{timeLeftLabel}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{hours > 0 ? `${hours}h ` : ''}{minutes}m</span>
                    </div>
                    <div className="w-full h-2 bg-gray-300 dark:bg-[#23232a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      ></div>
                    </div>
                    {/* Hinweistext entfernt */}
                  </div>
                );
              }
              // Regulärer Tag, ggf. verkürzt
              if (holidays[dateStr] && holidays[dateStr].closeEarly && holidays[dateStr].earlyCloseTime) {
                closeTime = holidays[dateStr].earlyCloseTime;
              }
              const [openHour, openMinute] = openTime.split(":").map(Number);
              const [closeHour, closeMinute] = closeTime.split(":").map(Number);
              const open = new Date(localNow);
              open.setHours(openHour, openMinute, 0, 0);
              const close = new Date(localNow);
              close.setHours(closeHour, closeMinute, 0, 0);
              let timeLeft = 0;
              let timeLeftLabel = "";
              let progress = 0;
              if (exchange.isOpen) {
                timeLeft = (close.getTime() - localNow.getTime()) / 1000;
                timeLeftLabel = "Time Left:";
                progress = 1 - (close.getTime() - localNow.getTime()) / (close.getTime() - open.getTime());
              } else if (localNow < open) {
                timeLeft = (open.getTime() - localNow.getTime()) / 1000;
                timeLeftLabel = "Opens in:";
                progress = 0;
              } else {
                // Nach Börsenschluss, nächste Öffnung suchen
                let nextOpen = new Date(open);
                let addDays = 1;
                while (true) {
                  nextOpen.setDate(nextOpen.getDate() + addDays);
                  let nextDay = nextOpen.getDay();
                  let nextDateStr = nextOpen.toISOString().slice(0, 10);
                  if ((nextDay !== 0 && nextDay !== 6) && (!holidays[nextDateStr] || holidays[nextDateStr].closeEarly)) {
                    break;
                  }
                  addDays = 1;
                }
                openTime = exchange.openTime;
                if (holidays[nextOpen.toISOString().slice(0, 10)]?.closeEarly && holidays[nextOpen.toISOString().slice(0, 10)]?.earlyCloseTime) {
                  closeTime = holidays[nextOpen.toISOString().slice(0, 10)].earlyCloseTime;
                } else {
                  closeTime = exchange.closeTime;
                }
                const openNext = new Date(nextOpen);
                const [openHourNext, openMinuteNext] = openTime.split(":").map(Number);
                openNext.setHours(openHourNext, openMinuteNext, 0, 0);
                timeLeft = (openNext.getTime() - localNow.getTime()) / 1000;
                timeLeftLabel = "Opens in:";
                progress = 0;
              }
              let hours = Math.floor(timeLeft / 3600);
              let minutes = Math.floor((timeLeft % 3600) / 60);
              let currentTime = exchange.localTime || "";
              return (
                <div
                  key={exchange.name}
                  onClick={() => toggleFavorite(exchange.name)}
                  className={`relative flex flex-col items-center rounded-2xl px-5 py-5 min-w-[210px] max-w-[260px] mx-auto cursor-pointer transition-all duration-200 border-2
                    ${favorites.includes(exchange.name)
                      ? (theme === 'dark' ? 'border-white' : 'border-red-500')
                      : 'border-gray-300 dark:border-[#23232a] hover:border-gray-400 dark:hover:border-white'}
                    bg-white dark:bg-[#18181c] shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-lg
                  `}
                >
                  <div className="absolute top-2 left-3 text-[11px] text-gray-800 dark:text-gray-400 font-semibold select-none pointer-events-none">
                    {exchange.city}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 items-center select-none pointer-events-none">
                    {exchange.isOpen ? (
                      <span className="bg-green-600 dark:bg-green-700 text-white rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">OPEN</span>
                    ) : (
                      <span className="bg-red-600 dark:bg-red-700 text-white rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">CLOSED</span>
                    )}
                  </div>
                  <div className="h-5" />
                  <div className="text-lg font-extrabold text-gray-900 dark:text-white tracking-widest mb-1 flex items-center gap-2">
                    {exchange.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-300 mb-2">
                    Open: <span className="font-bold text-gray-700 dark:text-gray-100">{exchange.openTime}</span> - Close: <span className="font-bold text-gray-700 dark:text-gray-100">{exchange.closeTime}</span>
                  </div>
                  <div className="text-base font-mono font-bold text-gray-500 dark:text-gray-300 mb-2 tracking-widest">
                    {currentTime}
                  </div>
                  <div className="flex justify-between w-full text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>{timeLeftLabel}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{hours > 0 ? `${hours}h ` : ''}{minutes}m</span>
                  </div>
                  <div className="w-full h-2 bg-gray-300 dark:bg-[#23232a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
}
