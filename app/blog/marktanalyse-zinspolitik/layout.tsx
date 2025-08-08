import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Market Analysis: Interest Rate Policy Impact | Exchangetime",
  description: "How central bank rate decisions affect equities, bonds, and FX markets.",
  openGraph: {
    type: "article",
    title: "Market Analysis: Interest Rate Policy Impact | Exchangetime",
    description: "How central bank rate decisions affect equities, bonds, and FX markets.",
    url: "https://exchangetime.com/blog/marktanalyse-zinspolitik",
    images: [
      {
        url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&h=675",
        width: 1200,
        height: 675,
        alt: "Central Bank and Market Symbols",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Analysis: Interest Rate Policy Impact | Exchangetime",
    description: "How central bank rate decisions affect equities, bonds, and FX markets.",
    images: [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&h=675",
    ],
  },
};

export default function BlogPostLayout({ children }: { children: ReactNode }) {
  return children;
}
