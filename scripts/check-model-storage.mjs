import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const [view, key] of [['DCFCalculator', 'exchangetime_dcf_v1'], ['OptionsPayoffLab', 'exchangetime.options-payoff-lab.v3.settings']]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width: 390, height: 900});
    await page.evaluateOnNewDocument(storageKey => localStorage.setItem(storageKey, '{broken'), key);
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=' + view);
    await page.waitForSelector('[aria-label="Model storage warning"]');
    assert.equal(await page.evaluate(storageKey => localStorage.getItem(storageKey), key), '{broken');
    const input = await page.$('.workspace-content input[type=number]');
    await input.click({clickCount: 3});
    await page.keyboard.press('Backspace');
    await input.type('12');
    assert.equal(await page.evaluate(storageKey => localStorage.getItem(storageKey), key), '{broken');
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(view + ': unreadable saved model retained after input changes');
  }
} finally { await browser.close(); }
