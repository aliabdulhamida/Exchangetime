import { motion, useReducedMotion, type Transition } from 'framer-motion';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TuneInRadioButtonProps {
  mode?: 'floating' | 'pill' | 'nav';
  open?: boolean;
  className?: string;
  contentClassName?: string;
  indicatorLayoutId?: string;
  indicatorTransition?: Transition;
  onBeforeOpen?: () => void;
  onOpenChange?: (open: boolean) => void;
}

const RADIO_EMBED_HEIGHT = 100;
const TUNEIN_STATIONS = [
  { id: 's110052', title: 'CNBC' },
  { id: 's165740', title: 'Bloomberg Radio' },
  { id: 's2583', title: 'Sky News' },
  { id: 's20431', title: 'FOX News Radio' },
  { id: 's310584', title: 'NBC News NOW' },
] as const;
const TUNEIN_EMBEDS = TUNEIN_STATIONS.map((station) => ({
  ...station,
  src: `https://tunein.com/embed/player/${station.id}/?background=dark`,
}));

function RadioIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.05 3.05a7 7 0 0 0 0 9.9.5.5 0 0 1-.707.707 8 8 0 0 1 0-11.314.5.5 0 0 1 .707.707m2.122 2.122a4 4 0 0 0 0 5.656.5.5 0 1 1-.708.708 5 5 0 0 1 0-7.072.5.5 0 0 1 .708.708m5.656-.708a.5.5 0 0 1 .708 0 5 5 0 0 1 0 7.072.5.5 0 1 1-.708-.708 4 4 0 0 0 0-5.656.5.5 0 0 1 0-.708m2.122-2.12a.5.5 0 0 1 .707 0 8 8 0 0 1 0 11.313.5.5 0 0 1-.707-.707 7 7 0 0 0 0-9.9.5.5 0 0 1 0-.707zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0" />
    </svg>
  );
}

function RadioEmbeds({ visible }: { visible: boolean }) {
  return (
    <>
      {TUNEIN_EMBEDS.map((station) => (
        <iframe
          key={station.id}
          src={station.src}
          style={{
            width: '100%',
            height: RADIO_EMBED_HEIGHT,
            border: 'none',
            display: visible ? 'block' : 'none',
          }}
          scrolling="no"
          frameBorder="no"
          title={station.title}
          allow="autoplay"
        />
      ))}
    </>
  );
}

export default function TuneInRadioButton({
  mode = 'floating',
  open: controlledOpen,
  className,
  contentClassName,
  indicatorLayoutId = 'et-mobile-nav-indicator',
  indicatorTransition,
  onBeforeOpen,
  onOpenChange,
}: TuneInRadioButtonProps) {
  const isPill = mode === 'pill';
  const isNav = mode === 'nav';
  const [internalOpen, setInternalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const wasDragging = useRef(false);
  const floatingButtonRef = useRef<HTMLButtonElement>(null);
  const navButtonRef = useRef<HTMLButtonElement>(null);
  const [navAnchorRect, setNavAnchorRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') {
      return { x: 24, y: 24 };
    }
    return {
      x: window.innerWidth - 100,
      y: window.innerHeight - 200,
    };
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();
  const open = controlledOpen ?? internalOpen;
  const mobileSheetTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 360, damping: 32, mass: 0.84 };
  const mobileBackdropTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.32, 0.72, 0, 1] };

  const setOpenState = useCallback(
    (nextOpen: boolean | ((prev: boolean) => boolean)) => {
      const resolvedOpen =
        typeof nextOpen === 'function'
          ? (nextOpen as (prev: boolean) => boolean)(open)
          : nextOpen;

      if (controlledOpen === undefined) {
        setInternalOpen(resolvedOpen);
      }

      onOpenChange?.(resolvedOpen);
    },
    [controlledOpen, onOpenChange, open],
  );

  const modalWidth = 320;
  const modalHeight = TUNEIN_EMBEDS.length * RADIO_EMBED_HEIGHT + 24;
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const isMobileViewport = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const buttonSize = isMobileViewport ? 42 : 48;
  const iconSize = isMobileViewport ? 20 : 24;

  const buttonWidth = buttonSize;
  const buttonHeight = buttonSize;
  let modalLeft = position.x;
  let modalTop = position.y + buttonHeight + 12;

  if (modalTop + modalHeight > winHeight) {
    if (position.y - modalHeight - 12 > 0) {
      modalTop = position.y - modalHeight - 12;
    } else if (position.x + buttonWidth + modalWidth + 12 < winWidth) {
      modalLeft = position.x + buttonWidth + 12;
      modalTop = position.y;
    } else if (position.x - modalWidth - 12 > 0) {
      modalLeft = position.x - modalWidth - 12;
      modalTop = position.y;
    } else {
      modalTop = winHeight - modalHeight - 16;
    }
  }

  if (modalLeft + modalWidth > winWidth) modalLeft = winWidth - modalWidth - 16;
  if (modalLeft < 0) modalLeft = 16;

  const modalId = isPill
    ? 'tunein-radio-modal-pill'
    : isNav
      ? 'tunein-radio-modal-nav'
      : 'tunein-radio-modal-floating';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open || dragging || isPill || isNav) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const modal = document.getElementById(modalId);
      if (modal?.contains(target) || floatingButtonRef.current?.contains(target)) return;
      setOpenState(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open, dragging, isPill, isNav, modalId, setOpenState]);

  useEffect(() => {
    if (!isNav || !open) return;

    const syncAnchor = () => {
      if (!navButtonRef.current) return;
      setNavAnchorRect(navButtonRef.current.getBoundingClientRect());
    };

    syncAnchor();
    window.addEventListener('resize', syncAnchor);
    window.addEventListener('scroll', syncAnchor, true);
    return () => {
      window.removeEventListener('resize', syncAnchor);
      window.removeEventListener('scroll', syncAnchor, true);
    };
  }, [isNav, open]);

  useEffect(() => {
    if (!isNav || !open) return;

    function handleClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const modal = document.getElementById(modalId);
      if (modal?.contains(target) || navButtonRef.current?.contains(target)) return;
      setOpenState(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isNav, modalId, open, setOpenState]);

  const getClampedPosition = useCallback(
    (clientX: number, clientY: number) => {
      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const isMobileViewport = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
      const buttonSize = isMobileViewport ? 42 : 48;
      const buttonWidth = buttonSize;
      const buttonHeight = buttonSize;
      const edgePadding = 8;

      let sidebarWidth = 256;
      if (typeof window !== 'undefined') {
        const isMobileLayout = window.innerWidth < 1024;
        if (isMobileLayout) {
          sidebarWidth = edgePadding;
        } else {
          const collapsed = localStorage.getItem('sidebar-collapsed');
          sidebarWidth = collapsed === 'true' ? 80 : 256;
        }
      }

      let newX = clientX - offset.x;
      let newY = clientY - offset.y;

      if (newX < sidebarWidth) newX = sidebarWidth;
      if (newY < edgePadding) newY = edgePadding;
      if (newX + buttonWidth > winWidth - edgePadding) newX = winWidth - buttonWidth - edgePadding;
      if (newY + buttonHeight > winHeight - edgePadding)
        newY = winHeight - buttonHeight - edgePadding;

      return { x: newX, y: newY };
    },
    [offset.x, offset.y],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPill || isNav) return;
    setDragging(true);
    wasDragging.current = false;
    setOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging && !isPill) {
        setPosition(getClampedPosition(e.clientX, e.clientY));
        wasDragging.current = true;
      }
    },
    [dragging, isPill, getClampedPosition],
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isPill || isNav) return;
    const touch = e.touches[0];
    if (!touch) return;
    setDragging(true);
    wasDragging.current = false;
    setOffset({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragging || isPill) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      setPosition(getClampedPosition(touch.clientX, touch.clientY));
      wasDragging.current = true;
    },
    [dragging, isPill, getClampedPosition],
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const handleMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (isPill || isNav) return;
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isPill, isNav, dragging, handleMouseMove, handleTouchMove, handleTouchEnd]);

  if (isPill) {
    return (
      <>
        <button
          type="button"
          className={`${className ?? ''} ${open ? 'et-mobile-nav-item-active' : ''}`}
          aria-label="Open radio player"
          aria-expanded={open}
          aria-controls={modalId}
          onClick={() => {
            if (!open) onBeforeOpen?.();
            setOpenState((prev) => !prev);
          }}
        >
          {open && (
            <motion.span
              layoutId={indicatorLayoutId}
              className="et-mobile-nav-indicator"
              transition={indicatorTransition}
              aria-hidden="true"
            />
          )}
          <span className={contentClassName ?? ''}>
            <RadioIcon size={18} />
            <span>Radio</span>
          </span>
        </button>

        {isMounted &&
          createPortal(
            <>
              <motion.button
                type="button"
                className="fixed inset-0 z-[62] bg-slate-950/40 lg:hidden"
                onClick={() => setOpenState(false)}
                aria-label="Close radio player"
                aria-hidden={!open}
                tabIndex={open ? 0 : -1}
                style={{ pointerEvents: open ? 'auto' : 'none' }}
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={mobileBackdropTransition}
              />
              <motion.section
                id={modalId}
                className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.1rem)] z-[63] overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-md lg:hidden"
                aria-hidden={!open}
                aria-label="Radio player"
                style={{
                  pointerEvents: open ? 'auto' : 'none',
                  visibility: open ? 'visible' : 'hidden',
                }}
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  y: open ? 0 : 14,
                  scale: open ? 1 : 0.98,
                }}
                transition={mobileSheetTransition}
              >
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Radio</p>
                  <button
                    type="button"
                    onClick={() => setOpenState(false)}
                    className="et-module-action h-7 w-7"
                    aria-label="Close radio panel"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="et-scrollbar max-h-[56vh] overflow-y-auto p-3">
                  <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
                    <RadioEmbeds visible />
                  </div>
                </div>
              </motion.section>
            </>,
            document.body,
          )}
      </>
    );
  }

  if (isNav) {
    const panelWidth = Math.min(320, winWidth - 16);
    let panelLeft = navAnchorRect?.left ?? 8;
    const anchorTop = navAnchorRect?.top ?? 56;
    const anchorBottom = navAnchorRect?.bottom ?? 56;
    let panelTop = anchorBottom + 8;

    if (panelLeft + panelWidth > winWidth - 8) {
      panelLeft = winWidth - panelWidth - 8;
    }
    if (panelLeft < 8) panelLeft = 8;

    if (panelTop + modalHeight > winHeight - 8) {
      const aboveAnchorTop = anchorTop - modalHeight - 8;
      panelTop = aboveAnchorTop > 8 ? aboveAnchorTop : Math.max(8, winHeight - modalHeight - 8);
    }

    return (
      <>
        <button
          ref={navButtonRef}
          type="button"
          className={`${className ?? ''} ${open ? 'text-foreground' : ''}`}
          aria-label="Open radio player"
          aria-expanded={open}
          aria-controls={modalId}
          onClick={() => {
            if (navButtonRef.current) {
              setNavAnchorRect(navButtonRef.current.getBoundingClientRect());
            }
            setOpenState((prev) => !prev);
          }}
        >
          <RadioIcon size={14} />
          <span>Radio</span>
        </button>

        {isMounted &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                left: panelLeft,
                top: panelTop,
                zIndex: 1100,
                pointerEvents: open ? 'auto' : 'none',
                display: open ? 'block' : 'none',
              }}
            >
              <div
                id={modalId}
                className="et-dropdown-panel w-[320px] max-w-[calc(100vw-1rem)] overflow-hidden p-2"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
                  <RadioEmbeds visible={open} />
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <button
          ref={floatingButtonRef}
          className={`et-floating-radio-button ${open ? 'et-floating-radio-button-open' : ''}`}
          style={{ position: 'relative', zIndex: 2, width: buttonSize, height: buttonSize }}
          tabIndex={0}
          aria-label="Open radio player"
          onClick={() => {
            if (wasDragging.current) {
              wasDragging.current = false;
              return;
            }
            setOpenState((prev) => !prev);
          }}
        >
          <RadioIcon size={iconSize} className="et-floating-radio-button-icon" />
        </button>
      </div>

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
            id={modalId}
            className="relative z-[1110] w-[320px] max-w-[90vw] rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-[#23232a] dark:bg-[#18181b]"
            style={{ visibility: 'visible', pointerEvents: 'auto' }}
          >
            <RadioEmbeds visible={open && !dragging} />
          </div>
        </div>

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
          {TUNEIN_EMBEDS.map((station) => (
            <iframe
              key={`${station.id}-hidden`}
              src={station.src}
              style={{ width: 0, height: 0, border: 'none' }}
              scrolling="no"
              frameBorder="no"
              title={`${station.title} (Hidden)`}
              allow="autoplay"
              tabIndex={-1}
            />
          ))}
        </div>
      </div>
    </>
  );
}
