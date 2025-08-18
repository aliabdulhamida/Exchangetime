import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
// TEMP: disable next/font/google to isolate build error
import { Inter } from 'next/font/google';
import Script from 'next/script';

import './globals.css';
import '@/styles/button-animations.css';
import '@/styles/toggle-button.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Exchange Time',
  description: 'Global Market Intelligence Dashboard',
  icons: {
    apple: '/apple-icon-180x180.png',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Exchangetime" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>

        {/* Global Toasts */}
        <Toaster />

        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8377777238288489"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Service Worker: enable only in production to avoid dev HMR/cache conflicts */}
        {process.env.NODE_ENV === 'production' && (
          <Script id="pwa-sw-register" strategy="afterInteractive">
            {`
              if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
                });
              }
            `}
          </Script>
        )}

        {/* Dev-only: proactively unregister any existing service workers and clear caches */}
        {process.env.NODE_ENV !== 'production' && (
          <Script id="pwa-sw-dev-unregister" strategy="afterInteractive">
            {`
              (function(){
                if (typeof window === 'undefined') return;
                // Unregister all service workers in dev to prevent stale _next chunk caching
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations?.().then(regs => {
                    regs.forEach(r => r.unregister().catch(() => {}));
                  }).catch(() => {});
                }
                // Clear caches used by prior SWs
                if (window.caches && caches.keys) {
                  caches.keys().then(keys => {
                    keys.forEach(k => caches.delete(k).catch(() => {}));
                  }).catch(() => {});
                }
              })();
            `}
          </Script>
        )}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
