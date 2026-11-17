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
  Settings2,
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
          <Link
            href="/tools"
            title="Workspace directory"
            aria-current={pathname === '/tools' ? 'page' : undefined}
            className={'terminal-section ' + (pathname === '/tools' ? 'is-active' : '')}
          >
            <Wrench size={18} />
            {!collapsed && <span>Tools</span>}
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
            {pins
              .map((key) => [workspaces.find((item) => item.key === key)!.label, key])
              .map(([label, key]) => (
                <Link
                  key={key}
                  href={workspaceUrl(key)}
                  title={label}
                  className="terminal-shortcut"
                >
                  <span className="terminal-shortcut-dot" />
                  {!collapsed && label}
                </Link>
              ))}
          </div>
        </nav>
        <div className="terminal-nav-footer">
          <Link href="/impressum" title="Impressum">
            <span aria-hidden>§</span>
            {!collapsed && 'Impressum'}
          </Link>
          <Link href="/settings/privacy-policy" title="Privacy policy">
            <span aria-hidden>§</span>
            {!collapsed && 'Privacy policy'}
          </Link>
          <Link href="/redaktion" title="Editorial & AI policy">
            <span aria-hidden>§</span>
            {!collapsed && 'Editorial & AI policy'}
          </Link>
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
    </>
  );
}
