import type { NextApiRequest, NextApiResponse } from 'next';

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const DEFAULT_TIMEOUT_MS = 12000;

function parseTicker(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const normalized = raw.trim().toUpperCase();
	if (!normalized || !SYMBOL_PATTERN.test(normalized)) return null;
	return normalized;
}

function parseDateToUnix(value: unknown): number | null {
	if (typeof value !== 'string' || !value.trim()) return null;
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) return null;
	return Math.floor(timestamp / 1000);
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs = DEFAULT_TIMEOUT_MS,
) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET');
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const ticker = parseTicker(req.query.ticker);
	if (!ticker) {
		return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
	}

	try {
		const fromTs = parseDateToUnix(req.query.from);
		const toTs = parseDateToUnix(req.query.to);
		const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
			ticker,
		)}&quotesCount=0&newsCount=20&enableFuzzyQuery=false`;

		const response = await fetchWithTimeout(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Exchangetime/1.0)',
				Accept: 'application/json, text/plain, */*',
				Referer: 'https://finance.yahoo.com/',
			},
			cache: 'no-store',
		});
		if (!response.ok) {
			console.error('Yahoo news API error:', response.status);
			return res.status(200).json([]); // Return empty array instead of error
		}

		const data = await response.json();
		const articles = Array.isArray(data?.news) ? data.news : [];

		const transformed = articles
			.map((item: any) => {
				const ts = Number(item?.providerPublishTime) || Math.floor(Date.now() / 1000);
				return {
					id: item?.uuid || item?.link || `${ticker}-${ts}`,
					headline: item?.title || '',
					source: item?.publisher || 'Yahoo Finance',
					url: item?.link || '',
					datetime: ts,
					image: item?.thumbnail?.resolutions?.[0]?.url || '',
					summary: item?.summary || item?.title || '',
					category: item?.type || 'General',
				};
			})
			.filter((item: any) => {
				if (fromTs !== null && item.datetime < fromTs) return false;
				if (toTs !== null && item.datetime > toTs + 86399) return false;
				return true;
			});

		res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=900');
		res.status(200).json(transformed);
	} catch (err: any) {
		console.error('News fetch error:', err);
		// Return empty array instead of error to prevent UI breakage
		res.status(200).json([]);
	}
}
