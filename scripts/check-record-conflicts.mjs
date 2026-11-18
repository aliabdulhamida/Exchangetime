import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  const context = await browser.createBrowserContext();
  const first = await context.newPage();
  first.setDefaultNavigationTimeout(20000);
  const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
  await first.goto(base + '/dashboard?view=NetWorth');
  await first.waitForSelector('.net-worth-summary');
  await first.evaluate(() => localStorage.setItem('et.networth.v1', JSON.stringify([
    {id: 'fixture', name: 'Test savings', kind: 'asset', category: 'Cash', value: 100},
  ])));
  await first.reload({waitUntil: 'domcontentloaded'});
  await first.waitForSelector('[aria-label="Remove Test savings"]');
  console.log('Initial records loaded');
  const second = await context.newPage();
  await second.goto(base + '/dashboard?view=NetWorth');
  await second.waitForSelector('[aria-label="Remove Test savings"]');
  await second.evaluate(() => localStorage.setItem('et.networth.v1', JSON.stringify([
    {id: 'fixture', name: 'Test savings', kind: 'asset', category: 'Cash', value: 200},
  ])));
  await first.waitForSelector('.record-error');
  console.log('External change detected');
  await first.bringToFront();
  assert.match(await first.$eval('.record-error', node => node.textContent), /another tab/);
  first.on('dialog', dialog => dialog.accept());
  await first.click('[aria-label="Remove Test savings"]');
  console.log('Conflicting delete rejected');
  assert.equal(await first.evaluate(() => JSON.parse(localStorage.getItem('et.networth.v1'))[0].value), 200);
  await first.click('.record-error button');
  await first.waitForSelector('.record-error', {hidden: true});
  await first.waitForFunction(() => document.querySelector('.net-worth-summary')?.textContent.includes('200'));
  console.log('Cross-tab changes preserved; recovery reload restores latest records');
  await context.close();
} finally { await browser.close(); }
