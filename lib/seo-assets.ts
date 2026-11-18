export const SITE_URL = 'https://www.exchangetime.de';

export const seoAssets = [
  {slug: 'eur-usd', symbol: 'EURUSD=X', name: 'EUR/USD', kind: 'Currency pair',
    description: 'The euro to US dollar exchange rate, with reported prices, daily history and exchange-rate context.',
    overview: 'EUR/USD expresses how many US dollars buy one euro. A rising rate means the euro has strengthened against the dollar; a falling rate means the opposite.',
    drivers: 'Relative European Central Bank and Federal Reserve policy, inflation releases and differences in growth expectations can affect this pair. There is no single centralized spot-FX exchange.',
    question: 'How do I interpret EUR/USD?', answer: 'The first currency is the base and the second is the quote currency. Multiply an amount in euros by the quoted rate to express it in dollars before fees and spreads.'},
  {slug: 'gbp-usd', symbol: 'GBPUSD=X', name: 'GBP/USD', kind: 'Currency pair',
    description: 'The British pound to US dollar exchange rate, daily price history and context on sterling market drivers.',
    overview: 'GBP/USD quotes the US dollar value of one British pound. It is commonly called cable and is used to compare sterling with the dollar.',
    drivers: 'Bank of England and Federal Reserve decisions, UK inflation and employment releases can change interest-rate expectations. A reference quote does not include a bank or broker conversion spread.',
    question: 'Is the GBP/USD quote my currency-conversion rate?', answer: 'Not necessarily. A market reference quote is different from an executable retail conversion rate, which can include fees, spreads and a different observation time.'},
  {slug: 'bitcoin', symbol: 'BTC-USD', name: 'Bitcoin', kind: 'Cryptocurrency',
    description: 'Bitcoin in US dollars: reported price, daily history and context on crypto-market risks and trading hours.',
    overview: 'BTC/USD expresses the dollar price of bitcoin. Bitcoin is a digital asset whose transactions are recorded on a public blockchain rather than issued by a central bank.',
    drivers: 'Liquidity, risk appetite, regulation and flows into investment products can influence bitcoin. Crypto venues trade around the clock, and prices can differ between venues.',
    question: 'Does bitcoin have stock-exchange opening hours?', answer: 'Bitcoin spot markets generally operate seven days a week. Individual venues can pause trading or withdrawals, and daily chart boundaries follow the data provider rather than a universal exchange close.'},
  {slug: 'sp-500', symbol: '^GSPC', name: 'S&P 500', kind: 'Equity index',
    description: 'S&P 500 index levels, daily history and context on the large-cap US equity benchmark.',
    overview: 'The S&P 500 tracks a broad group of large US-listed companies. Its index level is quoted in points and is not the price of a directly tradable share.',
    drivers: 'Corporate earnings, interest-rate expectations and changes in the largest constituents can move the index. A price index does not represent a dividend-reinvested total return.',
    question: 'Can I buy the S&P 500 index itself?', answer: 'The index is a benchmark, not a security. Funds and derivatives can track it, but their fees, tracking differences and risks are separate from the index level shown here.'},
  {slug: 'apple', symbol: 'AAPL', name: 'Apple', kind: 'Stock',
    description: 'Apple (AAPL) share-price history, reported market data and context for researching its business and earnings.',
    overview: 'Apple designs consumer hardware, software and services. AAPL represents its common shares listed on Nasdaq, rather than the price of any individual Apple product.',
    drivers: 'Device demand, services revenue, margins and earnings guidance can affect expectations for Apple. Supply-chain exposure and regulation are also relevant research topics.',
    question: 'Does a rising AAPL price mean Apple is fairly valued?', answer: 'No. Price performance and valuation answer different questions. Assess earnings, cash flow, balance-sheet strength and the assumptions behind any valuation, rather than inferring fair value from a chart.'},
  {slug: 'microsoft', symbol: 'MSFT', name: 'Microsoft', kind: 'Stock',
    description: 'Microsoft (MSFT) share-price history, reported market data and context on its cloud and software business.',
    overview: 'Microsoft provides business software, cloud infrastructure, operating systems and gaming products. MSFT is its Nasdaq-listed common stock.',
    drivers: 'Cloud demand, enterprise software spending, capital expenditure and operating margins are relevant to Microsoft research. AI-related investment can influence both revenue expectations and costs.',
    question: 'What should I compare with the MSFT price chart?', answer: 'Consider reported revenue, operating profit, cash flow, capital expenditure and management guidance. Share-price changes alone do not establish the profitability or investment return of a business initiative.'},
] as const;

export function findSeoAsset(slug: string) {
  return seoAssets.find(asset => asset.slug === slug);
}

export function assetPageUrl(symbol: string) {
  const asset = seoAssets.find(item => item.symbol === symbol);
  return asset ? '/dashboard/' + asset.slug : null;
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
