import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('et-appearance', 'dark'));
    for (const view of ['ExchangeTimes', 'MarketScreener', 'AssetComparison', 'LoanPlanner']) {
      await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=' + view, {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => document.querySelector('.terminal-workspace') && !document.querySelector('.workspace-loading'));
      assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false, view);
      await page.screenshot({path: '/tmp/refined-' + view + '-' + width + '.png'});
    }
    await context.close();
    console.log(width + 'px: refined dark surfaces passed');
  }
} finally { await browser.close(); }
