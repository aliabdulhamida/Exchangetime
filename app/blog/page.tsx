"use client";

import { Search } from "lucide-react";
import BlogLayout from "@/components/blog-layout";
import { useState } from "react";
import { blogPosts, BlogList } from "@/components/blog-components";
import "@/styles/blog.css";

export default function BlogPage() {
  // Alle Blogposts ohne Filter anzeigen
  const filteredPosts = blogPosts;

  return (
    <BlogLayout>
      <div className="blog-container">
        <div className="blog-header">
          <h1>Exchange Time Blog</h1>
          <p>
            Current insights into markets, trading strategies and financial education for informed investment decisions.
          </p>
        </div>
        
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No articles found.
            </p>
          </div>
        ) : (
          <BlogList posts={filteredPosts} />
        )}
      </div>
    </BlogLayout>
  );
}
