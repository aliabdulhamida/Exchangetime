"use client";

import { useRef, useEffect, useState } from 'react';
import { List } from 'lucide-react';

interface TableOfContentsProps {
  articleRef: React.RefObject<HTMLElement | null>;
}

interface HeadingData {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents({ articleRef }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Generate IDs for headings and collect them
  useEffect(() => {
    if (articleRef.current) {
      const article = articleRef.current;
      const elements = article.querySelectorAll('h2, h3');
      
      // Process all headings
      const headingItems: HeadingData[] = [];
      
      elements.forEach((element) => {
        // Create an ID if one doesn't exist
        if (!element.id) {
          const id = element.textContent?.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-') || `heading-${headingItems.length}`;
          
          element.id = id;
          
          // Add anchor link
          const anchor = document.createElement("a");
          anchor.className = "heading-anchor";
          anchor.href = `#${id}`;
          anchor.innerHTML = "#";
          element.appendChild(anchor);
        }
        
        const level = parseInt(element.tagName[1]);
        
        headingItems.push({
          id: element.id,
          text: element.textContent?.replace('#', '') || '',
          level: level
        });
      });
      
      setHeadings(headingItems);
    }
  }, [articleRef]);
  
  // Intersection observer for active heading
  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          setActiveId(entry.target.id);
        }
      });
    };
    
    const observerOptions = {
      rootMargin: '0px 0px -80% 0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observe headings
    if (articleRef.current) {
      const elements = articleRef.current.querySelectorAll('h2, h3');
      elements.forEach(element => observer.observe(element));
    }
    
    return () => observer.disconnect();
  }, [articleRef, headings]);
  
  if (headings.length === 0) {
    return null;
  }
  
  return (
    <nav className="toc">
      <div className="toc-title">
        <List size={20} />
        <span>Inhaltsverzeichnis</span>
      </div>
      <ul className="toc-list">
        {headings.map((heading) => (
          <li 
            key={heading.id}
            style={{ 
              paddingLeft: `${(heading.level - 2) * 1}rem`,
              fontWeight: activeId === heading.id ? '600' : '400'
            }}
          >
            <a 
              href={`#${heading.id}`}
              style={{ 
                color: activeId === heading.id ? 'var(--primary)' : 'inherit'
              }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({
                  behavior: 'smooth'
                });
                window.history.pushState(null, '', `#${heading.id}`);
              }}
            >
              {heading.text.replace('#', '')}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
