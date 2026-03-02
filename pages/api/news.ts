import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { ticker } = req.query;
	if (!ticker || typeof ticker !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid ticker parameter' });
	}

	const apiKey = process.env.FMP_API_KEY;
	if (!apiKey) {
		return res.status(500).json({ error: 'FMP API key not configured' });
	}

	try {
		// Use FMP API for news
		const url = `https://financialmodelingprep.com/api/v4/fmp/articles?search=${encodeURIComponent(ticker)}&limit=20&apikey=${apiKey}`;
		
		const response = await fetch(url);
		if (!response.ok) {
			console.error('FMP API error:', response.status);
			return res.status(200).json([]); // Return empty array instead of error
		}
		
		const data = await response.json();
		const articles = Array.isArray(data) ? data : [];
		
		// Transform FMP format to standard format
		const transformed = articles.map((item: any) => ({
			id: item.link || '',
			headline: item.title || '',
			source: item.site || 'FMP',
			url: item.link || '',
			datetime: item.publishedDate ? new Date(item.publishedDate).getTime() : Date.now(),
			image: item.image || '',
			summary: item.text || '',
			category: 'General'
		}));
		
		res.status(200).json(transformed);
	} catch (err: any) {
		console.error('News fetch error:', err);
		// Return empty array instead of error to prevent UI breakage
		res.status(200).json([]);
	}
}
