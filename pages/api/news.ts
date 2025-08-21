import type { NextApiRequest, NextApiResponse } from 'next';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { ticker } = req.query;
	if (!ticker || typeof ticker !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
	}
	// Calculate date range for last 7 days
	const today = new Date();
	const to = today.toISOString().slice(0, 10);
	const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const from = fromDate.toISOString().slice(0, 10);

	const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			const errorText = await response.text();
			console.error('Finnhub API error:', errorText);
			return res.status(500).json({ error: 'Finnhub API error', details: errorText });
		}
		const data = await response.json();
		res.status(200).json(data);
	} catch (err: any) {
		console.error('Fetch error:', err);
		res.status(500).json({ error: err.message || 'Unknown error', details: err });
	}
}
