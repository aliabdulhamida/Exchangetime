import { ChevronRight, LineChart } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import TuneInRadioButton from './tunein-radio-button';
import WatchlistMenu from './watchlist-menu';
import TradingViewNews from '../stock-market/TradingViewNews';

const FearGreedIndex = dynamic(() => import('@/components/stock-market/fear-greed-index'), {
  ssr: false,
});

const triggerClass =
  'et-nav-pill inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs font-semibold sm:px-3';

export default function TopNav() {
  const [showFloatingRadio, setShowFloatingRadio] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const syncVisibility = () => setShowFloatingRadio(desktopQuery.matches);

    syncVisibility();
    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', syncVisibility);
    } else {
      desktopQuery.addListener(syncVisibility);
    }

    return () => {
      if (typeof desktopQuery.removeEventListener === 'function') {
        desktopQuery.removeEventListener('change', syncVisibility);
      } else {
        desktopQuery.removeListener(syncVisibility);
      }
    };
  }, []);

  return (
    <>
      <nav className="flex h-full items-center justify-between gap-3 px-3 sm:px-5 lg:pl-[17rem]">
        <div className="et-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`${triggerClass} mr-1`}>
                <span>News</span>
                <ChevronRight size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="et-dropdown-panel min-w-[240px] max-w-[95vw] p-2 sm:max-w-xl md:max-w-2xl"
            >
              <div className="h-[350px] w-full overflow-hidden rounded-xl sm:h-[500px]">
                <TradingViewNews />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <WatchlistMenu
            align="start"
            side="bottom"
            sideOffset={8}
            contentClassName="et-dropdown-panel min-w-[250px] max-w-[95vw] p-0"
            trigger={({ open }) => (
              <button
                type="button"
                className={`${triggerClass} hidden lg:inline-flex ${open ? 'text-foreground' : ''}`}
                aria-expanded={open}
                aria-label="Open watchlist"
              >
                <LineChart size={14} />
                <span>Watchlist</span>
              </button>
            )}
          />
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-full border border-border bg-card px-2 py-0.5">
            <FearGreedIndex />
          </div>
        </div>
      </nav>
      {showFloatingRadio && <TuneInRadioButton mode="floating" />}
    </>
  );
}
