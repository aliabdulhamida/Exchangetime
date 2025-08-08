"use client";

import { useState, useEffect } from "react";
import { List, Share2, ArrowUp } from "lucide-react";

interface ReadingProgressProps {
  target: React.RefObject<HTMLElement | null>;
}

export default function BlogEnhancements({ target }: ReadingProgressProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Reading progress
  useEffect(() => {
    const article = target.current;
    
    const scrollListener = () => {
      if (!article) return;
      
      // Calculate reading progress
      const totalHeight = article.clientHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      
      // How much can be scrolled (total height - window height)
      const scrollable = totalHeight - windowHeight;
      
      // Progress as a percentage
      const progress = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;
      setReadingProgress(progress);
      
      // Show scroll to top button when user has scrolled down a bit
      setShowScrollTop(scrollTop > 500);
    };
    
    // Add scroll event listener
    window.addEventListener("scroll", scrollListener);
    
    return () => {
      window.removeEventListener("scroll", scrollListener);
    };
  }, [target]);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  return (
    <>
      {/* Reading progress bar */}
      <div className="reading-progress-container">
        <div 
          className="reading-progress-bar" 
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-8 right-8 z-50 p-2 rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </>
  );
}
