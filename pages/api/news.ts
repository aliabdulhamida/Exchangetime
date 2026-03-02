import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { ticker } = req.query;
	if (!ticker || typeof ticker !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
	}

	try {
		const from = typeof req.query.from === 'string' ? req.query.from : '';
		const to = typeof req.query.to === 'string' ? req.query.to : '';
		const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : null;
		const toTs = to ? Math.floor(new Date(to).getTime() / 1000) : null;
		const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
			ticker,
		)}&quotesCount=0&newsCount=20&enableFuzzyQuery=false`;

		const response = await fetch(url, {
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

		res.status(200).json(transformed);
	} catch (err: any) {
		console.error('News fetch error:', err);
		// Return empty array instead of error to prevent UI breakage
		res.status(200).json([]);
	}
}
