import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const live = process.env.LIVE_MARKET_PULSE === '1';
try {
  for (const width of live ? [390] : [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    if (!live) {
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname !== '/api/quote') return request.continue();
        const vix = url.searchParams.get('symbol') === '^VIX';
        const count = vix ? 61 : 60;
        return request.respond({status: 200, contentType: 'application/json', body: JSON.stringify({chart: {result: [{
          timestamp: Array.from({length: count}, (_, index) => 1789473600 + index * 86400),
          indicators: {quote: [{close: Array.from({length: count}, (_, index) => vix ? 18 : 100 + index)}]},
          meta: {currency: 'USD'},
        }]}})});
      });
    }
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=MarketOverview');
    await page.waitForFunction(() => {
      const text = document.querySelector('.market-pulse-score strong')?.textContent;
      return text && !text.includes('—');
    }, {timeout: 60000});
    const score = await page.$eval('.market-pulse-score strong', node => node.textContent);
    assert.match(score, /\d+\/100/);
    assert.ok(await page.$eval('.market-pulse', node => node.textContent.includes('As of')));
    if (!live) assert.equal(score, '100/100');
    console.log((live ? 'Live feeds' : width + 'px staggered-date fixture') + ': Market pulse loaded ' + score);
    await context.close();
  }
} finally { await browser.close(); }
