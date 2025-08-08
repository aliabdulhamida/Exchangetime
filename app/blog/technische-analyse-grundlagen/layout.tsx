import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Technical Analysis: Fundamentals for Beginners | Exchangetime",
  description: "Learn the foundations of technical analysis: patterns, indicators, and more.",
  openGraph: {
    type: "article",
    title: "Technical Analysis: Fundamentals for Beginners | Exchangetime",
    description: "Learn the foundations of technical analysis: patterns, indicators, and more.",
    url: "https://exchangetime.com/blog/technische-analyse-grundlagen",
    images: [
      {
        url: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=1200&h=675",
        width: 1200,
        height: 675,
        alt: "Technical Analysis Chart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Technical Analysis: Fundamentals for Beginners | Exchangetime",
    description: "Learn the foundations of technical analysis: patterns, indicators, and more.",
    images: [
      "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=1200&h=675",
    ],
  },
};

export default function BlogPostLayout({ children }: { children: ReactNode }) {
  return children;
}
