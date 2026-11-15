'use client';
import type { ReactNode } from 'react';
import Layout from '@/components/exchangetime/layout';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}
