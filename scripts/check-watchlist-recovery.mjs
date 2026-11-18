import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.setRequestInterception(true);
    page.on('request', request => request.url().includes('/api/') ?
      request.respond({status: 503, body: '{}'}) : request.continue());
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=LoanPlanner');
    await page.waitForSelector('.planner-fields');
    await page.evaluate(() => {
      localStorage.setItem('et_watchlists', JSON.stringify([{id: 'test', title: 'Test list', items: [{ticker: 'AAA'}, {ticker: 'BBB'}]}]));
      window.dispatchEvent(new Event('et-watchlist'));
    });
    await page.waitForSelector('[aria-label="Delete AAA"]');
    await page.click('[aria-label="Delete AAA"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et_watchlists'))[0].items.length === 1);
    await page.click('.watchlist-undo button');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et_watchlists'))[0].items[0].ticker === 'AAA');
    await page.evaluate(() => localStorage.setItem('et_watchlists', '{broken'));
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.planner-fields');
    await page.evaluate(() => window.dispatchEvent(new Event('et-watchlist')));
    await page.waitForSelector('.watchlist-panel .record-error');
    assert.equal(await page.evaluate(() => localStorage.getItem('et_watchlists')), '{broken');
    assert.equal(await page.$eval('.watchlist-panel', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: watchlist undo restores order and unreadable lists are preserved');
  }
} finally { await browser.close(); }
