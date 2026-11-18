import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';

const directory = await mkdtemp(path.join(tmpdir(), 'et-backup-test-'));
const file = path.join(directory, 'backup.json');
await writeFile(file, JSON.stringify({format: 'exchange-time/personal', version: 1, records: {
  portfolioBaseCurrency: 'USD', 'et.goals.v1': '[]',
}}));
const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    await page.goto((process.env.CHECK_BASE_URL || 'http://localhost:3000') + '/dashboard?view=LoanPlanner');
    await page.waitForSelector('.planner-fields');
    await page.evaluate(() => {
      localStorage.setItem('portfolioBaseCurrency', 'EUR');
      localStorage.setItem('et.goals.v1', JSON.stringify([{id: 'test', name: 'Test goal', target: 100,
        saved: 0, years: 1, rate: 0, inflation: 0}]));
      window.dispatchEvent(new Event('et-settings'));
    });
    await page.waitForSelector('section[aria-label="Personal data backup"] input[type=file]');
    await page.click('.preferences-backup summary');
    await (await page.$('section[aria-label="Personal data backup"] input[type=file]')).uploadFile(file);
    await page.waitForSelector('.backup-restore-preview');
    assert.equal(await page.$eval('.backup-restore-preview button.primary', node => node.disabled), true);
    await page.click('.backup-restore-preview fieldset input');
    assert.equal(await page.$eval('.backup-restore-preview button.primary', node => node.disabled), true);
    await page.click('.backup-replace-confirm input');
    await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded'}), page.click('.backup-restore-preview button.primary')]);
    assert.equal(await page.evaluate(() => localStorage.getItem('portfolioBaseCurrency')), 'USD');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('et.goals.v1')).length), 1);
    await context.close();
    console.log(width + 'px: explicit group selection and confirmation preserve unselected data');
  }
} finally { await browser.close(); await rm(directory, {recursive: true, force: true}); }
