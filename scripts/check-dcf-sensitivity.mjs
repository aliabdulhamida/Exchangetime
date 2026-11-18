import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => console.error('DCF browser error:', error.message));
    await page.setViewport({width, height: 900});
    await page.evaluateOnNewDocument(() => localStorage.setItem('exchangetime_dcf_v1', JSON.stringify({
      discountRate: 3.25, terminalGrowth: 2, sharesOutstanding: 100, cash: 0, debt: 0,
      fcfList: [100,100,100,100,100], fcfStart: 100, fcfGrowthConstant: 0, simpleMode: true, fcfMode: 'constant',
    })));
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=DCFCalculator');
    try { await page.waitForSelector('.dcf-sensitivity'); }
    catch (error) { console.error(await page.$eval('main', node => node.textContent.slice(0, 1600))); throw error; }
    await page.waitForFunction(() => document.querySelector('.dcf-base-value')?.parentElement.textContent.includes('3.25%'));
    await page.$$eval('button', nodes => nodes.find(node => node.textContent.trim() === 'Results' && node.getBoundingClientRect().width > 0).click());
    await page.waitForSelector('.dcf-sensitivity', {visible: true});
    assert.equal(await page.$$eval('.dcf-base-value', nodes => nodes.length), 1);
    assert.match(await page.$eval('.dcf-base-value', node => node.parentElement.textContent), /3.25%/);
    assert.ok(await page.$$eval('.dcf-sensitivity td', nodes => nodes.some(node => node.textContent === '—')));
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: exact base rate, invalid cells and visible sensitivity export passed');
  }
} finally { await browser.close(); }
