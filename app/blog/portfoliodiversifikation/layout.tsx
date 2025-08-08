import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Portfolio Diversification in Uncertain Times | Exchangetime",
  description: "Practical ways to diversify across assets, sectors, regions, and factors.",
  openGraph: {
    type: "article",
    title: "Portfolio Diversification in Uncertain Times | Exchangetime",
    description: "Practical ways to diversify across assets, sectors, regions, and factors.",
    url: "https://exchangetime.com/blog/portfoliodiversifikation",
    images: [
      {
        url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&h=675",
        width: 1200,
        height: 675,
        alt: "Portfolio diversification concept",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio Diversification in Uncertain Times | Exchangetime",
    description: "Practical ways to diversify across assets, sectors, regions, and factors.",
    images: [
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&h=675",
    ],
  },
};

export default function BlogPostLayout({ children }: { children: ReactNode }) {
  return children;
}
