'use client';

import { Pin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import Content from './content';
import Layout from './layout';
import { workflows, workspaces, workspaceUrl, workspaceDescriptions } from './product-model';
import { usePinnedWorkspaces } from './use-pinned-workspaces';

export default function Dashboard({ view }: { view?: string }) {
  const router = useRouter();
  const current = workspaces.find((item) => item.key === view) ?? workspaces[0];
  const peers = workspaces.filter(item => item.section === current.section);
  const { pins, toggle, notice } = usePinnedWorkspaces();
  const nextSteps = [...new Set(workflows.flatMap(flow => {
    const index = flow.steps.indexOf(current.key);
    return index >= 0 && index < flow.steps.length - 1 ? [flow.steps[index + 1]] : [];
  }))];
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
        <button className="terminal-button workspace-pin" aria-pressed={pins.includes(current.key)} onClick={() => toggle(current.key)} aria-label={'Pin ' + current.label}>
          <Pin size={14} aria-hidden />{pins.includes(current.key) ? 'Pinned' : 'Pin'}
        </button>
      </div>
      {notice && <p role="alert">{notice}</p>}
      {peers.length > 1 && (<>
        <label className="workspace-picker">{current.section}<select value={current.key} onChange={event => router.push(workspaceUrl(event.target.value))}>
          {peers.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select></label>
        <nav aria-label={current.section + ' workspaces'} className="terminal-tabs workspace-tabs">
          {peers
            .map((item) => (
              <Link
                key={item.key}
                href={workspaceUrl(item.key)}
                aria-current={item.key === current.key ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
        </nav></>
      )}
      <Content key={current.key} workspace={current.key} />
      <footer className="workspace-continuation" aria-label="Related workspaces">
        <span>{nextSteps.length ? 'Continue with' : 'Explore'}</span>
        {nextSteps.map(key => <Link key={key} href={workspaceUrl(key)}>{workspaces.find(item => item.key === key)?.label} →</Link>)}
        <Link href="/tools">All tools →</Link>
      </footer>
    </Layout>
  );
}
