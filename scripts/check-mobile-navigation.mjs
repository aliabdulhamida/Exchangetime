import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [320, 390, 768]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, hasTouch: true, isMobile: true });
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[aria-label="Choose tools"]');
    await page.waitForSelector('.market-history');
    await page.click('[aria-label="Choose tools"]');
    await page.waitForSelector('.tools-popover');
    assert.equal(await page.$$eval('.tools-popover-areas button', nodes => nodes.length), 6);
    await page.click('.tools-popover-shortcuts a[href="/blog"]');
    await page.waitForFunction(() => location.pathname === '/blog');
    await page.waitForSelector('h1');
    await page.click('[aria-label="Choose tools"]');
    await page.waitForSelector('.tools-popover');
    assert.equal(await page.$$eval('.tools-popover-shortcuts > *', nodes => nodes.length), 4);
    await page.click('.tools-popover-shortcuts button:nth-child(3)');
    await page.waitForSelector('.et-dropdown-panel select', { visible: true });
    assert.equal(await page.$$eval('.et-dropdown-panel iframe', nodes => nodes.length), 0);
    await page.keyboard.press('Escape');
    for (const route of ['/impressum', '/settings/privacy-policy', '/redaktion']) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('article');
      assert.equal(await page.$eval('article', node => node.lang), 'en');
    }
    await page.close();
    console.log(width + 'px: library, radio without unsolicited connection, and legal routes passed');
  }
} finally { await browser.close(); }
