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
    if (theme === 'dark') {
      assert.equal(await page.$eval(width < 1024 ? '.terminal-body' : '.terminal', node => getComputedStyle(node).backgroundColor), 'rgb(0, 0, 0)');
      assert.equal(await page.$eval('.market-history', node => getComputedStyle(node).backgroundColor), width < 1024 ? 'rgba(0, 0, 0, 0)' : 'rgb(18, 18, 18)');
    }
    if (width < 1024) {
      assert.ok(await page.$eval('.terminal-search', node => node.getBoundingClientRect().width <= 48));
      assert.equal(await page.$('.workspace-title-position'), null);
      const active = await page.$eval('.terminal-bottom-nav [aria-current="page"]', node => node.textContent.trim());
      assert.equal(active, 'Markets');
      assert.equal(await page.$eval('.workspace-main-topics [aria-current]', node => node.textContent.trim()), 'Markets');
      assert.equal(await page.$('.workspace-title-trigger'), null);
      const tabs = await page.$$eval('.terminal-bottom-items > *', nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, label: getComputedStyle(node.querySelector('span')).position, background: getComputedStyle(node).backgroundColor })));
      assert.equal(tabs.length, 7);
      assert.equal(await page.$eval('.workspace-main-topics', node => getComputedStyle(node).display), 'none');
      assert.ok(tabs.every(tab => Math.abs(tab.width - tabs[0].width) < 1 && tab.label === 'static'));
      const geometry = await page.evaluate(() => {
        const nav = document.querySelector('.terminal-bottom-nav');
        const body = document.querySelector('.terminal-body');
        const main = document.querySelector('main');
        return { position: getComputedStyle(nav).position, width: nav.getBoundingClientRect().width, viewport: innerWidth, bodyBottom: body.getBoundingClientRect().bottom, navBottom: nav.getBoundingClientRect().bottom, navTop: nav.getBoundingClientRect().top };
      });
      assert.equal(geometry.position, 'static');
      assert.equal(geometry.width, geometry.viewport);
      assert.ok(Math.abs(geometry.bodyBottom - geometry.navTop) <= 1);
      assert.equal(await page.$eval('.terminal-body', node => getComputedStyle(node).borderTopLeftRadius), '0px');
      assert.equal(await page.$eval('.terminal-body', node => getComputedStyle(node).borderBottomLeftRadius), '28px');
      for (const height of [680, 844, 1000]) {
        await page.setViewport({ width, height });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        const resized = await page.evaluate(() => {
          const nav = document.querySelector('.terminal-bottom-nav').getBoundingClientRect();
          const main = document.querySelector('main');
          main.scrollTop = main.scrollHeight;
          return { bottom: nav.bottom, top: nav.top, mainTop: main.getBoundingClientRect().top, mainBottom: main.getBoundingClientRect().bottom, remaining: main.scrollHeight - main.clientHeight - main.scrollTop, viewport: innerHeight };
        });
        assert.ok(Math.abs(resized.bottom - resized.viewport) <= 1, 'Navigation stays at the bottom');
        assert.ok(resized.mainBottom <= resized.top + 1, 'Navigation must not cover content');
        assert.ok(resized.remaining <= 1, 'Content end must remain reachable');
      }
      await page.$eval('main', node => { node.scrollTop = 0; });
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
