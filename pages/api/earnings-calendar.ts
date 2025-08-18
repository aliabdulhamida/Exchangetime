// This API route scrapes earnings calendar data from MarketBeat and caches it in memory.
// It refreshes every 6 hours. You can adjust the source or schedule as needed.
import type { NextApiRequest, NextApiResponse } from 'next';
// No need for cheerio or puppeteer; use Nasdaq's public API

let cachedData: Record<string, any[]> = {};
let lastFetch = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function fetchEarningsCalendar(): Promise<Record<string, any[]>> {
  // Fetch earnings data from Nasdaq's public API
  // Example endpoint: https://api.nasdaq.com/api/calendar/earnings?date=2025-08-18
  // We'll fetch for the current week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const data: Record<string, any[]> = {};

  for (const dateObj of weekDates) {
    const dateStr = dateObj.toISOString().split('T')[0];
    const url = `https://corsproxy.io/?https://api.nasdaq.com/api/calendar/earnings?date=${dateStr}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
        Origin: 'https://www.nasdaq.com',
        Referer: 'https://www.nasdaq.com/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const json = await res.json();
    const rows = json?.data?.rows || [];
    data[dateStr] = rows.map((row: any) => {
      let release_time = row.time;
      if (release_time && typeof release_time === 'string') {
        if (/^time-after-hours$/i.test(release_time)) {
          release_time = 'After Hours';
        } else if (/^time-pre[- ]market$/i.test(release_time)) {
          release_time = 'Pre Market';
        } else if (/^time-not-supplied$/i.test(release_time)) {
          release_time = 'Not Supplied';
        } else {
          release_time = release_time.replace(/-/g, ' ');
          release_time = release_time.charAt(0).toUpperCase() + release_time.slice(1);
        }
      }
      return {
        ticker: row.symbol,
        company_name: row.name || row.company,
        release_time,
        marketCap: row.marketCap,
        fiscalQuarterEnding: row.fiscalQuarterEnding,
        epsForecast: row.epsForecast,
        noOfEsts: row.noOfEsts,
        lastYearRptDt: row.lastYearRptDt,
        lastYearEPS: row.lastYearEPS,
      };
    });
  }
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now();
  if (now - lastFetch < CACHE_DURATION && Object.keys(cachedData).length > 0) {
    res.status(200).json(cachedData);
    return;
  }
  try {
    const data = await fetchEarningsCalendar();
    cachedData = data;
    lastFetch = now;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch earnings calendar' });
  }
}
