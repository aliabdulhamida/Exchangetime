'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import Layout from './layout';
import MarketOverview from './market-overview';
import { workspaces, workspaceUrl, workspaceDescriptions } from './product-model';

const Content = dynamic(() => import('./content'), {
  ssr: false,
  loading: () => <div role="status" className="h-72 animate-pulse rounded bg-muted/30" />,
});

export default function Dashboard({ view }: { view?: string }) {
  const router = useRouter();
  const current = workspaces.find((item) => item.key === view) ?? workspaces[0];
  useEffect(() => {
    if (!view) {
      try {
        const saved = localStorage.getItem('et-landing');
        if (saved && saved !== 'MarketOverview' && workspaces.some((item) => item.key === saved))
          router.replace(workspaceUrl(saved));
      } catch {}
    }
    function select(event: Event) {
      const key = (event as CustomEvent<string>).detail;
      if (workspaces.some((item) => item.key === key)) router.push(workspaceUrl(key));
    }
    window.addEventListener('showOnlyModule', select);
    return () => window.removeEventListener('showOnlyModule', select);
  }, [router, view]);
  return (
    <Layout>
      <div className="terminal-heading">
        <div>
          <h1>
            {current.key === 'MarketOverview'
              ? 'Market overview'
              : current.key === 'PortfolioTracker'
                ? 'Portfolio'
                : current.label}
          </h1>
          <p>
            {current.key === 'MarketOverview'
              ? 'Global indices, market conditions, and sector performance.'
              : workspaceDescriptions[current.key]}
          </p>
        </div>
      </div>
      {workspaces.filter((item) => item.section === current.section).length > 1 && (
        <nav aria-label={current.section + ' workspaces'} className="terminal-tabs">
          {workspaces
            .filter((item) => item.section === current.section)
            .map((item) => (
              <Link
                key={item.key}
                href={workspaceUrl(item.key)}
                aria-current={item.key === current.key ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      )}
      {current.key === 'MarketOverview' ? (
        <MarketOverview />
      ) : (
        <Content key={current.key} visibleModules={[current.key]} />
      )}
    </Layout>
  );
}
