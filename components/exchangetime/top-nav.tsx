'use client';

import { ArrowUpRight, BookOpen, ChevronRight, Plus, Search, Settings2, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';


import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { rankWorkspaceCommand } from '@/lib/workspace-search';

import { workspaces, sections, workspaceUrl, workspaceDescriptions } from './product-model';

const WatchlistMenu = dynamic(() => import('./watchlist-menu'), { ssr: false });
const TuneInRadioButton = dynamic(() => import('./tunein-radio-button'), { ssr: false });

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [watchlist, setWatchlist] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const current = workspaces.find((item) => item.key === params?.get('view')) ?? workspaces[0];
  const symbol = query.trim().toUpperCase();
  const validSymbol =
    /^[A-Z0-9^][A-Z0-9.^=-]{0,19}$/.test(symbol) &&
    !workspaces.some((item) => rankWorkspaceCommand(item.label, query) >= 0.75);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const search = () => setOpen(true);
    const list = () => setWatchlist(true);
    window.addEventListener('keydown', toggle);
    window.addEventListener('et-search', search);
    window.addEventListener('et-watchlist', list);
    return () => {
      window.removeEventListener('keydown', toggle);
      window.removeEventListener('et-search', search);
      window.removeEventListener('et-watchlist', list);
    };
  }, []);
  function visit(url: string) {
    setOpen(false);
    setQuery('');
    router.push(url);
  }
  return (
    <nav className="terminal-toolbar" aria-label="Global tools">
      <div className="terminal-breadcrumb" aria-label="Current workspace">
        <span>{current.section}</span>
        <ChevronRight size={12} />
        <strong>{current.label}</strong>
      </div>
      <button
        className="terminal-search"
        onClick={() => setOpen(true)}
        aria-label="Search assets and workspaces"
        title="Search (⌘K / Ctrl+K)"
      >
        <Search size={15} />
        <span className="flex-1 truncate">Search markets, assets, tools…</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          className="terminal-icon"
          onClick={() => setWatchlist(true)}
          aria-label="Open watchlist"
          title="Watchlists"
        >
          <Star size={17} />
        </button>
        {watchlist && (
          <WatchlistMenu
            open={watchlist}
            onOpenChange={setWatchlist}
            align="end"
            trigger={() => <span />}
          />
        )}
        <span className="hidden lg:block">
          <TuneInRadioButton mode="nav" className="terminal-button" />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="terminal-button primary terminal-quick-add"
              aria-label="Quick add"
              title="Add a transaction, goal, or valuation"
            >
              <Plus size={19} />
              <span>New</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[
              ['Portfolio transaction', 'PortfolioTracker'],
              ['Financial goal', 'FinancialGoals'],
              ['Journal entry', 'TradeJournal'],
              ['Valuation', 'DCFCalculator'],
            ].map(([label, key]) => (
              <DropdownMenuItem key={key} onSelect={() => visit(workspaceUrl(key))}>
                {label}
                <ArrowUpRight size={13} className="ml-auto" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="terminal-icon"
          onClick={() => window.dispatchEvent(new Event('et-settings'))}
          aria-label="Workspace preferences"
          title="Workspace preferences"
        >
          <Settings2 size={17} />
        </button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen} filter={rankWorkspaceCommand}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search workspaces or enter a ticker…"
        />
        <CommandList>
          {validSymbol && (
            <CommandGroup heading="Asset">
              <CommandItem
                value={symbol + ' research'}
                onSelect={() =>
                  visit(workspaceUrl('StockAnalysis') + '&symbol=' + encodeURIComponent(symbol))
                }
              >
                <Search size={16} />
                Research {symbol}
              </CommandItem>
              <CommandItem
                value={symbol + ' chart'}
                onSelect={() =>
                  visit(workspaceUrl('TechnicalAnalysis') + '&symbol=' + encodeURIComponent(symbol))
                }
              >
                Chart {symbol}
              </CommandItem>
            </CommandGroup>
          )}
          <CommandEmpty>No matching workspace.</CommandEmpty>
          {Object.keys(sections).map((section) => (
            <CommandGroup key={section} heading={section}>
              {workspaces
                .filter((item) => item.section === section)
                .map((item) => (
                  <CommandItem
                    key={item.key}
                    value={item.label}
                    keywords={[section, workspaceDescriptions[item.key] || '']}
                    onSelect={() => visit(workspaceUrl(item.key))}
                  >
                    {item.label}
                    <ArrowUpRight size={13} className="ml-auto text-muted-foreground" />
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="Library">
            <CommandItem onSelect={() => visit('/blog')}>
              <BookOpen size={16} />
              Research articles
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </nav>
  );
}
