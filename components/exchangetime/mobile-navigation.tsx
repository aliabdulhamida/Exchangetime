'use client';

import { BookOpen, Globe2, MoreHorizontal, PieChart, Radio, Settings2, Star } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { sections, workspaceUrl } from './product-model';

export default function MobileNavigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params?.get('view') || 'MarketOverview';
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname, current]);
  function action(event: string) {
    setOpen(false);
    window.dispatchEvent(new Event(event));
  }
  const primary =
    pathname === '/dashboard' && (current in sections.Markets || current === 'PortfolioTracker');
  return (
    <>
      <nav className="terminal-bottom-nav" aria-label="Mobile navigation">
        <Link
          href={workspaceUrl('MarketOverview')}
          aria-current={
            pathname === '/dashboard' && current in sections.Markets ? 'page' : undefined
          }
        >
          <Globe2 size={20} />
          <span>Markets</span>
        </Link>
        <Link
          href={workspaceUrl('PortfolioTracker')}
          aria-current={
            pathname === '/dashboard' && current === 'PortfolioTracker' ? 'page' : undefined
          }
        >
          <PieChart size={20} />
          <span>Portfolio</span>
        </Link>
        <button onClick={() => action('et-watchlist')}>
          <Star size={20} />
          <span>Watchlist</span>
        </button>
        <Link href="/blog" aria-current={pathname?.startsWith('/blog') ? 'page' : undefined}>
          <BookOpen size={20} />
          <span>Research</span>
        </Link>
        <button
          aria-label="More navigation"
          aria-expanded={open}
          aria-haspopup="dialog"
          data-active={open || (!primary && !pathname?.startsWith('/blog'))}
          onClick={() => setOpen(true)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mobile-navigation-sheet">
          <SheetHeader>
            <SheetTitle>Explore Exchange Time</SheetTitle>
            <SheetDescription>All workspaces and settings, in one place.</SheetDescription>
          </SheetHeader>
          <div className="mobile-navigation-services">
            <Link href="/blog" onClick={() => setOpen(false)}>
              <BookOpen size={19} />
              Research library
            </Link>
            <button onClick={() => action('et-radio')}>
              <Radio size={19} />
              Market radio
            </button>
            <button onClick={() => action('et-settings')}>
              <Settings2 size={19} />
              Preferences
            </button>
          </div>
          <nav aria-label="Browse areas" className="mobile-navigation-areas">
            {Object.entries(sections).map(([section, items]) => (
              <Link
                key={section}
                href={workspaceUrl(Object.keys(items)[0])}
                onClick={() => setOpen(false)}
              >
                <span>{section}</span>
                <small>
                  {Object.keys(items).length}{' '}
                  {Object.keys(items).length === 1 ? 'workspace' : 'workspaces'}
                </small>
              </Link>
            ))}
          </nav>
          <div className="mobile-navigation-legal">
            <Link href="/impressum" onClick={() => setOpen(false)}>
              Legal notice
            </Link>
            <Link href="/settings/privacy-policy" onClick={() => setOpen(false)}>
              Privacy
            </Link>
            <Link href="/redaktion" onClick={() => setOpen(false)}>
              Editorial & AI
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
