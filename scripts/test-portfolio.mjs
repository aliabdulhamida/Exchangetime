import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 844 });
    let quotesAvailable = false;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return void request.continue();
      const dates = ['2026-01-02', '2026-01-05', '2026-01-06'];
      const payload = { chart: { result: [{ timestamp: dates.map(date => Date.parse(date) / 1000),
        meta: { currency: 'USD' }, indicators: { quote: [{ close: [100, 110, 115] }] } }] } };
      void request.respond({ status: quotesAvailable ? 200 : 503, contentType: 'application/json',
        body: JSON.stringify(quotesAvailable ? payload : { error: 'Test outage' }) });
    });
    async function click(text) {
      const target = await page.waitForFunction(label => [...document.querySelectorAll('button')]
        .find(button => button.offsetWidth && (button.textContent.trim() === label || button.getAttribute('aria-label') === label)), {}, text);
      await target.asElement().click();
    }
    await page.goto('http://localhost:3000/dashboard?view=PortfolioTracker', { waitUntil: 'domcontentloaded' });
    await click('Add your first transaction');
    await page.waitForSelector('[role=dialog]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role=dialog]', { hidden: true });
    await click('Add your first transaction');
    await page.type('#ledger-symbol', 'AAPL');
    await page.$eval('#ledger-date', input => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2026-01-02');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.type('#ledger-value', '500');
    await page.type('#ledger-price', '100');
    await page.type('#ledger-fees', '2');
    await page.waitForFunction(() => document.querySelector('[role=dialog]').innerText.includes('5 shares'));
    await click('Add Buy');
    await page.waitForFunction(() => document.querySelector('.portfolio-summary h2')?.textContent === 'Unavailable');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('portfolioTransactions') || '[]').length === 1);
    quotesAvailable = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.portfolio-summary h2')?.textContent.includes('575'));
    await page.click('.portfolio-summary summary');
    await page.waitForFunction(() => document.querySelector('.portfolio-summary').innerText.includes('Matched closes: 2026-01-02 – 2026-01-06'));
    const trade = await page.evaluate(() => JSON.parse(localStorage.getItem('portfolioTransactions'))[0]);
    assert.equal(trade.shares, 5);
    assert.equal(trade.fees, 2);
    assert.equal(errors.length, 0, errors.join('\n'));
    await context.close();
    console.log(width + 'px: keyboard dismissal, manual entry without market data, persistence, valuation and comparison passed.');
  }
} finally {
  await browser.close();
}
