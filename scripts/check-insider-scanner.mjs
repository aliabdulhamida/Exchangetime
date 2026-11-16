import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
const browser = await puppeteer.launch();
let activePage;
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    activePage = page;
    page.setDefaultTimeout(30000);
    await page.setViewport({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/tools', { waitUntil: 'domcontentloaded' });
    const url = await page.$eval('.directory-group a[href*="InsiderScanner"]', (link) => link.href);
    const tickerList = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/insider-scanner' && response.ok(),
    );
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const batch = await (await tickerList).json();
    assert.equal(batch.scope, 'market');
    assert.ok(
      batch.transactions.length,
      'Live provider returned no purchases or sales in the latest batch',
    );
    await page.waitForSelector('.insider-table tbody tr');
    const requests = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/insider-scanner') requests.push(request.url());
    });
    for (const side of ['buy', 'sell']) {
      await page.select('.insider-filter-bar select', side);
      const expected = batch.transactions.filter((row) => row.side === side).length;
      await page.waitForFunction(
        (count, direction) => {
          const rows = Array.from(document.querySelectorAll('.insider-table tbody tr'));
          return (
            rows.length === count &&
            rows.every((row) => row.querySelector('.insider-side.' + direction))
          );
        },
        {},
        expected,
        side,
      );
    }
    await page.locator('.insider-filter-bar button').click();
    await page.type('.insider-filter-bar input[type=search]', 'no-matching-insider-name-0000');
    await page.waitForFunction(() =>
      document.querySelector('.insider-results')?.innerText.includes('No trades match'),
    );
    assert.equal(requests.length, 0, 'Local filters made a provider request');
    await page.locator('.insider-filter-bar button').click();
    const ticker = 'AAPL';
    const issuerResponse = (index) =>
      page.waitForResponse((response) => {
        const endpoint = new URL(response.url());
        return (
          endpoint.pathname === '/api/insider-scanner' &&
          endpoint.searchParams.get('symbol') === ticker &&
          endpoint.searchParams.get('page') === String(index)
        );
      });
    await page.type('.insider-scope input', ticker.toLowerCase());
    const firstPage = issuerResponse(0);
    await page
      .locator('.insider-scope button[type=submit], .insider-scope button:not([type])')
      .click();
    const issuer = await (await firstPage).json();
    assert.equal(issuer.scope, 'issuer');
    assert.ok(['fmp', 'nasdaq'].includes(issuer.source));
    assert.ok(
      issuer.transactions.some((row) => row.side === 'sell'),
      'No AAPL sales returned',
    );
    await page.waitForFunction(
      (symbol) =>
        location.search.includes('symbol=' + symbol) &&
        document.querySelector('.insider-results h2')?.textContent ===
          symbol + ' insider transactions' &&
        document.querySelector('.insider-table tbody tr'),
      {},
      ticker,
    );
    const symbols = await page.$$eval('.insider-table .insider-symbol', (nodes) =>
      nodes.map((node) => node.textContent),
    );
    assert.ok(symbols.every((symbol) => symbol === ticker));
    assert.equal(symbols.length, issuer.transactions.length);
    if (issuer.nextPage !== null && issuer.source === 'nasdaq') {
      const next = issuerResponse(issuer.nextPage);
      await page.locator('.insider-paging button:last-child').click();
      const response = await next;
      assert.equal(new URL(response.url()).searchParams.get('source'), issuer.source);
      const older = await response.json();
      assert.equal(older.source, issuer.source);
      await page.waitForFunction(
        (count) =>
          document.querySelector('.insider-results-heading')?.innerText.includes('batch 2') &&
          document.querySelectorAll('.insider-table tbody tr').length === count,
        {},
        older.transactions.length,
      );
    }
    const reload = issuerResponse(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal((await (await reload).json()).scope, 'issuer');
    await page.waitForSelector('.insider-table tbody tr');
    assert.equal(
      await page.evaluate(() => {
        const main = document.querySelector('main');
        return main.scrollWidth > main.clientWidth + 1;
      }),
      false,
      'Scanner overflows the viewport',
    );
    await page.locator('.insider-scope button[type=button]').click();
    await page.waitForFunction(
      () =>
        !new URL(location.href).searchParams.has('symbol') &&
        document.querySelector('.insider-results h2')?.textContent === 'Latest filings' &&
        document.querySelector('.insider-paging button:last-child')?.disabled === false,
    );
    await page.locator('.insider-paging button:last-child').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.insider-results-heading')?.innerText.includes('batch 2') ||
        (document
          .querySelector('.insider-results')
          ?.innerText.includes('Older batches are not included') &&
          document.querySelector('.insider-table tbody tr') &&
          document.querySelector('.insider-paging button:last-child').disabled),
    );
    assert.deepEqual(errors, []);
    console.log(
      width +
        'px: directory, buy/sell counts, empty result, issuer filter, layout and feed boundary passed.',
    );
    await page.close();
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error(
      activePage.url(),
      await activePage.evaluate(() => ({
        heading: document.querySelector('h1')?.textContent,
        status: document.querySelector('.insider-results-heading')?.textContent,
        error: document.querySelector('[role=alert]')?.textContent,
        focus: document.activeElement?.tagName,
      })),
    );
  }
  throw error;
} finally {
  await browser.close();
}
