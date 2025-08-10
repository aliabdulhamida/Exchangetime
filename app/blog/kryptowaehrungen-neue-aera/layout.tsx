import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Cryptocurrencies: A New Era of Trading? | Exchangetime',
  description: 'How crypto reshapes markets, risks, and opportunities for traders and investors.',
  openGraph: {
    type: 'article',
    title: 'Cryptocurrencies: A New Era of Trading? | Exchangetime',
    description: 'How crypto reshapes markets, risks, and opportunities for traders and investors.',
    url: 'https://exchangetime.com/blog/kryptowaehrungen-neue-aera',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=1200&h=675',
        width: 1200,
        height: 675,
        alt: 'Cryptocurrency trading concept',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cryptocurrencies: A New Era of Trading? | Exchangetime',
    description: 'How crypto reshapes markets, risks, and opportunities for traders and investors.',
    images: [
      'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=1200&h=675',
    ],
  },
};

export default function BlogPostLayout({ children }: { children: ReactNode }) {
  return children;
}
