'use client';

import { ExternalLink, RotateCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { memo, useState } from 'react';

const newsDocument = (theme) =>
  `<!DOCTYPE html><html><head><style>html,body{height:100%;margin:0;background:${theme === 'dark' ? '#000' : '#fff'};font-family:system-ui}.tradingview-widget-container{height:100%;width:100%}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script src="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js" type="text/javascript" async>{"displayMode":"adaptive","feedMode":"all_symbols","colorTheme":"${theme}","isTransparent":true,"locale":"en","width":"100%","height":"100%"}</script></div></body></html>`;

function TradingViewNews() {
  const { resolvedTheme } = useTheme();
  const [revision, setRevision] = useState(0);
  return (
    <section className="flex h-full min-h-[480px] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          TradingView headlines · Publication times appear in the feed
        </p>
        <button
          className="terminal-icon"
          title="Reload headlines"
          aria-label="Reload headlines"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RotateCw size={15} />
        </button>
      </div>
      <iframe
        key={revision}
        title="Market news from TradingView"
        srcDoc={newsDocument(resolvedTheme === 'dark' ? 'dark' : 'light')}
        className="min-h-0 w-full flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
      <a
        className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-200"
        href="https://www.tradingview.com/news/"
        target="_blank"
        rel="noreferrer"
      >
        Open provider headlines
        <ExternalLink size={12} />
      </a>
    </section>
  );
}

export default memo(TradingViewNews);
