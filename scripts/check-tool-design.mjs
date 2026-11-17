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
  'PositionSizing',
  'TradeJournal',
  'BacktestTool',
  'OptionsPayoffLab',
  'DCFCalculator',
  'EconomicIndicators',
  'ExchangeTimes',
  'SectorAnalysis',
  'AssetComparison',
  'InsiderScanner',
  'News',
  'TechnicalAnalysis',
  'TradeBreakEven',
  'LoanPlanner',
  'FinancialGoals',
  'EconomicCalendar',
  'HolidayCalendar',
  'CurrencyConverter',
  'TaxCalculator',
  'MarketOverview',
];
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1000, hasTouch: width < 1024, isMobile: width < 1024 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('et-appearance', 'light'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const view of views) {
      await page.goto(base + '/dashboard?view=' + view, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () =>
          document.querySelector('.workspace-content') &&
          !document.querySelector('.workspace-loading'),
      );
      await page.evaluate(() => document.fonts.ready);
      if (view === 'LoanPlanner' && width >= 1024) {
        await page.type('.planner-field input', '1200');
        await page.click('.workspace-focus');
        await page.waitForSelector('.terminal-sidebar', { hidden: true });
        assert.equal(await page.$eval('.planner-field input', input => input.value), '1200');
        await page.click('.workspace-focus');
        await page.waitForSelector('.terminal-sidebar', { visible: true });
      }
      if (view === 'SectorAnalysis') {
        await page.click('[aria-label="Sector view"] button:nth-child(2)');
        await page.waitForSelector('.market-sectors table a');
        assert.equal(await page.$('.sector-heatmap'), null);
        await page.click('[aria-label="Sector view"] button');
        await page.waitForSelector('.sector-heatmap');
      }
      if (['EarningsCalendar', 'DividendCalendar'].includes(view)) {
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
        await input.click();
        if (width >= 1024) {
          assert.equal(await page.$('.numeric-keypad'), null);
          await input.click({ clickCount: 3 });
          await input.type('1000');
        } else {
        await page.waitForSelector('.numeric-keypad');
        assert.equal(await input.evaluate(node => node.inputMode), 'none');
        await page.click('.numeric-keypad footer button:nth-child(2)');
        for (const digit of '1000') await page.click(`.numeric-keypad button[aria-label="${digit}"]`);
        await page.click('.numeric-keypad .keypad-done');
        assert.equal(await input.evaluate(node => node.value), '1000');
        assert.equal(await page.$('.numeric-keypad'), null);
        }
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
