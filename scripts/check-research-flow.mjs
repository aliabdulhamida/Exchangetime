import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=StockAnalysis&symbol=AAPL', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.research-price-history', { timeout: 60000 });
    assert.equal(await page.$eval('.research-price-history', node => getComputedStyle(node).order), '-1');
    assert.equal(await page.$eval('.research-score-details', node => node.open), false);
    assert.equal(await page.$eval('.research-actions', node => node.open), false);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await page.click('.research-actions summary');
    assert.ok((await page.$eval('nav[aria-label="Asset tools"] a', node => node.href)).includes('symbol=AAPL'));
    await page.screenshot({ path: '/tmp/research-refined-' + width + '.png' });
    await page.close();
    console.log(width + 'px: real AAPL research, chart priority, collapsed details and symbol handoff passed');
  }
} finally { await browser.close(); }
