import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900, hasTouch: width < 1024, isMobile: width < 1024});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=NetWorth');
    await page.waitForSelector('.net-worth-summary');
    const geometry = () => page.$eval('.net-worth-summary .terminal-metric:nth-child(2)', node => ({
      padding: parseFloat(getComputedStyle(node).paddingTop),
      font: getComputedStyle(node.querySelector('strong')).fontSize,
    }));
    const comfortable = await geometry();
    await page.evaluate(() => window.dispatchEvent(new Event('et-settings')));
    await page.waitForSelector('[aria-label="Display density"]');
    await page.click('[aria-label="Display density"] button:nth-child(2)');
    await page.$$eval('[role=dialog] button', nodes => nodes.find(node => node.textContent === 'Save preferences').click());
    const compact = await geometry();
    assert.ok(compact.padding < comfortable.padding);
    assert.equal(compact.font, comfortable.font);
    await page.keyboard.press('Escape');
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.documentElement.dataset.density === 'compact');
    await page.waitForSelector('.net-worth-summary');
    if (width < 1024) {
      const height = await page.$eval('.workspace-content button.primary', node => node.getBoundingClientRect().height);
      assert.ok(height >= 44);
    }
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: compact spacing, unchanged financial type size and persistence passed');
  }
} finally { await browser.close(); }
