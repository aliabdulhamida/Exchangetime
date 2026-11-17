import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
try {
  for (const touch of [true, false]) {
    const page = await browser.newPage();
    await page.setViewport({ width: touch ? 390 : 1440, height: 844, hasTouch: touch, isMobile: touch });
    await page.goto(base + '/dashboard?view=CompoundInterest', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.compound-workspace form input');
    const inputs = await page.$$('.compound-workspace form input[type="number"]');
    await inputs[0].click();
    if (!touch) {
      assert.equal(await page.$('.numeric-keypad'), null);
    } else {
      await page.waitForSelector('.numeric-keypad');
      await page.click('.numeric-keypad button[aria-label="2"]');
      await page.click('.numeric-keypad button[aria-label="5"]');
      await page.click('.numeric-keypad button[aria-label="0"]');
      await page.click('h1');
      assert.ok(await page.$('.numeric-keypad [role="alert"]'));
      assert.equal(await inputs[0].evaluate(node => node.value), '0');
      await page.click('.numeric-keypad footer button:nth-child(3)');
      assert.equal(await inputs[0].evaluate(node => node.value), '250');
      assert.equal(await page.$eval('.numeric-keypad header span', node => node.textContent.trim()), 'Contribution Amount');
      await page.click('.numeric-keypad [aria-label="Cancel number entry"]');
      await inputs[0].click();
      await page.click('.numeric-keypad button[aria-label="3"]');
      assert.equal(await page.$eval('.numeric-keypad output', node => node.textContent), '3');
      await page.click('.numeric-keypad .keypad-done');
      assert.equal(await inputs[0].evaluate(node => node.value), '3');
      assert.equal(await page.$('.numeric-keypad'), null);
      await page.goto(base + '/dashboard?view=CurrencyConverter', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#currency-amount');
      await page.click('#currency-amount');
      await page.waitForSelector('.numeric-keypad');
      for (const digit of '1000') await page.click('.numeric-keypad button[aria-label="' + digit + '"]');
      await page.click('.numeric-keypad .keypad-done');
      await page.click('#currency-amount');
      assert.equal(await page.$eval('.numeric-keypad output', node => node.textContent), '1000');
      await page.click('.numeric-keypad .keypad-done');
      assert.equal(await page.$eval('#currency-amount', node => node.value.replaceAll(',', '')), '1000');
    }
    await page.close();
    console.log((touch ? 'Touch' : 'Desktop') + ': number entry passed');
  }
} finally { await browser.close(); }
