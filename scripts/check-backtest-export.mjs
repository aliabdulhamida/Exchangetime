import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().includes('/api/quote')) return request.continue();
      return request.respond({status: 200, contentType: 'application/json', body: JSON.stringify({chart: {result: [{
        meta: {currency: 'USD'}, timestamp: Array.from({length: 60}, (_, index) => 1577836800 + index * 86400),
        indicators: {quote: [{close: Array.from({length: 60}, (_, index) => 100 + index)}]}, events: {dividends: {}},
      }]}})});
    });
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=BacktestTool');
    await page.waitForSelector('.backtest-workspace');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(node => node.textContent.includes('Run Backtest')));
    await page.$$eval('button', nodes => nodes.find(node => node.textContent.trim() === 'Run Backtest').click());
    await page.waitForSelector('.backtest-observations');
    await page.click('.backtest-observations summary');
    assert.equal(await page.$$eval('.backtest-observations tbody tr', nodes => nodes.length), 50);
    await page.$$eval('.backtest-observations button', nodes => nodes.find(node => node.textContent.includes('older')).click());
    assert.equal(await page.$$eval('.backtest-observations tbody tr', nodes => nodes.length), 60);
    assert.match(await page.$eval('.backtest-observations', node => node.textContent), /Not live portfolio values/);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: backtest simulation, observation paging and export access passed');
  }
} finally { await browser.close(); }
