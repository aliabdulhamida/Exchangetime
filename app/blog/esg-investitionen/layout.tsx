import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'ESG Investments: Sustainability as a Growth Driver | Exchangetime',
  description:
    'ESG investing has evolved into a mainstream approach. Learn how sustainability factors drive risk mitigation, efficiency, and growth opportunities.',
  openGraph: {
    type: 'article',
    title: 'ESG Investments: Sustainability as a Growth Driver | Exchangetime',
    description:
      'ESG investing has evolved into a mainstream approach. Learn how sustainability factors drive risk mitigation, efficiency, and growth opportunities.',
    url: 'https://exchangetime.com/blog/esg-investitionen',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&h=675',
        width: 1200,
        height: 675,
        alt: 'ESG investment concept with wind turbines and green technology',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ESG Investments: Sustainability as a Growth Driver | Exchangetime',
    description:
      'ESG investing has evolved into a mainstream approach. Learn how sustainability factors drive risk mitigation, efficiency, and growth opportunities.',
    images: [
      'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&h=675',
    ],
  },
};

export default function BlogPostLayout({ children }: { children: ReactNode }) {
  return children;
}
