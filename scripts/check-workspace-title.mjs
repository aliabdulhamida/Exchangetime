import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, hasTouch: width < 1024, isMobile: width < 1024 });
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.workspace-hierarchy');
    await page.waitForSelector('.market-history');
    if (width < 1024) {
      assert.equal(await page.$eval('.workspace-hierarchy', node => getComputedStyle(node).display), 'none');
      await page.click('button[aria-label="Choose tools"]');
      await page.waitForSelector('.tools-popover');
      await page.$eval('.tools-popover', node => Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
      await page.click('.tools-popover-areas button:nth-child(3)');
      await page.waitForSelector('.tools-popover-list[aria-label="Research tools"]');
      assert.equal(await page.$$eval('.tools-popover-list a', nodes => nodes.length), 4);
      await page.click('.tools-popover-list a[href$="InsiderScanner"]');
      await page.waitForFunction(() => location.search.includes('InsiderScanner'));
      await page.waitForFunction(() => !document.querySelector('.tools-popover'));
      assert.equal(await page.$('.tools-popover'), null);
    } else {
      await page.click('.workspace-main-topics a[href$="StockAnalysis"]');
      await page.waitForFunction(() => document.querySelector('.workspace-subtopics')?.getAttribute('aria-label') === 'Research tools');
      await page.click('.workspace-subtopics a[href$="InsiderScanner"]');
      await page.waitForFunction(() => location.search.includes('InsiderScanner'));
    }
    await page.goBack();
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await page.close();
    console.log(width + 'px: tool discovery, navigation, browser back and overflow passed');
  }
} finally { await browser.close(); }
