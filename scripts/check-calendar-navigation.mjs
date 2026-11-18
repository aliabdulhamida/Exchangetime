import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const row = {
  symbol: 'TEST', company: 'Calendar test fixture', hour: 'bmo', epsEstimate: 2,
  epsActual: null, revenueEstimate: null, revenueActual: null, marketCap: '',
  fiscalQuarterEnding: '', lastYearReportDate: '', lastYearEPS: null, numberOfEstimates: null,
  currency: 'USD', market: 'US', instrumentType: 'Stock', exchange: 'NASDAQ',
  exDate: '2026-01-02', forwardYieldPct: 2, source: 'upcoming_exdates',
  declarationDate: '', recordDate: '', paymentDate: '',
};
const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    for (const view of ['EarningsCalendar', 'DividendCalendar']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({width, height: 900});
      await page.setRequestInterception(true);
      page.on('request', request => /\/api\/(earnings-calendar|dividends)(\?|$)/.test(request.url())
        ? request.respond({status: 200, contentType: 'application/json', body: JSON.stringify({
          '2026-01-02': [row], '2026-01-03': [],
        })}) : request.continue());
      await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=' + view);
      await page.waitForSelector('.calendar-date-jump input');
      const selectDate = async value => {
        await page.$eval('.calendar-date-jump input', (input, date) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, date);
          input.dispatchEvent(new Event('input', {bubbles: true}));
          input.dispatchEvent(new Event('change', {bubbles: true}));
        }, value);
      };
      await selectDate('2026-01-02');
      await page.waitForSelector('main a[href*="symbol=TEST"]');
      const filterLabel = view === 'EarningsCalendar' ? 'Filter key metrics' : 'Filter dividend calendar';
      await page.click('[aria-label="' + filterLabel + '"]');
      await page.type('input[placeholder="Ticker"]', 'NOMATCH');
      await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('No matching events'));
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Clear filters').click());
      await page.waitForSelector('main a[href*="symbol=TEST"]');
      await selectDate('2026-01-03');
      await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('No events reported'));
      await selectDate('2026-02-01');
      await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Date outside feed coverage'));
      await page.$eval('.calendar-date-jump button', button => button.click());
      assert.equal(await page.$eval('.calendar-date-jump input', input => input.value), await page.evaluate(() => {
        const today = new Date();
        return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
      }));
      assert.equal(await page.$eval('main', main => main.scrollWidth > main.clientWidth + 1), false);
      if (width === 390) await page.screenshot({path: '/tmp/calendar-' + view + '.png'});
      await context.close();
      console.log(width + 'px ' + view + ': date jump, filters, empty states and Today passed');
    }
  }
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({width: 390, height: 900});
  await page.evaluateOnNewDocument(savedRow => localStorage.setItem('et.feed.v1:/api/earnings-calendar', JSON.stringify({
    data: {'2026-01-02': [savedRow]}, retrieved: '2026-01-01T12:00:00Z',
  })), row);
  await page.setRequestInterception(true);
  page.on('request', request => request.url().includes('/api/earnings-calendar')
    ? undefined : request.continue());
  await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=EarningsCalendar', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Calendar request timed out'), {timeout: 30000});
  assert.equal(await page.$eval('main', main => main.textContent.includes('Calendar unavailable')), true);
  await page.$eval('.calendar-date-jump input', input => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2026-01-02');
    input.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await page.waitForSelector('main a[href*="symbol=TEST"]');
  await context.close();
  console.log('Calendar timeout clears loading and preserves cached events');
} finally { await browser.close(); }
