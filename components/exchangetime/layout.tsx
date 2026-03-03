'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import DownloadAppOverlay from '@/components/DownloadAppOverlay';

import TopNav from './top-nav';

interface LayoutProps {
  children: ReactNode;
  sidebar?: React.ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [isTopbarHiddenMobile, setIsTopbarHiddenMobile] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollTopRef = useRef(0);
  const rafPendingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl || typeof window === 'undefined') {
      return;
    }

    const mobileQuery = window.matchMedia('(max-width: 1023px)');
    const scrollDeltaThreshold = 8;

    const syncTopbarByScroll = () => {
      if (!mobileQuery.matches) {
        setIsTopbarHiddenMobile(false);
        lastScrollTopRef.current = mainEl.scrollTop;
        return;
      }

      const currentTop = Math.max(mainEl.scrollTop, 0);
      const delta = currentTop - lastScrollTopRef.current;

      if (currentTop <= 12) {
        setIsTopbarHiddenMobile(false);
      } else if (delta > scrollDeltaThreshold) {
        setIsTopbarHiddenMobile(true);
      } else if (delta < -scrollDeltaThreshold) {
        setIsTopbarHiddenMobile(false);
      }

      lastScrollTopRef.current = currentTop;
    };

    const onScroll = () => {
      if (rafPendingRef.current) return;
      rafPendingRef.current = true;
      window.requestAnimationFrame(() => {
        syncTopbarByScroll();
        rafPendingRef.current = false;
      });
    };

    const onMediaChange = () => {
      if (!mobileQuery.matches) {
        setIsTopbarHiddenMobile(false);
      }
    };

    mainEl.addEventListener('scroll', onScroll, { passive: true });
    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', onMediaChange);
    } else {
      mobileQuery.addListener(onMediaChange);
    }

    return () => {
      mainEl.removeEventListener('scroll', onScroll);
      if (typeof mobileQuery.removeEventListener === 'function') {
        mobileQuery.removeEventListener('change', onMediaChange);
      } else {
        mobileQuery.removeListener(onMediaChange);
      }
    };
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
          <header
            className={`et-topbar fixed left-0 top-0 z-50 h-16 w-full transition-transform duration-300 ease-out ${
              isTopbarHiddenMobile ? '-translate-y-full lg:translate-y-0' : 'translate-y-0'
            }`}
          >
            <TopNav />
          </header>
          <main
            ref={mainRef}
            className={`et-scrollbar relative flex-1 overflow-auto px-2 pb-5 pt-3 transition-[margin-top] duration-300 ease-out sm:px-4 sm:pt-4 lg:px-6 lg:pb-8 ${
              isTopbarHiddenMobile ? 'mt-0 lg:mt-16' : 'mt-16'
            }`}
          >
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
