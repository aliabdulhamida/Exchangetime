import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.workspace-hierarchy');
    assert.equal(await page.$$eval('.workspace-main-topics a', nodes => nodes.length), 6);
    assert.equal(await page.$$eval('.workspace-subtopics a', nodes => nodes.length), 5);
    assert.equal(await page.$('.workspace-title-trigger'), null);
    await page.click('.workspace-main-topics a[href$="StockAnalysis"]');
    await page.waitForFunction(() => document.querySelector('.workspace-subtopics')?.getAttribute('aria-label') === 'Research tools');
    assert.equal(await page.$$eval('.workspace-subtopics a', nodes => nodes.length), 4);
    await page.click('.workspace-subtopics a[href$="InsiderScanner"]');
    await page.waitForFunction(() => location.search.includes('InsiderScanner'));
    assert.equal(await page.$eval('.workspace-subtopics [aria-current="page"]', node => node.textContent.trim()), 'Insider buy/sell scanner');
    await page.goBack();
    await page.waitForFunction(() => location.search.includes('StockAnalysis'));
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await page.close();
    console.log(width + 'px: main topics, subtopics, active tool, browser back and overflow passed');
  }
} finally {
  await browser.close();
}
