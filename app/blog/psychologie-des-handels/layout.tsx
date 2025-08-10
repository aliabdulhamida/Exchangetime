import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'The Psychology of Trading: Keeping Emotions Under Control | Exchangetime',
  description: 'Understand emotions, biases, and routines to improve your trading performance.',
  openGraph: {
    type: 'article',
    title: 'The Psychology of Trading: Keeping Emotions Under Control | Exchangetime',
    description: 'Understand emotions, biases, and routines to improve your trading performance.',
    url: 'https://exchangetime.com/blog/psychologie-des-handels',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&h=675',
        width: 1200,
        height: 675,
        alt: 'Psychology of trading concept',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Psychology of Trading: Keeping Emotions Under Control | Exchangetime',
    description: 'Understand emotions, biases, and routines to improve your trading performance.',
    images: [
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&h=675',
    ],
  },
};

export default function BlogPostLayout({ children }: { children: ReactNode }) {
  return children;
}
