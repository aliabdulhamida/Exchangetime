import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem(
        'et_watchlists',
        JSON.stringify([
          { id: 'test', title: 'Test', items: [{ ticker: 'BBB' }, { ticker: 'AAA' }] },
        ]),
      );
    });
    let failed = false;
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/market-screener') {
        const list = {
          title: 'Test list',
          asOf: 1704067200,
          rows: [
            {
              symbol: 'AAA',
              name: 'Test issuer A',
              price: 10,
              trailingPE: 5,
              currency: 'USD',
              volume: 2000000,
            },
            {
              symbol: 'BBB',
              name: 'Test issuer B',
              price: 20,
              trailingPE: 30,
              currency: 'USD',
              volume: 10000,
            },
          ],
        };
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fetchedAt: '2024-01-01T00:00:00Z',
            source: 'yahoo',
            lists: { gainers: list, losers: list, movers: list, mostActive: list },
          }),
        });
      }
      if (url.pathname !== '/api/quote') return request.continue();
      if (failed) return request.respond({ status: 503, body: '{}' });
      const step = url.searchParams.get('symbol') === 'AAA' ? 2 : 1;
      const prices = Array.from({ length: 30 }, (_, index) => 100 + index * step);
      const timestamp = prices.map((_, index) => 1704067200 + index * 86400);
      const body = url.searchParams.has('chart')
        ? {
            chart: {
              result: [
                {
                  timestamp,
                  meta: { currency: 'USD' },
                  indicators: { quote: [{ close: prices }] },
                },
              ],
            },
          }
        : {
            price: prices.at(-1),
            previousClose: 100,
            currency: 'USD',
            meta: { regularMarketTime: timestamp.at(-1) },
          };
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await page.goto(base + '/dashboard?view=AssetComparison&symbol=AAA');
    await page.waitForSelector('.compare-form');
    await page.type('.compare-form label:nth-child(2) input', 'BBB');
    await page.click('.compare-form button');
    await page.waitForSelector('.compare-results');
    assert.equal(new URL(page.url()).searchParams.get('against'), 'BBB');
    assert.match(await page.$eval('.compare-results', (node) => node.textContent), /\+58.00%/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.compare-results');
    await page.click('[aria-label="Comparison period"] button');
    assert.equal(await page.$$eval('.tool-table-scroll tbody tr', (nodes) => nodes.length), 6);
    assert.equal(
      await page.$eval(
        '.tool-table-scroll tbody tr:last-child td:nth-child(2)',
        (node) => node.textContent,
      ),
      '100.00',
    );
    await page.goto(base + '/dashboard?view=LoanPlanner');
    await page.waitForSelector('.planner-fields');
    const inputs = await page.$$('.planner-fields input');
    for (const [index, value] of ['1200', '0', '12', '100'].entries())
      await inputs[index].type(value);
    await page.click('.loan-schedule summary');
    assert.equal(
      await page.$eval('.loan-schedule tbody td:last-child', (node) => node.textContent),
      '0',
    );
    assert.match(await page.$eval('.planner-result', (node) => node.textContent), /6 months/);
    if (width === 1440) {
      await page.click('[aria-label="Open watchlist"]');
      await page.waitForFunction(() =>
        document.querySelector('.watchlist-row')?.textContent.includes('%'),
      );
      await page.select('[aria-label="Sort watchlist"]', 'change');
      assert.equal(await page.$eval('.watchlist-row a', (node) => node.textContent), 'AAA');
      failed = true;
      await page.click('[aria-label="Reload prices"]');
      await page.waitForFunction(() =>
        document.querySelector('.watchlist-row')?.textContent.includes('Stale'),
      );
      assert.match(await page.$eval('.watchlist-row', (node) => node.textContent), /%/);
      await page.select('[aria-label="Sort watchlist"]', 'ticker');
      await page.click('[aria-label="Delete AAA"]');
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('et_watchlists'))[0].items.length === 1,
      );
      assert.equal(await page.$eval('.watchlist-row a', (node) => node.textContent), 'BBB');
    }
    assert.equal(
      await page.$eval('main', (node) => node.scrollWidth > node.clientWidth + 1),
      false,
    );
    await page.goto(base + '/dashboard?view=MarketScreener');
    await page.waitForFunction(() =>
      document.querySelector('.screen-result-heading')?.textContent.includes('2 of 2'),
    );
    assert.equal(await page.$eval('.screen-filters', (node) => node.open), false);
    await page.click('.screen-filters summary');
    await page.type('.screen-fields input[type=number]', '10');
    await page.waitForFunction(() =>
      document.querySelector('.screen-result-heading')?.textContent.includes('1 of 2'),
    );
    await page.click('.screen-filters button');
    await page.waitForFunction(() =>
      document.querySelector('.screen-result-heading')?.textContent.includes('2 of 2'),
    );
    await page.goto(base + '/dashboard?view=ExchangeTimes');
    await page.waitForSelector('[aria-label="Search exchanges"]');
    await page.type('[aria-label="Search exchanges"]', 'Tokyo');
    assert.equal(await page.$eval('.exchange-identity strong', (node) => node.textContent), 'JPX');
    await page.click('[aria-label="Favorite JPX"]');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[aria-label="Favorite JPX"][aria-pressed=true]');
    await page.click('.exchange-toolbar button');
    assert.equal(await page.$$eval('.exchange-ledger li', (nodes) => nodes.length), 1);
    await page.click('.exchange-identity');
    await page.waitForSelector('[role=dialog]');
    assert.equal(
      await page.$eval('main', (node) => node.scrollWidth > node.clientWidth + 1),
      false,
    );
    await context.close();
    console.log(width + 'px analysis workflows passed');
  }
} finally {
  await browser.close();
}
