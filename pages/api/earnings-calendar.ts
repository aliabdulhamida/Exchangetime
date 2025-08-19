// This API route scrapes earnings calendar data from MarketBeat and caches it in memory.
// It refreshes every 6 hours. You can adjust the source or schedule as needed.
import type { NextApiRequest, NextApiResponse } from 'next';
// No need for cheerio or puppeteer; use Nasdaq's public API

let cachedData: Record<string, any[]> = {};
let lastFetch = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function fetchEarningsCalendar(): Promise<Record<string, any[]>> {
  // Fetch earnings data from Finnhub's API using provided API key
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const from = weekStart.toISOString().split('T')[0];
  const to = weekEnd.toISOString().split('T')[0];
  const apiKey = process.env.FINNHUB_API_KEY;
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`;
  const data: Record<string, any[]> = {};
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error(`Error fetching ${url}: Status ${res.status} - ${text}`);
      return {};
    }
    const json = await res.json();
    const earnings = json.earningsCalendar || [];
    // Group by date
    for (const row of earnings) {
      const dateStr = row.date;
      if (!data[dateStr]) data[dateStr] = [];
      data[dateStr].push({
        date: row.date,
        epsActual: row.epsActual ?? null,
        epsEstimate: row.epsEstimate ?? null,
        hour: row.hour ?? '',
        quarter: row.quarter ?? null,
        revenueActual: row.revenueActual ?? null,
        revenueEstimate: row.revenueEstimate ?? null,
        symbol: row.symbol ?? '',
        year: row.year ?? null,
      });
    }
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    return {};
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
