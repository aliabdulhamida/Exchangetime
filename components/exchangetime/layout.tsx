'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import DownloadAppOverlay from '@/components/DownloadAppOverlay';

import TopNav from './top-nav';

interface LayoutProps {
  children: ReactNode;
  sidebar?: React.ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <DownloadAppOverlay />
      <div className="et-app-shell flex h-screen">
        {sidebar}
        <div className="relative flex w-full flex-1 flex-col">
          <header className="et-topbar fixed left-0 top-0 z-50 h-16 w-full">
            <TopNav />
          </header>
          <main className="et-scrollbar relative mt-16 flex-1 overflow-auto px-2 pb-5 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pb-8">
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
