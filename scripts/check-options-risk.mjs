import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.evaluateOnNewDocument(() => localStorage.setItem('exchangetime.options-payoff-lab.v3.settings', JSON.stringify({
      spot: 100, expiryPrice: 100, presetKey: 'custom',
      legs: [{id: 'test', type: 'call', side: 'short', strike: 100, premium: 2, qty: 1, multiplier: 100}],
    })));
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=OptionsPayoffLab');
    await page.waitForSelector('[aria-label="Options strategy preset"]');
    await page.waitForFunction(() => document.querySelector('[aria-label="Options strategy preset"]')?.value === 'custom');
    page.once('dialog', dialog => dialog.dismiss());
    await page.select('[aria-label="Options strategy preset"]', 'long_call');
    assert.equal(await page.$eval('[aria-label="Options strategy preset"]', node => node.value), 'custom');
    await page.$$eval('button', nodes => nodes.find(node => node.textContent.trim() === 'Results' && node.getBoundingClientRect().width > 0).click());
    await page.waitForSelector('.options-risk-alert', {visible: true});
    assert.match(await page.$eval('.options-risk-alert', node => node.textContent), /Unlimited loss potential/);
    assert.equal(await page.$$eval('.options-model-toolbar button', nodes => nodes.length), 2);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await context.close();
    console.log(width + 'px: preset cancellation preserves legs and unbounded-loss warning stays visible');
  }
} finally { await browser.close(); }
