'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode, type RefObject } from 'react';
import { useEffect, useRef } from 'react';

import MobileNavigation from './mobile-navigation';
import Preferences from './preferences';
import TerminalNav from './terminal-nav';
import TopNav from './top-nav';

export default function Layout({ children, focused = false }: { children: ReactNode; sidebar?: ReactNode; focused?: boolean }) {
  return <TerminalLayout focused={focused}>{children}</TerminalLayout>;
}

function ScrollReset({mainRef}: {mainRef: RefObject<HTMLElement | null>}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const location = pathname + '?' + params?.toString();
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location, mainRef]);
  return null;
}

function TerminalLayout({ children, focused }: { children: ReactNode; focused: boolean }) {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <div className="terminal" data-focused={focused || undefined}>
      <a href="#workspace-content" className="terminal-skip">
        Skip to workspace
      </a>
      <Suspense>
        <TerminalNav />
      </Suspense>
      <div className="terminal-body">
        <header className="terminal-topbar">
          <Suspense fallback={null}><TopNav /></Suspense>
        </header>
        <main
          ref={mainRef}
          id="workspace-content"
          tabIndex={-1}
          className="terminal-main et-scrollbar"
        >
          <Suspense fallback={null}><ScrollReset mainRef={mainRef} /></Suspense>
          <div className="terminal-container">
            {children}
          </div>
        </main>
      </div>
      <Suspense fallback={null}><MobileNavigation /></Suspense>
      <Preferences />
    </div>
  );
}
