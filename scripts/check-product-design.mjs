import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1000 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.evaluateOnNewDocument(value => localStorage.setItem('et-appearance', value), theme);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => {
      const price = document.querySelector('.market-chart-price strong');
      return price && /\d/.test(price.textContent);
    });
    await page.evaluate(async () => { await document.fonts.ready; });
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    if (theme === 'dark') assert.equal(await page.$eval('.terminal', node => getComputedStyle(node).backgroundColor), 'rgb(0, 0, 0)');
    if (width < 1024) {
      assert.ok(await page.$eval('.terminal-search', node => node.getBoundingClientRect().width <= 48));
      assert.equal(await page.$('.workspace-title-position'), null);
      const active = await page.$eval('.terminal-bottom-nav [aria-current="page"]', node => node.textContent.trim());
      assert.equal(active, 'Markets');
    }
    await page.screenshot({ path: '/tmp/exchangetime-design-' + theme + '-' + width + '.png' });
    await page.locator('button[aria-label="Search assets and workspaces"]').click();
    await page.waitForSelector('[role="dialog"]', { visible: true });
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    console.log(theme + ' ' + width + 'px: real-data layout, theme, overflow, navigation and global search passed');
    await page.close();
  }
} finally { await browser.close(); }
