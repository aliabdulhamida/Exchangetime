'use client';

import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Globe2,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings2,
  Star,
  Wallet,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { sections, workspaces, workspaceUrl } from './product-model';
import { usePinnedWorkspaces } from './use-pinned-workspaces';

const icons = {
  Markets: Globe2,
  Portfolio: PieChart,
  Research: BookOpen,
  Trading: ChartNoAxesCombined,
  'Personal Finance': Wallet,
  Calendar: CalendarDays,
};

export default function TerminalNav() {
  const params = useSearchParams();
  const pathname = usePathname();
  const current = params?.get('view') || 'MarketOverview';
  const [collapsed, setCollapsed] = useState(false);
  const { pins } = usePinnedWorkspaces();
  return (
    <>
      <aside className={collapsed ? 'terminal-sidebar is-collapsed' : 'terminal-sidebar'}>
        <div className="terminal-brand-row">
          <Link href="/dashboard" className="terminal-brand" title="Exchange Time">
            <span className="terminal-mark" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            {!collapsed && (
              <span>
                Exchange Time<span className="terminal-brand-caption">Your market perspective</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              className="terminal-icon terminal-collapse"
              aria-label="Collapse navigation"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            className="terminal-icon mx-auto mb-4"
            aria-label="Expand navigation"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <nav aria-label="Main navigation" className="terminal-nav et-scrollbar">
          <Link href="/tools" title="Workspace directory" aria-current={pathname === '/tools' ? 'page' : undefined} className={'terminal-section ' + (pathname === '/tools' ? 'is-active' : '')}>
            <Wrench size={18} />{!collapsed && <span>All tools</span>}
          </Link>
          {!collapsed && <p className="terminal-nav-label">Workspace</p>}
          {Object.entries(sections).map(([section, items]) => {
            const Icon = icons[section as keyof typeof icons];
            const active = pathname === '/dashboard' && current in items;
            return (
              <Link
                key={section}
                href={workspaceUrl(Object.keys(items)[0])}
                className={'terminal-section ' + (active ? 'is-active' : '')}
                title={section}
                aria-current={active ? 'true' : undefined}
              >
                <Icon size={18} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{section}</span>
                    {active && <span className="terminal-active-dot" />}
                  </>
                )}
              </Link>
            );
          })}
          {!collapsed && <p className="terminal-nav-label mt-8">Pinned workspaces</p>}
          <div className="terminal-shortcuts">
            {pins.map(key => [workspaces.find(item => item.key === key)!.label, key]).map(([label, key]) => (
              <Link key={key} href={workspaceUrl(key)} title={label} className="terminal-shortcut">
                <span className="terminal-shortcut-dot" />
                {!collapsed && label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="terminal-nav-footer">
          {!collapsed && (
            <button
              className="terminal-command-hint"
              onClick={() => window.dispatchEvent(new Event('et-search'))}
            >
              <Search size={14} />
              <span>Jump to anything</span>
              <kbd>⌘ K</kbd>
            </button>
          )}
          <Link href="/blog" title="Research library">
            <BookOpen size={16} />
            {!collapsed && (
              <>
                Research library
                <ArrowUpRight size={12} className="ml-auto" />
              </>
            )}
          </Link>
          <button
            title="Workspace settings"
            onClick={() => window.dispatchEvent(new Event('et-settings'))}
          >
            <Settings2 size={16} />
            {!collapsed && 'Preferences'}
          </button>
          {!collapsed && (
            <Link href="/settings/privacy-policy" className="terminal-privacy">
              Privacy & data
            </Link>
          )}
        </div>
      </aside>
      <nav className="terminal-bottom-nav" aria-label="Mobile navigation">
        <Link
          href={workspaceUrl('MarketOverview')}
          aria-current={pathname === '/dashboard' && current in sections.Markets ? 'page' : undefined}
        >
          <Globe2 size={20} />
          <span>Markets</span>
        </Link>
        <Link
          href={workspaceUrl('PortfolioTracker')}
          aria-current={current === 'PortfolioTracker' ? 'page' : undefined}
        >
          <PieChart size={20} />
          <span>Portfolio</span>
        </Link>
        <button onClick={() => window.dispatchEvent(new Event('et-watchlist'))}>
          <Star size={20} />
          <span>Watchlist</span>
        </button>
        <Link href={workspaceUrl('News')} aria-current={current === 'News' ? 'page' : undefined}>
          <BookOpen size={20} />
          <span>News</span>
        </Link>
        <Link href="/tools" aria-current={pathname === '/tools' ? 'page' : undefined}
          data-active={
            pathname === '/tools' ||
            current in sections.Trading ||
            current in sections['Personal Finance'] ||
            current in sections.Calendar
          }
        >
          <Wrench size={20} />
          <span>Tools</span>
        </Link>
      </nav>
    </>
  );
}
