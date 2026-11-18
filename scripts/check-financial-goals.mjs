import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=FinancialGoals');
    await page.waitForSelector('#financial-goal-name');
    await page.type('#financial-goal-name', 'Test goal');
    const inputs = await page.$$('form input[type=number]');
    for (const [index, value] of ['12000', '6000', '1', '0', '0'].entries()) {
      await inputs[index].click({clickCount: 3});
      await page.keyboard.press('Backspace');
      await inputs[index].type(value);
    }
    await page.waitForSelector('.goal-preview');
    assert.match(await page.$eval('.goal-preview-amount', node => node.textContent), /500/);
    await page.click('.goal-projection-details summary');
    await page.waitForSelector('.goal-projection-details .recharts-wrapper');
    await page.click('form button.primary');
    await page.waitForSelector('progress');
    assert.equal(await page.$eval('progress', node => node.value / node.max), .5);
    assert.match(await page.$eval('.goal-progress-label', node => node.textContent), /50%/);
    assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await page.screenshot({path: '/tmp/goal-preview-' + width + '.png'});
    await context.close();
    console.log(width + 'px: goal preview, projection and saved progress passed');
  }
} finally { await browser.close(); }
