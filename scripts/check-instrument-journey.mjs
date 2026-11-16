import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
const browser = await puppeteer.launch();
let activePage;
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    activePage = page;
    const errors = [];
    const radioRequests = [];
    page.on('request', request => { if (request.url().startsWith('https://tunein.com/embed/player/')) radioRequests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(45000);
    await page.setViewport({ width, height: 900 });
    await page.goto(base + '/dashboard?view=StockAnalysis', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.research-name-search');
    await page.click('.research-name-search');
    await page.waitForSelector('[cmdk-input]', { visible: true });
    await page.type('[cmdk-input]', 'Apple');
    await page.waitForSelector('[cmdk-item][data-value="AAPL"]', { visible: true });
    assert.match(await page.$eval('[cmdk-item][data-value="AAPL"]', element => element.innerText), /Apple Inc/i);
    await page.locator('[cmdk-item][data-value="AAPL"]').click();
    await page.waitForFunction(() => location.search.includes('symbol=AAPL') && !document.querySelector('[role=dialog]'));
    await page.click('[aria-label="Search assets and workspaces"]');
    await page.waitForSelector('[cmdk-input]', { visible: true });
    await page.type('[cmdk-input]', 'SPY');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[cmdk-item][data-value="SPY"]', { visible: true });
    await page.locator('[cmdk-item][data-value="SPY"]').click();
    await page.waitForSelector('.instrument-observations');
    assert.match(page.url(), /profile=price/);
    assert.equal(await page.$eval('.instrument-heading h2', node => node.textContent), 'SPY');
    await page.click('.instrument-profile .market-time-ranges button');
    await page.click('.instrument-observations summary');
    assert.ok((await page.$$('.instrument-observations tbody tr')).length <= 6);
    await page.click('.instrument-actions button:last-child');
    await page.waitForSelector('[aria-label="Watchlist ticker"]', { visible: true });
    assert.equal(await page.$eval('[aria-label="Watchlist ticker"]', node => node.value), 'SPY');
    await page.click('form:has([aria-label="Watchlist ticker"]) button[type=submit]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et_watchlists'))[0].items.some(item => item.ticker === 'SPY'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.instrument-observations');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const runCommand = async (query, command) => {
      await page.waitForFunction(() => !document.querySelector('[role=dialog]') && getComputedStyle(document.body).pointerEvents !== 'none');
      await page.click('[aria-label="Search assets and workspaces"]');
      await page.waitForSelector('[role=dialog][data-state=open] [cmdk-input]', { visible: true });
      await page.type('[cmdk-input]', query);
      const selector = '[cmdk-item][data-value="' + command + '"]';
      await page.locator(selector).click();
    };
    await runCommand('radio', 'Open market radio');
    const station = '#tunein-radio-modal-nav select';
    await page.waitForSelector(station, { visible: true });
    assert.equal(radioRequests.length, 0);
    await page.select(station, 's165740');
    await page.waitForSelector('#tunein-radio-modal-nav iframe[title="Bloomberg Radio"]');
    await page.click('#tunein-radio-modal-nav button');
    assert.equal(await page.$('#tunein-radio-modal-nav iframe'), null);
    await page.keyboard.press('Escape');
    await runCommand('transaction', 'Add portfolio transaction');
    await page.waitForFunction(() => document.querySelector('[role=dialog]')?.innerText.includes('Record a transaction'));
    await page.click('[role=dialog][data-state=open] button:has(.sr-only)');
    await runCommand('goal', 'Create a financial goal');
    await page.waitForFunction(() => document.activeElement?.id === 'financial-goal-name');
    await runCommand('journal', 'Add a trade journal entry');
    await page.waitForFunction(() => document.activeElement?.id === 'journal-symbol');
    assert.deepEqual(errors, []);
    console.log(width + 'px: Apple lookup, SPY profile, watchlist, reload, on-demand radio and three quick actions passed.');
    await context.close();
  }
  const page = await browser.newPage();
  activePage = page;
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/dashboard?view=MarketScreener', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.screener-workspace table a[aria-label^="Research "]');
  await page.type('.screener-workspace input[type=number]', '30');
  await page.waitForFunction(() => [...document.querySelectorAll('.screener-workspace tbody tr')].every(row => {
    if (row.cells.length === 1) return row.textContent.includes('No stocks match');
    const multiple = Number(row.cells[8].innerText);
    return multiple > 0 && multiple <= 30;
  }));
  await page.click('.screener-workspace summary');
  await page.type('[aria-label="Screen name"]', 'My valuation screen');
  await page.click('.screener-workspace details button[type=submit]');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.screener-workspace summary');
  await page.click('.screener-workspace summary');
  await page.click('.screener-workspace details div button');
  assert.equal(await page.$eval('.screener-workspace input[type=number]', input => input.value), '30');
  console.log('Screener: live list, positive valuation ceiling and saved-screen reload passed.');
} catch (error) {
  if (activePage && !activePage.isClosed()) console.error(activePage.url(), await activePage.evaluate(() => ({
    focus: document.activeElement?.outerHTML.slice(0, 240),
    dialog: document.querySelector('[role=dialog]')?.textContent.slice(0, 360),
    heading: document.querySelector('h1')?.textContent,
  })));
  throw error;
} finally {
  await browser.close();
}
