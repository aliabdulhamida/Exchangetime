"use client";

import { useEffect, useState, RefObject } from "react";

export function useReadingTime(ref: RefObject<HTMLElement | null>, wpm = 220) {
  const [readingTime, setReadingTime] = useState<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const text = (el.innerText || el.textContent || "").trim();
    if (!text) return;
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / wpm));
    setReadingTime(`${minutes} min read`);
  }, [ref, wpm]);

  return readingTime;
}
