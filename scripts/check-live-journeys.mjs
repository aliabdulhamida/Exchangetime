import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:3000/tools', { waitUntil: 'domcontentloaded' });
    await page.type('[aria-label="Find a workspace"]', 'identical trading');
    const tool = await page.waitForSelector('.directory-group a[href*="AssetComparison"]');
    await tool.click();
    await page.waitForSelector('.compare-form input');
    const [first, second] = await page.$$('.compare-form input');
    await first.type('AAPL');
    await second.type('MSFT');
    await page.click('.compare-form button');
    await page.waitForFunction(() => document.querySelector('.comparison-values') ||
      document.querySelector('.compare-workspace')?.innerText.includes('Latest request unavailable'), { timeout: 45000 });
    const liveResult = await page.$eval('.compare-workspace', node => node.innerText);
    assert.ok(liveResult.includes('common dates'), liveResult);
    console.log(width, await page.$eval('.comparison-header', node => node.innerText));
    await page.click('.workspace-pin');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.workspace-pin[aria-pressed="true"]');
    if (width === 390) await page.click('.terminal-bottom-nav a[href="/tools"]');
    else await page.click('.terminal-nav a[href="/tools"]');
    await page.waitForSelector('[aria-label="Filter by area"]');
    await page.select('[aria-label="Filter by area"]', 'pinned');
    assert.ok(await page.waitForSelector('.directory-group a[href*="AssetComparison"]'));
    await page.select('[aria-label="Filter by area"]', 'Personal Finance');
    await page.click('.directory-group a[href*="LoanPlanner"]');
    await page.waitForSelector('.planner-result');
    assert.equal(await page.$$eval('.planner-field input', inputs => inputs.every(input => input.value === '')), true);
    const overflow = await page.$eval('.terminal-main', element => element.scrollWidth - element.clientWidth);
    assert.ok(overflow <= 1, 'Unexpected document overflow: ' + overflow);
    await context.close();
  }
} finally { await browser.close(); }
