'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState, RefObject, useCallback } from 'react';

interface BackToTopProps {
  target?: RefObject<HTMLElement | null>;
  threshold?: number; // px to start showing button
}

function isScrollable(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const oy = style.overflowY;
  return oy === 'auto' || oy === 'scroll';
}

function getScrollableParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el as HTMLElement | null;
  while (node && node.parentElement) {
    node = node.parentElement;
    if (node && isScrollable(node)) return node;
  }
  return window;
}

export default function BackToTop({ target, threshold = 300 }: BackToTopProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(() => {
    const article = target?.current ?? null;
    const container = getScrollableParent(article);

    const getScrollTop = (c: HTMLElement | Window) =>
      c === window
        ? window.pageYOffset || document.documentElement.scrollTop || 0
        : (c as HTMLElement).scrollTop;

    const getClientHeight = (c: HTMLElement | Window) =>
      c === window ? window.innerHeight : (c as HTMLElement).clientHeight;

    const getScrollHeight = (c: HTMLElement | Window) =>
      c === window
        ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
        : (c as HTMLElement).scrollHeight;

    const scrollTop = getScrollTop(container);
    const clientH = getClientHeight(container);

    let p = 0;

    if (article) {
      const containerRect =
        container === window ? { top: 0 } : (container as HTMLElement).getBoundingClientRect();
      const articleRect = article.getBoundingClientRect();
      const articleTop = articleRect.top - (containerRect as DOMRect).top + scrollTop;
      const articleHeight = article.scrollHeight || article.offsetHeight;
      const maxScrollable = Math.max(articleHeight - clientH, 1);
      const scrolled = Math.min(Math.max(scrollTop - articleTop, 0), maxScrollable);
      p = Math.min(Math.max(scrolled / maxScrollable, 0), 1);
    } else {
      const total = Math.max(getScrollHeight(container) - clientH, 1);
      p = Math.min(Math.max(scrollTop / total, 0), 1);
    }

    setProgress(p);
    setVisible(scrollTop > threshold);
  }, [target, threshold]);

  useEffect(() => {
    const article = target?.current ?? null;
    const container = getScrollableParent(article);

    onScroll();

    const handler = () => onScroll();
    if (container === window) {
      window.addEventListener('scroll', handler, { passive: true });
      window.addEventListener('resize', handler);
      return () => {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
      };
    } else {
      (container as HTMLElement).addEventListener('scroll', handler, { passive: true });
      window.addEventListener('resize', handler);
      return () => {
        (container as HTMLElement).removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
      };
    }
  }, [target, onScroll]);

  const size = 48;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <button
      aria-label="Back to top"
      title="Back to top"
      className={`back-to-top ${visible ? 'back-to-top--visible' : ''}`}
      onClick={() => {
        const article = target?.current ?? null;
        const container = getScrollableParent(article);
        if (container === window) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          (container as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="back-to-top__svg">
        <circle
          className="back-to-top__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="back-to-top__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
        />
      </svg>
      <ArrowUp className="back-to-top__icon" size={18} strokeWidth={2.25} />
    </button>
  );
}
