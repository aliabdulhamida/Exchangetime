import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const base = process.env.CHECK_BASE_URL || 'http://localhost:3000';
const preview = process.env.CHECK_AD_PREVIEW === '1';
const browser = await puppeteer.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 900});
    const advertisingRequests = [];
    page.on('request', request => {
      if (/googlesyndication\.com|doubleclick\.net|fundingchoicesmessages\.google\.com/.test(request.url())) advertisingRequests.push(request.url());
    });
    for (const [route, placement] of [['/dashboard?view=MarketOverview', 'overview'], ['/dashboard/eur-usd', 'assetContent']]) {
      await page.goto(base + route, {waitUntil: 'domcontentloaded'});
      if (preview) {
        const selector = '[data-ad-placement="' + placement + '"]';
        await page.waitForSelector(selector);
        await page.$eval(selector, node => node.scrollIntoView({block: 'center'}));
        const metrics = await page.$eval(selector, node => ({
          mode: node.dataset.adMode,
          height: node.querySelector('.ad-slot-body').getBoundingClientRect().height,
          slot: node.querySelector('[data-ad-slot]')?.dataset.adSlot,
        }));
        assert.equal(metrics.mode, 'preview');
        assert.equal(metrics.slot, '1234567890');
        const expectedHeight = placement === 'overview' ? width < 768 ? 100 : 90 : 250;
        assert.ok(Math.abs(metrics.height - expectedHeight) < 1);
        assert.equal(await page.$('ins.adsbygoogle'), null);
        if (placement === 'assetContent') await page.screenshot({path: '/tmp/ad-preview-' + width + '.png'});
      } else {
        await page.waitForSelector('h1');
        assert.equal(await page.$('.ad-slot'), null);
      }
      assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth + 1), false);
    }
    assert.deepEqual(advertisingRequests, []);
    await context.close();
    console.log(width + 'px: ' + (preview ? 'reserved preview dimensions' : 'disabled slots without gaps') + ', no advertising requests');
  }
} finally { await browser.close(); }
