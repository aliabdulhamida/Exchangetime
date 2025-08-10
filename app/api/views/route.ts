import { NextRequest, NextResponse } from 'next/server';

import baseViews from '@/data/views.json';

// App Router: Keine statische Zwischenspeicherung dieser Route
export const dynamic = 'force-dynamic';

type ViewsMap = Record<string, number>;

// Flüchtiger In-Memory-Store (pro Server-Prozess). In Serverless-Umgebungen nicht persistent.
const globalAny = globalThis as unknown as { __viewsStore?: ViewsMap };
if (!globalAny.__viewsStore) globalAny.__viewsStore = { ...baseViews } as ViewsMap;
const store = globalAny.__viewsStore as ViewsMap;

function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === 'string' &&
    slug.length > 0 &&
    slug.length <= 256 &&
    // einfache Absicherung gegen problematische Zeichen
    /^[A-Za-z0-9\-/_]+$/.test(slug)
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  // Wenn slug angegeben: nur diesen Eintrag liefern, sonst komplette Map
  if (slug) {
    const value = store[slug] ?? (baseViews as ViewsMap)[slug] ?? 0;
    return new NextResponse(JSON.stringify({ slug, views: value }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new NextResponse(JSON.stringify(store), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // komplette Liste kann kurz gecacht werden, hier bewusst no-store
      'Cache-Control': 'no-store',
    },
  });
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const value = slug ? (store[slug] ?? (baseViews as ViewsMap)[slug] ?? 0) : 0;
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Views': String(value),
      'Cache-Control': 'no-store',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET,POST,HEAD,OPTIONS',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('content-type')?.includes('application/json') !== true) {
      return NextResponse.json({ error: 'unsupported content-type' }, { status: 415 });
    }
    const body = await request.json();
    const slug = body?.slug;
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
    }
    const current = store[slug] ?? (baseViews as ViewsMap)[slug] ?? 0;
    const next = current + 1;
    store[slug] = next;
    return NextResponse.json(
      { slug, views: next },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}
