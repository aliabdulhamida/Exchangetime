import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function TuneInRadioButton() {
  // Place this after all state declarations and before return
  const [open, setOpen] = useState(false);
  const wasDragging = useRef(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 100,
    y: window.innerHeight - 200,
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Calculate modal position to stay within browser borders (inside render)
  const modalWidth = 320;
  const modalHeight = 225;
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  // Modal should never overlap the button
  const buttonWidth = 48;
  const buttonHeight = 48;
  let modalLeft = position.x;
  let modalTop = position.y + buttonHeight + 12; // Default: below button

  // Try below, if not enough space, try above
  if (modalTop + modalHeight > winHeight) {
    // Try above
    if (position.y - modalHeight - 12 > 0) {
      modalTop = position.y - modalHeight - 12;
    } else {
      // Try right
      if (position.x + buttonWidth + modalWidth + 12 < winWidth) {
        modalLeft = position.x + buttonWidth + 12;
        modalTop = position.y;
      } else if (position.x - modalWidth - 12 > 0) {
        // Try left
        modalLeft = position.x - modalWidth - 12;
        modalTop = position.y;
      } else {
        // Default to below, but clamp to viewport
        modalTop = winHeight - modalHeight - 16;
      }
    }
  }
  // Clamp modalLeft
  if (modalLeft + modalWidth > winWidth) modalLeft = winWidth - modalWidth - 16;
  if (modalLeft < 0) modalLeft = 16;

  // Update position on drag
  // Close modal on outside click
  useEffect(() => {
    if (!open || dragging) return;
    function handleClick(e: MouseEvent) {
      const modal = document.getElementById('tunein-radio-modal');
      if (modal && !modal.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, dragging]);
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    wasDragging.current = false;
    setOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging) {
        const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const buttonWidth = 48; // Approximate button size
        const buttonHeight = 48;
        // Get sidebar width from localStorage
        let sidebarWidth = 256;
        if (typeof window !== 'undefined') {
          const collapsed = localStorage.getItem('sidebar-collapsed');
          sidebarWidth = collapsed === 'true' ? 80 : 256;
        }
        let newX = e.clientX - offset.x;
        let newY = e.clientY - offset.y;
        // Clamp position so button stays within viewport and not behind sidebar
        if (newX < sidebarWidth) newX = sidebarWidth;
        if (newY < 0) newY = 0;
        if (newX + buttonWidth > winWidth) newX = winWidth - buttonWidth;
        if (newY + buttonHeight > winHeight) newY = winHeight - buttonHeight;
        setPosition({ x: newX, y: newY });
        wasDragging.current = true;
      }
    },
    [dragging, offset],
  );
  const handleMouseUp = () => {
    setDragging(false);
  };
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove]);

  return (
    <>
      {/* Movable radio button */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          className="rounded-full shadow-xl bg-white dark:bg-[#18181b] border-2 border-gray-300 dark:border-[#23232a] p-3 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none"
          style={{ position: 'relative', zIndex: 2 }}
          tabIndex={0}
          aria-label="Radio öffnen"
          onClick={() => {
            if (wasDragging.current) {
              wasDragging.current = false;
              return;
            }
            setOpen((prev) => !prev);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 16 16"
            className="text-black dark:text-white"
          >
            <path d="M3.05 3.05a7 7 0 0 0 0 9.9.5.5 0 0 1-.707.707 8 8 0 0 1 0-11.314.5.5 0 0 1 .707.707m2.122 2.122a4 4 0 0 0 0 5.656.5.5 0 1 1-.708.708 5 5 0 0 1 0-7.072.5.5 0 0 1 .708.708m5.656-.708a.5.5 0 0 1 .708 0 5 5 0 0 1 0 7.072.5.5 0 1 1-.708-.708 4 4 0 0 0 0-5.656.5.5 0 0 1 0-.708m2.122-2.12a.5.5 0 0 1 .707 0 8 8 0 0 1 0 11.313.5.5 0 0 1-.707-.707 7 7 0 0 0 0-9.9.5.5 0 0 1 0-.707zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0" />
          </svg>
        </button>
      </div>
      {/* Radio player is always mounted, modal UI overlays only when open */}
      <div>
        <div
          style={{
            position: 'fixed',
            left: modalLeft,
            top: modalTop,
            zIndex: 1100,
            pointerEvents: open && !dragging ? 'auto' : 'none',
            display: open && !dragging ? 'block' : 'none',
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          <div
            id="tunein-radio-modal"
            className="relative w-[320px] max-w-[90vw] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#23232a] rounded-lg shadow-xl p-2 z-[1110]"
            style={{ visibility: 'visible', pointerEvents: 'auto' }}
          >
            {/* The radio player iframes are always mounted, only visually hidden when modal is closed */}
            <iframe
              src="https://tunein.com/embed/player/s110052/"
              style={{
                width: '100%',
                height: 100,
                border: 'none',
                display: open && !dragging ? 'block' : 'none',
              }}
              scrolling="no"
              frameBorder="no"
              title="Radio Player 2"
              allow="autoplay"
            />
            <iframe
              src="https://tunein.com/embed/player/s165740/"
              style={{
                width: '100%',
                height: 100,
                border: 'none',
                display: open && !dragging ? 'block' : 'none',
              }}
              scrolling="no"
              frameBorder="no"
              title="Radio Player"
              allow="autoplay"
            />
          </div>
        </div>
        {/* Always mounted, hidden visually but still playing (for continuous playback) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 0,
            height: 0,
            overflow: 'hidden',
          }}
        >
          <iframe
            src="https://tunein.com/embed/player/s110052/"
            style={{ width: 0, height: 0, border: 'none' }}
            scrolling="no"
            frameBorder="no"
            title="Radio Player 2"
            allow="autoplay"
            tabIndex={-1}
          />
          <iframe
            src="https://tunein.com/embed/player/s165740/"
            style={{ width: 0, height: 0, border: 'none' }}
            scrolling="no"
            frameBorder="no"
            title="Radio Player"
            allow="autoplay"
            tabIndex={-1}
          />
        </div>
      </div>
    </>
  );
}
