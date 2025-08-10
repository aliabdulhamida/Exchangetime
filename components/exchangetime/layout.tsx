'use client';

import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import DownloadAppOverlay from '@/components/DownloadAppOverlay';

import TopNav from './top-nav';

interface LayoutProps {
  children: ReactNode;
  sidebar?: React.ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  const { theme } = useTheme();
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
      <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''}`}>
        {sidebar}
        <div className="w-full flex flex-1 flex-col">
          {/* Sticky/fixed Header */}
          <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] fixed top-0 left-0 w-full z-50">
            <TopNav />
          </header>
          {/* Kein Padding-Top mehr, damit Content ganz oben steht */}
          <main className="flex-1 overflow-auto p-6 bg-white dark:bg-[#0F0F12] mt-16">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
