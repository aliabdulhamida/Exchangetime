import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=CompoundInterest');
    await page.waitForSelector('.compound-workspace form input[type=number]');
    const input = await page.$('.compound-workspace form input[type=number]');
    await input.click({clickCount: 3});
    await page.keyboard.press('Backspace');
    await input.type('1000');
    await page.click('.compound-yearly summary');
    assert.equal(await page.$$eval('.compound-yearly tbody tr', nodes => nodes.length), 11);
    const balance = () => page.$eval('.compound-yearly tbody tr:last-child td', node => {
      const parts = new Intl.NumberFormat().formatToParts(1234.5);
      const group = parts.find(part => part.type === 'group')?.value ?? ',';
      const decimal = parts.find(part => part.type === 'decimal')?.value ?? '.';
      return Number(node.textContent.replaceAll(group, '').replace(decimal, '.').replace(/[^0-9.-]/g, ''));
    });
    const nominal = await balance();
    assert.ok(Math.abs(nominal - 1000 * (1 + .05 / 12) ** 120) < .02);
    await page.click('[aria-label="Adjust for inflation"]');
    const real = await balance();
    assert.ok(Math.abs(real - nominal / 1.02 ** 10) < .02);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: annual projection reconciles nominal and inflation-adjusted balances');
  }
} finally { await browser.close(); }
