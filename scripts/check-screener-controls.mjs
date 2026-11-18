import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
const rows = ['AAA', 'BBB'].map((symbol, index) => ({symbol, name: 'Test company ' + symbol,
  price: 10, currency: 'USD', change: index ? -1 : 1, changePercent: index ? -10 : 10,
  volume: index ? 10000 : 2000000, averageVolume: 1000000, marketCap: null,
  trailingPE: index ? 30 : 10, forwardPE: null, priceToBook: null, twoHundredDayAverage: 9,
  exchange: 'TEST', regularMarketTime: 1704067200}));
const list = {title: 'Test list', asOf: 1704067200, rows};
const payload = {source: 'yahoo', fetchedAt: '2024-01-01T00:00:00Z',
  lists: {gainers: list, losers: list, movers: list, mostActive: list}};
const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    let fail = false;
    await page.setViewport({width, height: 900});
    await page.setRequestInterception(true);
    page.on('request', request => request.url().includes('/api/market-screener')
      ? request.respond({status: fail ? 503 : 200, contentType: 'application/json', body: JSON.stringify(fail ? {error: 'Fixture unavailable'} : payload)})
      : request.continue());
    await page.goto(base + '/dashboard?view=MarketScreener', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('.screen-result-heading')?.textContent.includes('2 of 2'));
    await page.click('.screen-filters summary');
    await page.type('.screen-fields input', '20');
    await page.waitForFunction(() => document.querySelector('.screen-result-heading')?.textContent.includes('1 of 2'));
    await page.click('[aria-label="Remove filter: Trailing P/E ≤ 20"]');
    await page.waitForFunction(() => document.querySelector('.screen-result-heading')?.textContent.includes('2 of 2'));
    await page.type('[aria-label="Filter by symbol or company"]', 'AAA');
    await page.click('.screen-saved summary');
    await page.type('[aria-label="Screen name"]', 'My screen');
    await page.click('.screen-saved button[type=submit]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et.screens.v1')).length === 1);
    await page.click('.screen-active-filters .screen-clear');
    await page.click('.screen-saved > div > button:first-child');
    assert.equal(await page.$eval('[aria-label="Filter by symbol or company"]', input => input.value), 'AAA');
    page.once('dialog', dialog => dialog.dismiss());
    await page.click('[aria-label="Remove My screen"]');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('et.screens.v1')).length), 1);
    fail = true;
    await page.click('[aria-label="Refresh screener"]');
    await page.waitForFunction(() => document.querySelector('.screener-workspace')?.textContent.includes('Showing the last successful snapshot'));
    assert.equal(await page.$eval('.screen-result-heading', element => element.textContent.includes('1 of 2')), true);
    await page.evaluate(() => {
      localStorage.setItem('et.screens.v1', '[]');
      window.dispatchEvent(new StorageEvent('storage', {key: 'et.screens.v1', newValue: '[]'}));
    });
    await page.waitForSelector('.record-error');
    assert.equal(await page.$eval('.screen-saved button[type=submit]', button => button.disabled), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('et.screens.v1')), '[]');
    assert.equal(await page.$eval('main', main => main.scrollWidth > main.clientWidth + 1), false);
    await page.screenshot({path: '/tmp/screener-controls-' + width + '.png'});
    await context.close();
    console.log(width + 'px: chips, saved screens, deletion cancellation, stale data and tab conflict passed');
  }
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem('et.screens.v1', '{broken'));
  await page.goto(base + '/dashboard?view=MarketScreener', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.record-error');
  assert.equal(await page.evaluate(() => localStorage.getItem('et.screens.v1')), '{broken');
  assert.equal(await page.$eval('.screen-saved button[type=submit]', button => button.disabled), true);
  await context.close();
  console.log('Unreadable saved screens retained without overwriting');
} finally { await browser.close(); }
