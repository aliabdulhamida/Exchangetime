'use client';

import { Pin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import Content from './content';
import Layout from './layout';
import { workflows, workspaces, workspaceUrl } from './product-model';
import { usePinnedWorkspaces } from './use-pinned-workspaces';
import WorkspaceTitle from './workspace-title';

export default function Dashboard({ view }: { view?: string }) {
  const router = useRouter();
  const current = workspaces.find((item) => item.key === view) ?? workspaces[0];
  const { pins, toggle, notice } = usePinnedWorkspaces();
  const nextSteps = [
    ...new Set(
      workflows.flatMap((flow) => {
        const index = flow.steps.indexOf(current.key);
        return index >= 0 && index < flow.steps.length - 1 ? [flow.steps[index + 1]] : [];
      }),
    ),
  ];
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
            <WorkspaceTitle
              title={
                current.key === 'MarketOverview'
                  ? 'Market overview'
                  : current.key === 'PortfolioTracker'
                    ? 'Portfolio'
                    : current.label
              }
            />
          </h1>
        </div>
        <button
          className="terminal-button workspace-pin"
          aria-pressed={pins.includes(current.key)}
          onClick={() => toggle(current.key)}
          aria-label={'Pin ' + current.label}
        >
          <Pin size={14} aria-hidden />
          {pins.includes(current.key) ? 'Pinned' : 'Pin'}
        </button>
      </div>
      {notice && <p role="alert">{notice}</p>}
      <div className="workspace-content" data-workspace={current.key}>
        <Content key={current.key} workspace={current.key} />
      </div>
      <footer className="workspace-continuation" aria-label="Related workspaces">
        <span>{nextSteps.length ? 'Continue with' : 'Explore'}</span>
        {nextSteps.map((key) => (
          <Link key={key} href={workspaceUrl(key)}>
            {workspaces.find((item) => item.key === key)?.label} →
          </Link>
        ))}
      </footer>
    </Layout>
  );
}
