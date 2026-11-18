import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [320,390]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 844, hasTouch: true, isMobile: true});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=MarketOverview');
    await page.waitForSelector('[aria-label="Choose tools"]');
    await page.waitForSelector('.market-history');
    await page.click('[aria-label="Choose tools"]');
    await page.waitForSelector('.tools-popover');
    await page.$eval('.tools-popover', node => Promise.all(node.getAnimations({subtree: true}).map(animation => animation.finished.catch(() => {}))));
    await page.click('.tools-popover [aria-label="Pin Market overview"]');
    await page.click('[aria-label="Show pinned tools"]');
    await page.waitForSelector('.tools-popover-list[aria-label="Pinned tools"]');
    assert.ok(await page.$('.tools-popover-list a[href$="MarketOverview"]'));
    await page.keyboard.press('Escape');
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForSelector('[aria-label="Choose tools"]');
    await page.waitForSelector('.market-history');
    await page.click('[aria-label="Choose tools"]');
    await page.waitForSelector('.tools-popover');
    await page.$eval('.tools-popover', node => Promise.all(node.getAnimations({subtree: true}).map(animation => animation.finished.catch(() => {}))));
    await page.click('[aria-label="Show pinned tools"]');
    await page.click('.tools-popover [aria-label="Unpin Market overview"]');
    await page.waitForFunction(() => !document.querySelector('.tools-popover-list a[href$="MarketOverview"]'));
    assert.equal(await page.$eval('[aria-label="Show pinned tools"]', node => node === document.activeElement), true);
    const rect = await page.$eval('.tools-popover', node => {const bounds = node.getBoundingClientRect(); return {right: bounds.right, bottom: bounds.bottom, width: innerWidth, height: innerHeight};});
    assert.ok(rect.right <= rect.width && rect.bottom <= rect.height);
    await context.close();
    console.log(width + 'px: mobile pins, persistence, unpin focus and menu bounds passed');
  }
} finally { await browser.close(); }
