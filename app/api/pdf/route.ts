import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

// Contract:
// GET /api/pdf?url=<absolute_url>
// Returns application/pdf of the rendered page (article area preferred if selector provided later)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url || !/^https?:\/\//i.test(url)) {
      return new NextResponse('Missing or invalid url', { status: 400 });
    }

    const tryPaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      (puppeteer as any).executablePath ? (puppeteer as any).executablePath() : undefined,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ].filter(Boolean) as string[];

    let browser;
    let lastError: any = null;
    // Try explicit executable paths first
    for (const p of tryPaths) {
      try {
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
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
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
          headless: true,
          channel: 'chrome',
        } as any);
      } catch (e) {
        lastError = e;
      }
    }

    if (!browser) {
      console.error('Failed to launch browser', lastError);
      return new NextResponse(
        process.env.NODE_ENV !== 'production'
          ? `Failed to launch Chrome for PDF. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH. Error: ${String(lastError)}`
          : 'Failed to generate PDF',
        { status: 500 }
      );
    }

    const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // give the page a short moment to settle for client-side rendered parts
  await new Promise((r) => setTimeout(r, 500));

    // Prefer printing only the article area if present
    // Ensure print CSS
    await page.addStyleTag({ content: `
      @page { size: A4; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print, .reading-progress-container, .back-to-top { display: none !important; }
    `});

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

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    await browser.close();
  return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="article.pdf"'
      }
    });
  } catch (e: any) {
  console.error('PDF API error', e);
  const message = process.env.NODE_ENV !== 'production' && e ? String(e?.message || e) : 'Failed to generate PDF';
  return new NextResponse(message, { status: 500 });
  }
}
