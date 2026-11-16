import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';

import './globals.css';
import '@/styles/terminal.css';
import '@/styles/product.css';
import '@/styles/button-animations.css';
import '@/styles/toggle-button.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const geistSans = localFont({
  src: '../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2',
  variable: '--font-display',
});

const geistMono = localFont({
  src: '../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Exchange Time',
  description: 'Global Market Intelligence Dashboard',
  icons: {
    icon: '/et-logo.png',
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
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Exchangetime" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          storageKey="et-appearance"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>

        {/* Global Toasts */}
        <Toaster />


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
      </body>
    </html>
  );
}
