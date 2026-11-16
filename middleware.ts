import { NextRequest, NextResponse } from 'next/server';

import { blockedProbe, requestLimit } from './lib/request-security';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (blockedProbe(path)) return new NextResponse('Not found', { status: 404 });
  if (!path.startsWith('/api/')) return NextResponse.next();
  if (path === '/api/pdf' || path.startsWith('/api/pdf/'))
    return new NextResponse('PDF export removed', { status: 410 });
  if (request.url.length > 8192) return new NextResponse('URI too long', { status: 414 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 65536) return new NextResponse('Request too large', { status: 413 });
  if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(request.method))
    return new NextResponse('Method not allowed', { status: 405 });
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin)
      return new NextResponse('Origin not allowed', { status: 403 });
  }
  const ip =
    process.env.VERCEL === '1'
      ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      : 'local';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const key = Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join(
    '',
  );
  try {
    if (!(await requestLimit(key)))
      return new NextResponse('Too many requests', {
        status: 429,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      });
  } catch {
    return new NextResponse('Please retry later', {
      status: 503,
      headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/wp-admin/:path*',
    '/wp-includes/:path*',
    '/wp-login.php',
    '/xmlrpc.php',
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.env.development',
    '/.git/:path*',
    '/vendor/phpunit/:path*',
  ],
};
