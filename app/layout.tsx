import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Exchange Time",
  description: "Global Market Intelligence Dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Exchangetime" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-icon-180x180.png" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8377777238288489"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        {/* Service Worker Registrierung für PWA */}
        <Script id="pwa-sw-register" strategy="afterInteractive">
          {`
            if (typeof window !== "undefined" && "serviceWorker" in navigator) {
              window.addEventListener("load", () => {
                navigator.serviceWorker.register("/service-worker.js");
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
