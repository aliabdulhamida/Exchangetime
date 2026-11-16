import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
const views = [
  'PortfolioTracker',
  'StockAnalysis',
  'EarningsCalendar',
  'DividendCalendar',
  'CompoundInterest',
  'PersonalBudget',
  'NetWorth',
  'MarketScreener',
];
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1000 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('et-appearance', 'light'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const view of views) {
      await page.goto(base + '/dashboard?view=' + view, { waitUntil: 'networkidle2' });
      await page.waitForFunction(
        () =>
          document.querySelector('.workspace-content') &&
          !document.querySelector('.workspace-loading'),
      );
      await page.evaluate(() => document.fonts.ready);
      if (view.includes('Calendar')) {
        await page.waitForSelector('.calendar-week-strip button');
        assert.equal(await page.$$eval('.calendar-week-strip button', (nodes) => nodes.length), 7);
        await page.click('.calendar-week-strip button:nth-child(4)');
        assert.equal(
          await page.$eval('.calendar-week-strip button:nth-child(4)', (node) =>
            node.getAttribute('aria-pressed'),
          ),
          'true',
        );
        assert.equal(
          await page.$$eval(
            '.calendar-week-strip button[aria-pressed="true"]',
            (nodes) => nodes.length,
          ),
          1,
        );
      }
      if (view === 'CompoundInterest') {
        const input = await page.$('form input[type="number"]');
        await input.click({ clickCount: 3 });
        await input.type('1000');
        if (width < 1280) await page.click('.tool-segmented button:last-child');
      }
      if (view === 'PortfolioTracker') {
        await page.waitForSelector('.portfolio-start .tool-empty-state');
        assert.equal(await page.$eval('.portfolio-start button', (node) => node.disabled), false);
      }
      assert.equal(
        await page.$eval('main', (node) => node.scrollWidth > node.clientWidth + 1),
        false,
        view + ' overflows',
      );
      await page.screenshot({ path: '/tmp/tool-design-' + view + '-' + width + '.png' });
      console.log(width + 'px ' + view + ': loaded layout and controls passed');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
