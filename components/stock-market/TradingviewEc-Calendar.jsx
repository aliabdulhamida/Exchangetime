
import React, { useEffect, useRef, memo } from 'react';



function TradingviewEcCalendar() {
  const container = useRef();

  useEffect(() => {
    if (!container.current) return;
    // Responsive Breite und Höhe bestimmen
    let width = 400;
    let height = 550;
    if (window.matchMedia('(max-width: 600px)').matches) {
      width = window.innerWidth - 32 > 320 ? window.innerWidth - 32 : 320;
      height = 420;
    } else if (window.matchMedia('(max-width: 900px)').matches) {
      width = 350;
      height = 480;
    }
    container.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "en",
        "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
        "importanceFilter": "0,1",
        "width": ${width},
        "height": ${height}
      }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TradingviewEcCalendar);
