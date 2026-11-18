import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.evaluateOnNewDocument(() => {
      if (localStorage.getItem('history-fixture')) return;
      localStorage.setItem('history-fixture', '1');
      localStorage.setItem('et.networth.v1', JSON.stringify([{id: 'cash', name: 'Test cash', category: 'Cash', kind: 'asset', value: 100}]));
      localStorage.setItem('et.networth.history.v1', JSON.stringify([
        {date: '2020-01-01', assets: 50, liabilities: 0, net: 50},
        {date: new Date().toISOString().slice(0,10), assets: 123, liabilities: 0, net: 123},
      ]));
    });
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=NetWorth');
    await page.waitForSelector('.balance-history-summary');
    const save = await page.$('.terminal-section-heading button');
    page.once('dialog', dialog => dialog.dismiss());
    await save.click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('et.networth.history.v1'))[1].net), 123);
    page.once('dialog', dialog => dialog.accept());
    await save.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et.networth.history.v1'))[1].net === 100);
    await page.click('.instrument-observations summary');
    const today = new Date().toISOString().slice(0,10);
    page.once('dialog', dialog => dialog.accept());
    await page.click('[aria-label="Delete snapshot ' + today + '"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('et.networth.history.v1')).length === 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('et.networth.v1'))[0].value), 100);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: snapshot replacement confirmation, deletion and balance preservation passed');
  }
} finally { await browser.close(); }
