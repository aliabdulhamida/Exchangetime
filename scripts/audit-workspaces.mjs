import { readdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

import { workspaces } from '../components/exchangetime/product-model.ts';

const base = 'http://localhost:3000';
const browser = await puppeteer.launch();
const results = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const articles = await readdir(new URL('../app/blog/', import.meta.url), { withFileTypes: true });
  const pages = [
    ...workspaces.map(item => ['/dashboard?view=' + item.key, item.label, item.key]),
    ...['/', '/tools', '/blog', '/settings/privacy-policy', ...articles.filter(item => item.isDirectory()).map(item => '/blog/' + item.name)].map(path => [path, path]),
  ];
  for (const [path, label, key] of pages) {
    errors.length = 0;
    try {
      const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!response?.ok()) throw new Error('HTTP ' + response?.status());
      await page.waitForSelector('main h1, article h1, h1', { timeout: 10000 });
      if (key) await page.waitForFunction(
        name => {
          const workspace = document.querySelector('[data-workspace="' + name + '"]');
          return workspace && !workspace.innerText.includes('Loading workspace…') && !workspace.innerText.includes('Choose a workspace from navigation.') &&
            (workspace.innerText.trim().length > 0 || workspace.querySelector('iframe,canvas,svg'));
        }, { timeout: 15000 }, key);
      if (await page.$eval('body', body => body.innerText.includes('This workspace could not render.'))) throw new Error('Workspace error boundary');
      results.push({ label, status: 'rendered', errors: [...errors] });
    } catch (error) { results.push({ label, status: error.message, errors: [...errors] }); }
    console.log(JSON.stringify(results.at(-1)));
  }
  const failed = results.filter(result => result.status !== 'rendered' || result.errors.length);
  console.log('Routes:', results.length, 'with errors:', failed.length);
  if (failed.length) process.exitCode = 1;
} finally { await browser.close(); }
