import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, hasTouch: width < 1024, isMobile: width < 1024 });
    await page.evaluateOnNewDocument(value => localStorage.setItem('et-appearance', value), theme);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.market-history');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    if (theme === 'dark') assert.equal(await page.$eval(width < 1024 ? '.terminal-body' : '.terminal', node => getComputedStyle(node).backgroundColor), 'rgb(0, 0, 0)');
    if (width < 1024) {
      assert.equal(await page.$eval('.terminal-body', node => getComputedStyle(node).borderBottomLeftRadius), '0px');
      for (const height of [680, 844, 1000]) {
        await page.setViewport({ width, height, hasTouch: true, isMobile: true });
        const geometry = await page.$eval('.terminal-tools-dock', node => {
          const rect = node.getBoundingClientRect();
          return { position: getComputedStyle(node).position, left: rect.left, right: rect.right, bottom: rect.bottom, height: innerHeight, width: innerWidth };
        });
        assert.equal(geometry.position, 'fixed');
        assert.ok(geometry.left >= 0 && geometry.right <= geometry.width && geometry.bottom <= geometry.height);
      }
      await page.click('[aria-label="Choose tools"]');
      await page.waitForSelector('.tools-popover');
      const menu = await page.$eval('.tools-popover', node => {
        const rect = node.getBoundingClientRect();
        return { right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight };
      });
      assert.ok(menu.right <= menu.width && menu.bottom <= menu.height);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.tools-popover', { hidden: true });
    }
    await page.click('button[aria-label="Search assets and workspaces"]');
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await page.screenshot({ path: '/tmp/exchangetime-design-' + theme + '-' + width + '.png' });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(theme + ' ' + width + 'px: theme, overflow, floating launcher, popover and search passed');
  }
} finally { await browser.close(); }
