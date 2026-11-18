'use client';

import { ArrowRight, Maximize2, Minimize2, Pin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import AdSlot from '@/components/advertising/ad-slot';

import Content from './content';
import Layout from './layout';
import { workflows, workspaces, workspaceUrl } from './product-model';
import { usePinnedWorkspaces } from './use-pinned-workspaces';
import WorkspaceTitle from './workspace-title';

export default function Dashboard({ view, children }: { view?: string; children?: ReactNode }) {
  const router = useRouter();
  const current = workspaces.find((item) => item.key === view) ?? workspaces[0];
  const { pins, toggle, notice } = usePinnedWorkspaces();
  const [focused, setFocused] = useState(false);
  const FocusIcon = focused ? Minimize2 : Maximize2;
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
    <Layout focused={focused}>
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
        <nav className="workspace-actions" aria-label="Workspace controls">
        <button
          className="terminal-button workspace-pin"
          aria-pressed={pins.includes(current.key)}
          onClick={() => toggle(current.key)}
          aria-label={(pins.includes(current.key) ? 'Unpin ' : 'Pin ') + current.label}
        >
          <Pin size={14} aria-hidden />
          {pins.includes(current.key) ? 'Pinned' : 'Pin'}
        </button>
        <button type="button" className="terminal-button workspace-focus" aria-pressed={focused}
          title={focused ? 'Restore navigation' : 'Expand workspace'} aria-label="Expand workspace"
          onClick={() => setFocused(value => !value)}>
          <FocusIcon size={16} aria-hidden />
        </button>
        </nav>
      </div>
      {notice && <p role="alert">{notice}</p>}
      {current.key === 'MarketOverview' && <AdSlot placement="overview" />}
      <div className="workspace-content" data-workspace={current.key}>
        <Content key={current.key} workspace={current.key} />
      </div>
      {current.key === 'MarketOverview' && children}
      {nextSteps.length > 0 && <footer className="workspace-continuation" aria-label="Related workspaces">
        <span>Continue with</span>
        {nextSteps.map((key) => (
          <Link key={key} href={workspaceUrl(key)}>
            {workspaces.find((item) => item.key === key)?.label}<ArrowRight size={14} aria-hidden />
          </Link>
        ))}
      </footer>}
    </Layout>
  );
}
