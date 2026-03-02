import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { ticker } = req.query;
	if (!ticker || typeof ticker !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
	}

	try {
		// Use Yahoo Finance news via CORS proxy
		const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=news`;
		const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`;
		
		const response = await fetch(proxyUrl);
		if (!response.ok) {
			console.error('Yahoo Finance API error:', response.status);
			return res.status(200).json([]); // Return empty array instead of error
		}
		
		const data = await response.json();
		const news = data?.quoteSummary?.result?.[0]?.news || [];
		
		// Transform Yahoo news format to match expected format
		const transformed = news.map((item: any) => ({
			id: item.uuid || '',
			headline: item.title || '',
			source: item.publisher || 'Yahoo Finance',
			url: item.link || '',
			datetime: item.providerPublishTime ? item.providerPublishTime * 1000 : Date.now(),
			image: item.thumbnail?.resolutions?.[0]?.url || '',
			summary: item.summary || '',
			category: 'General'
		}));
		
		res.status(200).json(transformed);
	} catch (err: any) {
		console.error('News fetch error:', err);
		// Return empty array instead of error to prevent UI breakage
		res.status(200).json([]);
	}
}
