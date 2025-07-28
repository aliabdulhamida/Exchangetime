

// TradingViewWidget.jsx
import React, { useEffect, useRef, memo } from 'react';


function TradingViewWidget() {
  const container = useRef(null);

  useEffect(() => {
    if (!container.current) return;
    // Container leeren, um doppeltes Widget zu verhindern
    container.current.innerHTML = '<div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `{
      "allow_symbol_change": true,
      "calendar": false,
      "details": true,
      "hide_side_toolbar": false,
      "hide_top_toolbar": false,
      "hide_legend": true,
      "hide_volume": false,
      "hotlist": true,
      "interval": "D",
      "locale": "en",
      "save_image": true,
      "style": "1",
      "symbol": "NASDAQ:AAPL",
      "theme": "dark",
      "timezone": "Etc/UTC",
      "backgroundColor": "rgba(0, 0, 0, 1)",
      "gridColor": "rgba(99, 99, 99, 0.06)",
      "watchlist": [],
      "withdateranges": true,
      "compareSymbols": [],
      "studies": [],
      "autosize": true
    }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span className="blue-text">Track all markets on TradingView</span></a></div>
    </div>
  );
}

export default memo(TradingViewWidget);
