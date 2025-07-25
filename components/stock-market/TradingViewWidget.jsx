

// TradingViewWidget.jsx
import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget() {
  const container = useRef();

  useEffect(() => {
    if (!container.current) return;
    // Container leeren, um doppeltes Widget zu verhindern
    container.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "displayMode": "regular",
        "feedMode": "all_symbols",
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "en",
        "width": "100%",
        "height": "100%"
      }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ borderRadius: 0, overflow: 'hidden' }}>
      <div className="tradingview-widget-container__widget" style={{ borderRadius: 0 }}></div>
      <style>{`
        .tradingview-widget-container * {
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
}

export default memo(TradingViewWidget);
