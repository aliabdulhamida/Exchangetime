'use client';

import { BookOpen, MoreHorizontal, Radio, Settings2, Star } from 'lucide-react';
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

import { navigationTopics } from './navigation-topics';

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
  return (
    <>
      <nav className="terminal-bottom-nav" aria-label="Mobile navigation">
        <div className="terminal-bottom-items">
          {navigationTopics.map(({ section, label, Icon, href, tools }) => (
            <Link key={section} aria-label={section} href={href} aria-current={pathname === '/dashboard' && current in tools ? 'page' : undefined}>
              <Icon size={20} aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
          <button
            aria-label="More navigation"
            aria-expanded={open}
            aria-haspopup="dialog"
            data-active={open || pathname !== '/dashboard'}
            onClick={() => setOpen(true)}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </div>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mobile-navigation-sheet">
          <SheetHeader>
            <SheetTitle>Explore Exchange Time</SheetTitle>
            <SheetDescription className="sr-only">Choose an area, radio or settings.</SheetDescription>
          </SheetHeader>
          <div className="mobile-navigation-services">
            <button onClick={() => action('et-watchlist')}>
              <Star size={19} />
              Watchlist
            </button>
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
