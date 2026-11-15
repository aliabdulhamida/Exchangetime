import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async text => { window.copiedResearchLink = text; } },
      });
    });
    let newsRequest;
    let quoteRequests = 0;
    let newsRequests = 0;
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return void request.continue();
      let payload = {};
      if (url.pathname === '/api/news') {
        if (++newsRequests === 1) { newsRequest = request; return; }
        payload = [];
      }
      if (url.pathname === '/api/insider-trades') payload = { trades: [] };
      const ticker = url.searchParams.get('symbol');
      if (url.pathname === '/api/quote' && ['SAP.DE', 'AAPL'].includes(ticker)) {
        quoteRequests++;
        payload = { chart: { result: [{ meta: { currency: ticker === 'SAP.DE' ? 'EUR' : 'USD', regularMarketPrice: 102, shortName: ticker },
          timestamp: [1770000000, 1770100000], indicators: { quote: [{ close: [100, 102] }] } }] } };
      }
      void request.respond({ contentType: 'application/json', body: JSON.stringify(payload) });
    });
    const click = async label => {
      const button = await page.waitForFunction(text => [...document.querySelectorAll('button')]
        .find(element => element.offsetWidth && element.textContent.trim() === text), {}, label);
      await button.asElement().click();
    };
    await page.goto('http://localhost:3000/dashboard?view=StockAnalysis', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[aria-label="Research examples"]');
    await page.click('[aria-label="Research examples"] button:nth-child(2)');
    await page.waitForFunction(() => document.body.innerText.includes('Export CSV'));
    const before = quoteRequests;
    await click('3M');
    await page.waitForSelector('button[aria-pressed="true"]');
    assert.equal(quoteRequests, before);
    await click('News');
    await page.waitForFunction(() => document.body.innerText.includes('Loading news for SAP.DE'));
    await newsRequest.respond({ status: 502, body: '{}' });
    await click('Retry');
    await page.waitForFunction(() => document.body.innerText.includes('No recent news found for SAP.DE'));
    assert.equal(newsRequests, 2);
    assert.equal(quoteRequests, before);
    const waitForAsset = symbol => page.waitForFunction(expected =>
      new URL(location.href).searchParams.get('symbol') === expected &&
      document.querySelector('header h2')?.textContent.startsWith(expected), {}, symbol);
    await waitForAsset('SAP.DE');
    await click('Copy link');
    await page.waitForFunction(() => window.copiedResearchLink === location.href);
    const input = '[aria-label="Asset ticker"]';
    const submit = async value => {
      await page.click(input, { clickCount: 3 });
      await page.keyboard.type(value);
      await page.keyboard.press('Enter');
    };
    await submit('BAD!');
    await page.waitForSelector('#research-validation');
    await waitForAsset('SAP.DE');
    await submit('aapl');
    await waitForAsset('AAPL');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAsset('AAPL');
    await page.goBack();
    await waitForAsset('SAP.DE');
    await page.goBack();
    await page.waitForSelector('[aria-label="Research examples"]');
    await page.goForward();
    await waitForAsset('SAP.DE');
    await page.close();
    console.log(width + 'px: feeds, range, sharing, validation, reload and navigation passed.');
  }
} finally {
  await browser.close();
}
