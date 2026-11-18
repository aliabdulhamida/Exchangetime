import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=PositionSizing');
    await page.waitForSelector('.sizing-cash-toggle');
    const inputs = await page.$$('form input[type=number]');
    for (const [index, value] of ['10000','1','100','99.99','110','1','0','0'].entries()) {
      await inputs[index].click({clickCount: 3});
      await page.keyboard.press('Backspace');
      await inputs[index].type(value);
    }
    await page.click('.sizing-cash-toggle input');
    await page.waitForFunction(() => document.querySelector('.sizing-warning')?.textContent.includes('limited'));
    assert.match(await page.$eval('.terminal-panel', node => node.textContent), /100\s*units/);
    await page.select('form select:nth-of-type(1)', 'USD');
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await page.screenshot({path: '/tmp/position-sizing-' + width + '.png'});
    await context.close();
    console.log(width + 'px: risk inputs, cash cap and responsive results passed');
  }
} finally { await browser.close(); }
