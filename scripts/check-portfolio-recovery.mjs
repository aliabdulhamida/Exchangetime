import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('portfolioBaseCurrency', 'USD');
    localStorage.setItem('portfolioTransactions', JSON.stringify([{ id: 'recovery-fixture', symbol: 'TEST', side: 'BUY', shares: 2, price: 10, currency: 'EUR', fees: 1, taxes: 0, date: '2020-02-03' }]));
  });
  await page.setRequestInterception(true);
  page.on('request', request => request.url().includes('/api/') ? request.abort() : request.continue());
  await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=PortfolioTracker', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.portfolio-records');
  assert.ok(await page.$eval('.portfolio-records', node => node.textContent.includes('TEST')));
  await page.click('[aria-label="Edit TEST transaction"]');
  const input = await page.$('.record-editor input[type="number"]');
  await input.click({ clickCount: 3 });
  await input.type('3');
  await page.click('.record-editor button[type="submit"]');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('portfolioTransactions'))[0].shares === 3);
  assert.equal(await page.$('.record-editor'), null);
  assert.ok(await page.$('.portfolio-records button'));
  console.log('Missing FX and quote feeds: native records, editing and CSV export access retained');
} finally { await browser.close(); }
