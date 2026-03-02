// This API route provides earnings calendar data using free public sources
import type { NextApiRequest, NextApiResponse } from 'next';

let cachedData: Record<string, any[]> = {};
let lastFetch = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function fetchEarningsCalendar(): Promise<Record<string, any[]>> {
  // Try to fetch from a free earnings API or return empty data
  // For now, returning empty as most free APIs require signup or have limitations
  const data: Record<string, any[]> = {};
  
  try {
    // Attempt to fetch from alternative free source (trading-view data endpoint)
    // This endpoint is rate-limited but works without authentication
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    // Return empty data structure - can be enhanced later with Yahoo Calendar scraping
    return data;
  } catch (err) {
    console.error('Fetch failed for earnings calendar:', err);
    return {};
  }
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
