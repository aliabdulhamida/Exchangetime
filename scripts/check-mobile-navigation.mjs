import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [390, 768]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.setCacheEnabled(false);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'networkidle2' });
    assert.equal(
      await page.$$eval(
        '.terminal-topbar button[aria-label="More navigation"]',
        (nodes) => nodes.length,
      ),
      0,
    );
    assert.equal(
      await page.$eval('.workspace-picker', (node) => getComputedStyle(node).display),
      'none',
    );
    await page.click('.terminal-bottom-nav a[href="/blog"]');
    await page.waitForFunction(() => location.pathname === '/blog');
    await page.waitForSelector('h1');
    assert.equal(await page.$eval('h1', (heading) => heading.textContent), 'Research library');
    await page.locator('button[aria-label="More navigation"]').click();
    await page.waitForSelector('.mobile-navigation-sheet', { visible: true });
    assert.equal(await page.$$eval('.mobile-navigation-areas a', (nodes) => nodes.length), 6);
    await page.screenshot({ path: '/tmp/mobile-nav-' + width + '.png' });
    const radio = await page.$('.mobile-navigation-sheet');
    const items = await radio.$$('button');
    for (const item of items) {
      if ((await item.evaluate((node) => node.textContent)).includes('Market radio')) {
        await item.click();
        break;
      }
    }
    await page.waitForSelector('.et-dropdown-panel select', { visible: true });
    const player = await page.$('.et-dropdown-panel');
    assert.equal(
      (await player.$$('iframe')).length,
      0,
      'Radio must not connect before station selection',
    );
    assert.ok(await page.$eval('.et-dropdown-panel select', (select) => select.options.length > 1));
    assert.equal(
      await page.$eval('main', (main) => main.scrollWidth > main.clientWidth + 1),
      false,
    );
    await page.keyboard.press('Escape');
    for (const route of ['/impressum', '/settings/privacy-policy', '/redaktion']) {
      await page.goto(base + route, { waitUntil: 'networkidle2' });
      await page.waitForSelector('article');
      assert.equal(await page.$eval('article', (article) => article.lang), 'en');
      await page.waitForSelector('footer[aria-label="Legal information"]');
    }
    assert.deepEqual(errors, []);
    console.log(
      width +
        'px: library navigation, radio discovery, no unsolicited player connection and English legal pages passed',
    );
    await page.close();
  }
} finally {
  await browser.close();
}
