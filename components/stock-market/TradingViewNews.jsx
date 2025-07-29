import React, { useEffect, useRef, memo } from 'react';

function TradingViewNews() {
  const container = useRef();

  useEffect(() => {
    // Vorherige Scripts entfernen, um Duplikate zu verhindern
    const node = container.current;
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "displayMode": "adaptive",
        "feedMode": "all_symbols",
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "en",
        "width": "100%",
        "height": "100%"
      }`;
    node.appendChild(script);
    return () => {
      // Clean up: Script entfernen
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TradingViewNews);
