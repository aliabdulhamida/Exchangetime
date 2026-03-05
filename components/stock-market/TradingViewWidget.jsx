import React, { memo, useEffect, useRef, useState } from 'react';

function normalizeSymbol(raw) {
  const symbol = String(raw || '').trim().toUpperCase();
  return symbol || 'AAPL';
}

function TradingViewWidget() {
  const container = useRef();
  const [symbol, setSymbol] = useState(() => {
    if (typeof window === 'undefined') return 'AAPL';
    return normalizeSymbol(localStorage.getItem('portfolioSelectedSymbol'));
  });

  useEffect(() => {
    const onSymbolSelected = (event) => {
      const next = normalizeSymbol(event?.detail?.symbol);
      setSymbol(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolioSelectedSymbol', next);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('portfolio-symbol-selected', onSymbolSelected);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('portfolio-symbol-selected', onSymbolSelected);
      }
    };
  }, []);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: true,
      interval: 'D',
      locale: 'en',
      save_image: true,
      style: '1',
      symbol,
      theme: 'dark',
      timezone: 'Etc/UTC',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(0, 0, 0, 0.06)',
      watchlist: [],
      withdateranges: true,
      compareSymbols: [],
      studies: ['STD;Divergence%1Indicator', 'STD;MACD'],
      autosize: true,
    });
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: '100%', width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: 'calc(100% - 32px)', width: '100%' }}
      ></div>
    </div>
  );
}

export default memo(TradingViewWidget);
