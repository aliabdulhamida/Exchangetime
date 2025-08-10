import { NextRequest, NextResponse } from 'next/server';

// Contract:
// GET /api/pdf?url=<absolute_url>
// Returns application/pdf of the rendered page (article area preferred if selector provided later)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Allow more time on serverless (where supported)
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url || !/^https?:\/\//i.test(url)) {
      return new NextResponse('Missing or invalid url', { status: 400 });
    }

    // Decide environment: production serverless vs local/dev
    const isProd = process.env.NODE_ENV === 'production';

    // We'll try a production-safe Chromium first when in prod (e.g., Vercel serverless)
    // using @sparticuz/chromium with puppeteer-core. Fallback to full puppeteer locally.
    let browser: any = null;
    let lastError: any = null;

    if (isProd) {
      try {
        const chromium: any = await import('@sparticuz/chromium');
        const puppeteerCore: any = await import('puppeteer-core');
        // Ensure headless mode
        if (typeof chromium.setHeadlessMode === 'function') chromium.setHeadlessMode = true as any;
        const executablePath = await (chromium.executablePath?.() ?? chromium.executablePath);
        browser = await puppeteerCore.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          headless: true,
        });
      } catch (e) {
        lastError = e;
      }
    }

    // Dev or fallback: try full puppeteer with common executable paths
    if (!browser) {
      try {
        const puppeteerMod: any = await import('puppeteer');
        const launch = puppeteerMod.launch ?? puppeteerMod.default?.launch;
        const getExecutablePath =
          puppeteerMod.executablePath ?? puppeteerMod.default?.executablePath;

        const tryPaths = [
          process.env.PUPPETEER_EXECUTABLE_PATH,
          typeof getExecutablePath === 'function' ? getExecutablePath() : undefined,
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
        ].filter(Boolean) as string[];

        for (const p of tryPaths) {
          try {
            browser = await launch({
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
              headless: true,
              executablePath: p,
            });
            break;
          } catch (e) {
            lastError = e;
          }
        }

        // Fallback: use installed Chrome channel if available
        if (!browser) {
          try {
            browser = await launch({
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
              headless: true,
              channel: 'chrome',
            } as any);
          } catch (e) {
            lastError = e;
          }
        }
      } catch (e) {
        lastError = e;
      }
    }

    if (!browser) {
      console.error('Failed to launch browser', lastError);
      return new NextResponse(
        isProd
          ? 'Failed to generate PDF'
          : `Failed to launch Chrome for PDF. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH. Error: ${String(lastError)}`,
        { status: 500 },
      );
    }

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // give the page a short moment to settle for client-side rendered parts
    await new Promise((r) => setTimeout(r, 500));

    // Prefer printing only the article area if present
    // Ensure print CSS
    await page.addStyleTag({
      content: `
      @page { size: A4; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print, .reading-progress-container, .back-to-top { display: none !important; }
    `,
    });

    // Try to focus article
    const hasArticle = await page.$('article');
    if (hasArticle) {
      await page.evaluate(() => {
        const a = document.querySelector('article');
        if (!a) return;
        const wrap = document.createElement('div');
        wrap.id = '__pdf_wrap__';
        wrap.style.padding = '0';
        wrap.appendChild(a.cloneNode(true));
        document.body.innerHTML = '';
        document.body.appendChild(wrap);
      });
    }

    const pdf = (await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    })) as unknown as Uint8Array | Buffer | ArrayBuffer;

    await browser.close();
    if (!pdf) {
      throw new Error('Failed to generate PDF (empty result)');
    }
    // NextResponse accepts Uint8Array/Buffer directly
    const body: any = pdf instanceof ArrayBuffer ? new Uint8Array(pdf) : (pdf as any);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="article.pdf"',
      },
    });
  } catch (e: any) {
    console.error('PDF API error', e);
    const message =
      process.env.NODE_ENV !== 'production' && e
        ? String(e?.message || e)
        : 'Failed to generate PDF';
    return new NextResponse(message, { status: 500 });
  }
}
