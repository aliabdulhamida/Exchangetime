import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.evaluateOnNewDocument(() => {
      const base = {date: '2026-01-02', side: 'long', entry: 10, exit: 12, quantity: 10, fees: 2,
        currency: 'EUR', setup: 'Breakout', notes: 'Isolated browser test'};
      localStorage.setItem('et.journal.v1', JSON.stringify([
        {...base, id: 'a', symbol: 'AAA'}, {...base, id: 'b', symbol: 'BBB', side: 'short'},
        {...base, id: 'c', symbol: 'AAA', currency: 'USD'},
      ]));
    });
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=TradeJournal');
    await page.waitForFunction(() => document.querySelector('.journal-selection')?.textContent.includes('2 matching'));
    await page.type('.journal-filters input[type=search]', 'AAA');
    await page.waitForFunction(() => document.querySelector('.journal-selection')?.textContent.includes('1 matching'));
    assert.equal(await page.$$eval('tbody tr', nodes => nodes.length), 1);
    assert.match(await page.$eval('.terminal-metrics', node => node.textContent), /18/);
    await page.click('[aria-label="Edit AAA trade"]');
    assert.equal(await page.$eval('#journal-symbol', node => node.value), 'AAA');
    await page.click('.journal-selection button');
    await page.waitForFunction(() => document.querySelector('.journal-selection')?.textContent.includes('2 matching'));
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: journal selection, currency isolation, metrics and editing passed');
  }
} finally { await browser.close(); }
