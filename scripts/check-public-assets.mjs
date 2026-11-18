import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
const slugs = ['eur-usd', 'gbp-usd', 'bitcoin', 'sp-500', 'apple', 'microsoft'];
const browser = await puppeteer.launch();
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setJavaScriptEnabled(false);
  for (const slug of slugs) {
    const response = await page.goto(base + '/dashboard/' + slug, {waitUntil: 'domcontentloaded'});
    assert.equal(response.status(), 200);
    assert.equal(await page.$eval('link[rel=canonical]', node => node.href), 'https://www.exchangetime.de/dashboard/' + slug);
    assert.ok(await page.$eval('.asset-context', node => node.textContent.length > 300));
    assert.ok(await page.$eval('.asset-page-heading h1', node => node.textContent.length > 0));
    const structured = JSON.parse(await page.$eval('script[type="application/ld+json"]', node => node.textContent));
    const questions = structured['@graph'].find(item => item['@type'] === 'FAQPage').mainEntity;
    const visible = await page.$eval('.asset-faq', node => node.textContent);
    assert.ok(questions.every(question => visible.includes(question.name) && visible.includes(question.acceptedAnswer.text)));
    assert.equal(await page.$$eval('.asset-discovery a', nodes => nodes.length), 5);
    console.log(slug + ': content, canonical, FAQ and links readable without JavaScript');
  }
  const missing = await page.goto(base + '/dashboard/not-a-listed-asset', {waitUntil: 'domcontentloaded'});
  assert.equal(missing.status(), 404);
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.ok(slugs.every(slug => sitemap.includes('/dashboard/' + slug)));
  assert.ok(!sitemap.includes('view=PortfolioTracker'));
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.ok(robots.includes('Sitemap: https://www.exchangetime.de/sitemap.xml'));
  await page.goto(base + '/dashboard', {waitUntil: 'domcontentloaded'});
  assert.equal(await page.$$eval('.asset-discovery a', nodes => nodes.length), 6);
  await context.close();
  for (const width of [390, 1440]) {
    const interactive = await browser.createBrowserContext();
    const tab = await interactive.newPage();
    await tab.setViewport({width, height: 900});
    await tab.goto(base + '/dashboard/eur-usd', {waitUntil: 'domcontentloaded'});
    await tab.waitForSelector('[aria-label="Asset chart timeframe"]');
    await tab.click('[aria-label="Asset chart timeframe"] button:last-child');
    await tab.waitForSelector('[aria-label="Asset chart timeframe"] button:last-child[aria-pressed=true]');
    assert.equal(await tab.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    await tab.screenshot({path: '/tmp/public-asset-' + width + '.png'});
    await interactive.close();
    console.log(width + 'px: timeframe control and asset layout passed');
  }
} finally { await browser.close(); }
