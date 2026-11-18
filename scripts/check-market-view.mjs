import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.goto(base + '/dashboard?view=MarketOverview&market=%5EGDAXI&region=Europe&period=21');
    await page.waitForFunction(() => document.querySelector('[aria-label="Chart time range"] button:nth-child(2)')?.getAttribute('aria-pressed') === 'true');
    assert.equal(await page.$eval('[aria-label="Market region"]', node => node.value ?? node.querySelector('[aria-pressed=true]')?.textContent), 'Europe');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et.market-view.v1'))?.selected === '^GDAXI');
    await page.goto(base + '/dashboard?view=LoanPlanner');
    await page.waitForSelector('.planner-fields');
    await page.goto(base + '/dashboard?view=MarketOverview');
    await page.waitForFunction(() => document.querySelector('[aria-label="Chart time range"] button:nth-child(2)')?.getAttribute('aria-pressed') === 'true');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('et.market-view.v1')).region), 'Europe');
    await page.click('[aria-label="Copy market-view link"]');
    await page.waitForSelector('.market-share-notice');
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: deep link, remembered market selection and sharing passed');
  }
} finally { await browser.close(); }
