'use client';

import { ArrowUpRight, BookOpen, ChevronRight, Plus, Search, Settings2, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
import { isPriceSymbol } from '@/lib/asset-directory';
import { rankWorkspaceCommand } from '@/lib/workspace-search';

import AssetSearchResults from './asset-search-results';
import { workspaces, sections, workspaceUrl, workspaceDescriptions } from './product-model';

const WatchlistMenu = dynamic(() => import('./watchlist-menu'), { ssr: false });
const TuneInRadioButton = dynamic(() => import('./tunein-radio-button'), { ssr: false });
const quickActions = [
  { label: 'Portfolio transaction', key: 'PortfolioTracker', command: 'Add portfolio transaction' },
  { label: 'Financial goal', key: 'FinancialGoals', command: 'Create a financial goal' },
  { label: 'Journal entry', key: 'TradeJournal', command: 'Add a trade journal entry' },
];
const commandLabels = [
  ...workspaces.map((item) => item.label),
  ...quickActions.map((item) => item.command),
  'Open market radio',
];

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assetMode, setAssetMode] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [watchlist, setWatchlist] = useState(false);
  const [watchTicker, setWatchTicker] = useState('');
  const [radioOpen, setRadioOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = workspaces.find((item) => item.key === params?.get('view')) ?? workspaces[0];
  const symbol = query.trim().toUpperCase();
  const isCommand = commandLabels.some((label) => rankWorkspaceCommand(label, query) >= 0.75);
  const validSymbol = isPriceSymbol(symbol) && !isCommand;
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const search = () => setOpen(true);
    const radio = () => setRadioOpen(true);
    const findAsset = (event: Event) => {
      const term = (event as CustomEvent<unknown>).detail;
      setQuery(typeof term === 'string' ? term : '');
      setAssetMode(true);
      setOpen(true);
    };
    const list = (event: Event) => {
      const ticker = (event as CustomEvent<unknown>).detail;
      setWatchTicker(typeof ticker === 'string' ? ticker : '');
      setWatchlist(true);
    };
    window.addEventListener('keydown', toggle);
    window.addEventListener('et-search', search);
    window.addEventListener('et-radio', radio);
    window.addEventListener('et-asset-search', findAsset);
    window.addEventListener('et-watchlist', list);
    return () => {
      window.removeEventListener('keydown', toggle);
      window.removeEventListener('et-search', search);
      window.removeEventListener('et-radio', radio);
      window.removeEventListener('et-asset-search', findAsset);
      window.removeEventListener('et-watchlist', list);
    };
  }, []);
  function changeScope(assets: boolean) {
    setAssetMode(assets);
    input.current?.focus();
  }
  useEffect(() => {
    if (!open) {
      setQuery('');
      setAssetMode(false);
    }
  }, [open]);
  function visit(url: string) {
    setOpen(false);
    setQuery('');
    router.push(url);
  }
  return (
    <nav className="terminal-toolbar" aria-label="Global tools">
      <Link href="/dashboard" className="product-mobile-brand">
        Exchange Time<span aria-hidden>↗</span>
      </Link>
      <div className="terminal-breadcrumb" aria-label="Current workspace">
        <Link href="/tools">Workspaces</Link>
        <ChevronRight size={12} />
        <strong>
          {pathname === '/dashboard'
            ? current.section
            : pathname === '/tools'
              ? 'Directory'
              : pathname?.startsWith('/blog')
                ? 'Research library'
                : 'Privacy & data'}
        </strong>
      </div>
      <button
        className="terminal-search"
        onClick={() => setOpen(true)}
        aria-label="Search assets and workspaces"
        title="Search (⌘K / Ctrl+K)"
      >
        <Search size={15} />
        <span className="flex-1 truncate">Search…</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="hidden shrink-0 items-center gap-3 lg:flex">
        <button
          className="terminal-icon"
          onClick={() => {
            setWatchTicker('');
            setWatchlist(true);
          }}
          aria-label="Open watchlist"
          title="Watchlists"
        >
          <Star size={17} />
        </button>
        {watchlist && (
          <WatchlistMenu
            suggestedTicker={watchTicker}
            open={watchlist}
            onOpenChange={setWatchlist}
            align="end"
            trigger={() => <span />}
          />
        )}
        <span className="hidden lg:block">
          <TuneInRadioButton
            mode="nav"
            className="terminal-button"
            open={radioOpen}
            onOpenChange={setRadioOpen}
          />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="terminal-button primary terminal-quick-add"
              aria-label="Quick add"
              title="Add a transaction, goal, or journal entry"
            >
              <Plus size={19} />
              <span>New</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {quickActions.map(({ label, key }) => (
              <DropdownMenuItem
                key={key}
                onSelect={() => visit(workspaceUrl(key) + '&compose=new')}
              >
                {label}
                <ArrowUpRight size={13} className="ml-auto" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="terminal-icon hidden lg:inline-flex"
          onClick={() => window.dispatchEvent(new Event('et-settings'))}
          aria-label="Workspace preferences"
          title="Workspace preferences"
        >
          <Settings2 size={17} />
        </button>
      </div>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        filter={rankWorkspaceCommand}
        shouldFilter={!assetMode}
      >
        <CommandInput
          ref={input}
          value={query}
          onValueChange={setQuery}
          aria-label={assetMode ? 'Find an instrument' : 'Search workspaces and commands'}
          placeholder={
            assetMode
              ? 'Company, fund, index, or ticker…'
              : 'Search workspaces or find an instrument…'
          }
        />
        <div className="search-scope" aria-label="Search in">
          <button type="button" aria-pressed={!assetMode} onClick={() => changeScope(false)}>
            Workspaces
          </button>
          <button type="button" aria-pressed={assetMode} onClick={() => changeScope(true)}>
            Instruments
          </button>
        </div>
        <CommandList>
          {assetMode ? (
            <AssetSearchResults query={query} visit={visit} />
          ) : (
            <>
              {query.trim().length >= 2 && !isCommand && (
                <CommandGroup heading="Instrument directory">
                  <CommandItem value={query.trim()} onSelect={() => changeScope(true)}>
                    <Search size={16} /> Find “{query.trim()}” by name or ticker
                  </CommandItem>
                </CommandGroup>
              )}
              {validSymbol && (
                <CommandGroup heading="Asset">
                  {/^[A-Z0-9][A-Z0-9._-]{0,14}$/.test(symbol) && (
                    <CommandItem
                      value={symbol + ' research'}
                      onSelect={() =>
                        visit(
                          workspaceUrl('StockAnalysis') + '&symbol=' + encodeURIComponent(symbol),
                        )
                      }
                    >
                      <Search size={16} />
                      Research {symbol}
                    </CommandItem>
                  )}
                  <CommandItem
                    value={symbol + ' compare prices'}
                    onSelect={() =>
                      visit(
                        workspaceUrl('AssetComparison') + '&symbol=' + encodeURIComponent(symbol),
                      )
                    }
                  >
                    Compare {symbol}
                  </CommandItem>
                  <CommandItem
                    value={symbol + ' chart'}
                    onSelect={() =>
                      visit(
                        workspaceUrl('TechnicalAnalysis') + '&symbol=' + encodeURIComponent(symbol),
                      )
                    }
                  >
                    Chart {symbol}
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandEmpty>No matching workspace.</CommandEmpty>
              <CommandGroup heading="Actions">
                {quickActions.map((action) => (
                  <CommandItem
                    key={action.key}
                    value={action.command}
                    onSelect={() => visit(workspaceUrl(action.key) + '&compose=new')}
                  >
                    <Plus size={16} />
                    {action.command}
                  </CommandItem>
                ))}
                <CommandItem
                  value="Open market radio"
                  keywords={['Listen to financial news TuneIn stations']}
                  onSelect={() => {
                    setOpen(false);
                    setRadioOpen(true);
                  }}
                >
                  Open market radio
                </CommandItem>
              </CommandGroup>
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
                <CommandItem
                  value="Workspace directory all tools workflows"
                  onSelect={() => visit('/tools')}
                >
                  Browse all tools
                </CommandItem>
                <CommandItem onSelect={() => visit('/blog')}>
                  <BookOpen size={16} />
                  Research articles
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
        {assetMode && (
          <p className="asset-search-footnote">
            Instrument names and tickers are looked up on Yahoo Finance.
          </p>
        )}
      </CommandDialog>
    </nav>
  );
}
