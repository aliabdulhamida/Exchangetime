'use client';
import { useEffect, useState } from 'react';

export default function DownloadAppOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Nur auf mobilen Geräten und iOS Safari anzeigen
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    if (isIOS && isSafari && !isStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: '100vw',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: '#222',
          color: '#fff',
          borderRadius: 12,
          margin: 16,
          padding: '10px 18px 10px 14px',
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          Install app:
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            height="20"
            width="20"
            style={{ margin: '0 4px -2px 4px' }}
          >
            <desc>Ios Share Streamline Icon: https://streamlinehq.com</desc>
            <path
              fill="#fff"
              d="M5.5 23c-0.4 0 -0.75 -0.15 -1.05 -0.45 -0.3 -0.3 -0.45 -0.65 -0.45 -1.05V8.775c0 -0.4 0.15 -0.75 0.45 -1.05 0.3 -0.3 0.65 -0.45 1.05 -0.45h4.225v1.5H5.5V21.5h13V8.775h-4.275v-1.5H18.5c0.4 0 0.75 0.15 1.05 0.45 0.3 0.3 0.45 0.65 0.45 1.05V21.5c0 0.4 -0.15 0.75 -0.45 1.05 -0.3 0.3 -0.65 0.45 -1.05 0.45H5.5Zm5.725 -7.675V3.9l-2.2 2.2 -1.075 -1.075L11.975 1 16 5.025l-1.075 1.075 -2.2 -2.2v11.425h-1.5Z"
              stroke-width="0.5"
            ></path>
          </svg>
          &rarr; <b>Add to Home Screen</b>
        </span>
        <button
          onClick={() => setShow(false)}
          style={{
            background: 'transparent',
            color: '#fff',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            marginLeft: 4,
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="Overlay schließen"
        >
          ×
        </button>
      </div>
    </div>
  );
}
