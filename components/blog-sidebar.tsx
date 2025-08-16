'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { blogPosts, allCategories } from '@/components/blog-components';

export default function BlogSidebar() {
  // Sortiere Beiträge nach Datum (neueste zuerst)
  // Custom order: ensure 'Weekly Market Wrap' appears before 'Warren Buffett' if both are present
  let latestPosts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const wrapIndex = latestPosts.findIndex((post) => post.slug === 'weekly-market-wrap-aug-2025');
  const buffettIndex = latestPosts.findIndex(
    (post) => post.slug === 'warren-buffett-investing-lessons-weekend-read',
  );
  if (wrapIndex > -1 && buffettIndex > -1 && wrapIndex > buffettIndex) {
    // Move 'Weekly Market Wrap' to just before 'Warren Buffett'
    const [wrapPost] = latestPosts.splice(wrapIndex, 1);
    latestPosts.splice(buffettIndex, 0, wrapPost);
  }
  latestPosts = latestPosts.slice(0, 4);

  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      {/* Neueste Artikel */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Neueste Artikel</h3>
        <div className="space-y-4">
          {latestPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="flex flex-col space-y-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span className="font-medium line-clamp-2">{post.title}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{post.date}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Kategorien */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Kategorien</h3>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((category) => {
            // Zähle Beiträge pro Kategorie
            const count = blogPosts.filter((post) => post.categories.includes(category)).length;

            return (
              <Link
                key={category}
                href={`/blog?category=${encodeURIComponent(category)}`}
                className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {category} <span className="text-gray-500 dark:text-gray-400">({count})</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Newsletter-Anmeldung */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Newsletter abonnieren</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Erhalten Sie die neuesten Marktanalysen und Finanztrends direkt in Ihr Postfach.
        </p>
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Ihre E-Mail-Adresse"
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
          />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center">
            Abonnieren <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
