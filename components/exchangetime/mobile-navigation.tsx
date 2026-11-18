'use client';

import { BookOpen, Check, ChevronUp, LayoutGrid, Pin, Radio, Settings2, Star, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { navigationTopics } from './navigation-topics';
import { workspaces, workspaceUrl } from './product-model';
import { usePinnedWorkspaces } from './use-pinned-workspaces';

export default function MobileNavigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params?.get('view') || 'MarketOverview';
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('Markets');
  const {pins, toggle, notice} = usePinnedWorkspaces();
  const listed = section === 'Pinned' ? pins.flatMap(key => {
    const item = workspaces.find(workspace => workspace.key === key);
    return item ? [item] : [];
  }) : workspaces.filter(item => item.section === section);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [pathname, current]);
  function action(event: string) {
    setOpen(false);
    window.dispatchEvent(new Event(event));
  }
  return (
    <Popover open={open} onOpenChange={value => {
      if (value) setSection(workspaces.find(item => item.key === current)?.section || 'Markets');
      setOpen(value);
    }}>
      <nav className="terminal-bottom-nav terminal-tools-dock" aria-label="Mobile navigation">
        <PopoverTrigger asChild>
          <button aria-label="Choose tools"><LayoutGrid size={19} /><span>Tools</span><ChevronUp size={15} /></button>
        </PopoverTrigger>
      </nav>
      <PopoverContent ref={menu} tabIndex={-1} onOpenAutoFocus={event => { event.preventDefault(); menu.current?.focus(); }} side="top" align="start" sideOffset={10} collisionPadding={12} className="tools-popover" aria-label="Choose tools">
        <header><strong>{section === 'Pinned' ? 'Pinned tools' : 'Tools'}</strong><div className="tools-popover-header-actions">
          <button type="button" aria-label="Show pinned tools" title="Pinned tools" aria-pressed={section === 'Pinned'}
            onClick={() => setSection(section === 'Pinned' ? workspaces.find(item => item.key === current)?.section || 'Markets' : 'Pinned')}><Pin size={16} /></button>
          <button type="button" aria-label="Close tools" onClick={() => setOpen(false)}><X size={17} /></button>
        </div></header>
        <div className="tools-popover-browser">
          <nav aria-label="Tool areas" className="tools-popover-areas">
            {navigationTopics.map(topic => <button key={topic.section} type="button" aria-pressed={section === topic.section} onClick={() => setSection(topic.section)}><topic.Icon size={17} aria-hidden /><span>{topic.label}</span></button>)}
          </nav>
          <nav className="tools-popover-list" aria-label={section + ' tools'}>
            {listed.map(item => <div key={item.key} className="tools-tool-row">
              <Link href={workspaceUrl(item.key)} aria-current={pathname === '/dashboard' && current === item.key ? 'page' : undefined} onClick={() => setOpen(false)}><span>{item.label}</span>{current === item.key && <Check size={14} aria-hidden />}</Link>
              <button type="button" aria-label={(pins.includes(item.key) ? 'Unpin ' : 'Pin ') + item.label}
                title={pins.includes(item.key) ? 'Unpin' : 'Pin'} aria-pressed={pins.includes(item.key)} onClick={() => {
                  toggle(item.key);
                  if (section === 'Pinned') menu.current?.querySelector<HTMLButtonElement>('[aria-label="Show pinned tools"]')?.focus();
                }}><Pin size={13} aria-hidden /></button>
            </div>)}
            {!listed.length && <p className="tools-empty-pins">No pinned tools</p>}
          </nav>
        </div>
        {notice && <p role="alert" className="terminal-note">{notice}</p>}
        <div className="tools-popover-shortcuts">
          <button onClick={() => action('et-watchlist')}><Star size={17} />Watchlist</button>
          <Link href="/blog" onClick={() => setOpen(false)}><BookOpen size={17} />Library</Link>
          <button onClick={() => action('et-radio')}><Radio size={17} />Radio</button>
          <button onClick={() => action('et-settings')}><Settings2 size={17} />Settings</button>
        </div>
        <details className="tools-popover-legal">
          <summary>Legal information</summary>
          <span>© {new Date().getFullYear()} Exchange Time</span>
          <Link href="/impressum" onClick={() => setOpen(false)}>Legal notice / Impressum</Link>
          <Link href="/settings/privacy-policy" onClick={() => setOpen(false)}>Privacy policy</Link>
          <Link href="/redaktion" onClick={() => setOpen(false)}>Editorial & AI policy</Link>
        </details>
      </PopoverContent>
    </Popover>
  );
}
