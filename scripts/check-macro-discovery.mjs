import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const keys = ['gdp','interestRate','inflationYoY','unemploymentRate','tenYearYield','realInterestRate','yieldCurveSlope','inflationTargetGap','unemploymentChange12m','miseryIndex'];
const countries = ['Alpha', 'Beta'].map((name, index) => ({
  code: name.slice(0,2).toUpperCase(), name,
  metrics: Object.fromEntries(keys.map(key => [key, {label: key, value: key === 'gdp' && index === 0 ? null : index + 1,
    date: '2026-01-01', unit: key === 'gdp' ? 'usdT' : '%', series: ['TEST-SERIES']} ])),
}));
const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.setRequestInterception(true);
    page.on('request', request => request.url().includes('/api/economic-indicators') ?
      request.respond({status: 200, contentType: 'application/json', body: JSON.stringify({
        source: 'FRED', fetchedAt: '2026-01-02T12:00:00Z', countries,
      })}) : request.continue());
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=EconomicIndicators');
    await page.waitForSelector('.macro-controls input');
    assert.equal(await page.$eval('.macro-matrix tbody tr:first-child', node => node.textContent.includes('Beta')), true);
    await page.type('.macro-controls input', 'Alpha');
    await page.waitForFunction(() => document.querySelectorAll('.macro-matrix tbody tr').length === 1);
    assert.equal(await page.$eval('.macro-matrix tbody td:nth-child(2)', node => node.textContent.includes('—')), true);
    if (width < 768) {
      assert.equal(await page.$eval('.macro-country-mobile dd', node => node.textContent), '—');
      await page.click('.macro-country-mobile details summary');
      await page.waitForSelector('.macro-country-mobile details[open] a');
    }
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: macro search, country view and missing GDP handling passed');
  }
} finally { await browser.close(); }
