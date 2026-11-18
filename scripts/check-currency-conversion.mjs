import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    let failed = false;
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().includes('/api/quote')) return request.continue();
      return request.respond({status: failed ? 503 : 200, contentType: 'application/json', body: JSON.stringify({
        chart: {result: [{meta: {regularMarketPrice: 1.25, regularMarketTime: 1704067200}}]},
      })});
    });
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=CurrencyConverter');
    await page.waitForSelector('#currency-amount');
    await page.type('#currency-amount', '1,000.00');
    await page.click('button[type=submit]');
    await page.waitForSelector('.currency-result');
    assert.match(await page.$eval('.currency-result', node => node.textContent), /1,250/);
    failed = true;
    await page.click('button[type=submit]');
    await page.waitForFunction(() => document.querySelector('.currency-result')?.textContent.includes('Stale'));
    assert.match(await page.$eval('.currency-result', node => node.textContent), /1,250/);
    await page.select('#to-currency', 'JPY');
    await page.waitForSelector('.currency-result', {hidden: true});
    failed = false;
    await page.click('button[type=submit]');
    await page.waitForSelector('.currency-result');
    assert.match(await page.$eval('.currency-result > p:nth-child(2)', node => node.textContent), /1,250(?!\.)/);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: currency result, stale recovery and currency precision passed');
  }
} finally { await browser.close(); }
