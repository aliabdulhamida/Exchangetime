import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=PersonalBudget');
    await page.waitForSelector('.budget-workspace');
    await page.evaluate(() => localStorage.setItem('exchangetime.personal-budget.v6', '{unreadable'));
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.budget-workspace .record-error');
    assert.equal(await page.evaluate(() => localStorage.getItem('exchangetime.personal-budget.v6')), '{unreadable');
    await page.evaluate(() => localStorage.setItem('exchangetime.personal-budget.v6', JSON.stringify({
      currency: 'EUR', fixedCosts: [], fixedCostMode: 'total', fixedCostTotal: 100,
      incomeBasis: 'annual', incomeSources: [{id: 'test', name: 'Test income', amount: 12000}],
      reserveCash: 0, variableCosts: 200, reserveTargetMonths: 6, targetInvestmentPct: 60,
    })));
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('.budget-export-bar')?.textContent.includes('Saved on this device'));
    assert.equal(await page.$('.record-error'), null);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('exchangetime.personal-budget.v6')).incomeSources[0].amount), 12000);
    assert.match(await page.$eval('.budget-workspace', node => node.textContent), /700/);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: corrupt budget preserved; valid annual-income budget restored');
  }
} finally { await browser.close(); }
