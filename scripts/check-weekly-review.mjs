import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';
const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(base + '/blog', { waitUntil: 'networkidle2' });
    assert.equal(response.status(), 200);
    const selector = 'a[href="/blog/weekly/2026-11-13"]';
    await page.waitForSelector(selector);
    await page.type('input[placeholder="Company, topic, or strategy"]', 'Market Week');
    await page.waitForFunction(() => document.querySelectorAll('.blog-card').length === 1);
    await page.select('.terminal-label select', 'Weekly Review');
    await page.select('#month', '2026-11');
    await page.click(selector);
    await page.waitForSelector('article tbody tr');
    assert.equal(await page.$eval('article', (article) => article.lang), 'en');
    await page.waitForFunction(() => {
      const image = document.querySelector('article figure img');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.match(await page.$eval('article', (article) => article.className), /prose/);
    assert.ok(
      await page.$eval(
        'article h1',
        (heading) => parseFloat(getComputedStyle(heading).fontSize) >= 32,
      ),
    );
    assert.ok(
      await page.$eval('article', (article) => article.getBoundingClientRect().width <= 861),
    );
    assert.match(
      await page.$eval('article figcaption', (caption) => caption.textContent),
      /AI-generated/,
    );
    assert.match(page.url(), /\/blog\/weekly\/2026-11-13$/);
    assert.equal(await page.$$eval('article tbody tr', (rows) => rows.length), 3);
    assert.equal(await page.$$eval('article li[id^="source-"]', (sources) => sources.length), 6);
    const broken = await page.$$eval(
      'article a[href^="#source-"]',
      (links) => links.filter((link) => !document.getElementById(link.hash.slice(1))).length,
    );
    assert.equal(broken, 0);
    assert.equal(
      await page.$eval('article', (article) => article.scrollWidth > article.clientWidth + 1),
      false,
    );
    assert.deepEqual(errors, []);
    assert.equal(
      await page.$$eval(
        'script[src]',
        (scripts) =>
          scripts.filter((script) =>
            /googlesyndication|vercel-insights|speed-insights/.test(script.src),
          ).length,
      ),
      0,
    );
    await page.screenshot({ path: '/tmp/exchangetime-weekly-' + width + '.png' });
    for (const route of ['/impressum', '/settings/privacy-policy', '/redaktion']) {
      const legal = await page.goto(base + route, { waitUntil: 'networkidle2' });
      assert.equal(legal.status(), 200);
      await page.waitForSelector(
        'footer[aria-label="Legal information"] a[href="/impressum"]',
      );
      if (route !== '/redaktion') await page.waitForSelector('article [role="alert"]');
    }
    console.log(
      width +
        'px: archive listing, text/topic/month filters, article, 3 indices and 6 sources passed',
    );
    await page.close();
  }
} finally {
  await browser.close();
}
