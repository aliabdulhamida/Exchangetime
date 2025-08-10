'use client';

import { useMemo, useState } from 'react';

import { blogPosts, BlogList } from '@/components/blog-components';
import BlogLayout from '@/components/blog-layout';

// styles kommen global über app/globals.css

// Minimal helpers using built-in Date
function safeDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function toMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // e.g., 2025-08
}

export default function BlogPage() {
  // Single month filter (YYYY-MM)
  const [month, setMonth] = useState<string>('');

  // Sort posts by date desc once, then filter based on range
  const sortedPosts = useMemo(() => {
    return [...blogPosts].sort((a, b) => safeDate(b.date).getTime() - safeDate(a.date).getTime());
  }, []);

  // Build unique month options from posts
  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of blogPosts) {
      const d = safeDate(p.date);
      const key = toMonthKey(d); // e.g., 2025-08
      const label = new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
      }).format(d); // e.g., August 2025
      map.set(key, label);
    }
    // Sort by key desc (newest first)
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, []);

  const filteredPosts = useMemo(() => {
    if (!month) return sortedPosts;
    return sortedPosts.filter((post) => toMonthKey(safeDate(post.date)) === month);
  }, [month, sortedPosts]);

  return (
    <BlogLayout>
      <div className="blog-container">
        <div className="blog-header">
          <h1>Exchange Time Blog</h1>
          <p>
            Current insights into markets, trading strategies and financial education for informed
            investment decisions.
          </p>
        </div>

        {/* Simple month dropdown */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label
              htmlFor="month"
              className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
            >
              Filter by month
            </label>
            <div className="relative inline-block">
              <select
                id="month"
                aria-label="Filter by month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="min-w-[14rem] max-w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 pr-9 text-sm text-current shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              >
                <option value="">All dates</option>
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.147l3.71-3.915a.75.75 0 111.08 1.04l-4.24 4.47a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500 dark:text-gray-400">No articles found.</p>
          </div>
        ) : (
          <BlogList posts={filteredPosts} />
        )}
      </div>
    </BlogLayout>
  );
}
