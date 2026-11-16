import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
try {
  for (const width of [390, 768]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, hasTouch: true });
    await page.setCacheEnabled(false);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/dashboard?view=MarketOverview', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.workspace-title-trigger', { visible: true });
    async function swipe(direction) {
      const box = await page.$eval('.workspace-title-trigger', node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      const center = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const client = await page.createCDPSession();
      const start = center + (direction === 'left' ? 65 : -65);
      const end = center + (direction === 'left' ? -65 : 65);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
      for (let step = 1; step <= 5; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start + (end - start) * step / 5, y }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
    }
    await swipe('left');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'ExchangeTimes');
    assert.equal(await page.$('.workspace-chooser'), null, 'Swipe must not also open the chooser');
    await swipe('right');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'MarketOverview');
    await page.click('.workspace-title-trigger');
    await page.waitForSelector('.workspace-chooser', { visible: true });
    await page.$eval('.workspace-chooser', async node => { await Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))); });
    assert.equal(await page.$$eval('.workspace-chooser-list a', nodes => nodes.length), 5);
    await page.type('.workspace-chooser input[type="search"]', 'insider');
    await page.waitForSelector('.workspace-chooser-list a[href*="InsiderScanner"]');
    await page.screenshot({ path: '/tmp/workspace-title-picker-' + width + '.png' });
    await page.locator('.workspace-chooser-list a[href*="InsiderScanner"]').click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'InsiderScanner');
    await page.waitForFunction(() => !document.querySelector('.workspace-chooser'));
    await page.click('.workspace-title-trigger');
    await page.waitForSelector('.workspace-chooser', { visible: true });
    await page.$eval('.workspace-chooser', async node => { await Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))); });
    await page.locator('.workspace-area-chips button[data-area="Personal Finance"]').click();
    assert.equal(await page.$$eval('.workspace-chooser-list a', nodes => nodes.length), 8);
    await page.locator('.workspace-chooser-list a[href*="PersonalBudget"]').click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'PersonalBudget');
    await page.waitForFunction(() => !document.querySelector('.workspace-chooser'));
    await page.focus('.workspace-title-trigger');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'NetWorth');
    await page.goBack();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'PersonalBudget');
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/workspace-title-' + width + '.png' });
    console.log(width + 'px: real touch swipes, tap chooser, scoped list, global search, category selection, keyboard and browser back passed');
    await page.close();
  }
} finally { await browser.close(); }
