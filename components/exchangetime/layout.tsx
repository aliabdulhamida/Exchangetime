'use client';

import { Suspense, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import TopNav from './top-nav';
import TerminalNav from './terminal-nav';
import Preferences from './preferences';

export default function Layout({ children }: { children: ReactNode; sidebar?: ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <TerminalLayout>{children}</TerminalLayout>
    </Suspense>
  );
}

function TerminalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const mainRef = useRef<HTMLElement>(null);
  const location = pathname + '?' + params?.toString();
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location]);
  return (
    <div className="terminal">
      <a href="#workspace-content" className="terminal-skip">
        Skip to workspace
      </a>
      <Suspense>
        <TerminalNav />
      </Suspense>
      <div className="terminal-body">
        <header className="terminal-topbar">
          <TopNav />
        </header>
        <main
          ref={mainRef}
          id="workspace-content"
          tabIndex={-1}
          className="terminal-main et-scrollbar"
        >
          <div className="terminal-container">{children}</div>
        </main>
      </div>
      <Preferences />
    </div>
  );
}
