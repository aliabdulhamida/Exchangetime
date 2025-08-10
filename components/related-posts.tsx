'use client';

import { blogPosts } from '@/components/blog-components';

import { BlogCard } from './blog-card';

interface RelatedPostsProps {
  currentPostSlug: string;
  maxPosts?: number;
  categories?: string[];
}

export default function RelatedPosts({
  currentPostSlug,
  maxPosts = 3,
  categories,
}: RelatedPostsProps) {
  // Find the current post by slug
  const currentPost = blogPosts.find((post) => post.slug === currentPostSlug);

  // If no current post is found or no categories are available
  if (!currentPost) {
    return null;
  }

  // Use the passed categories or the categories of the current post
  const targetCategories = categories || currentPost.categories;

  // Find related posts based on common categories, but not the current post
  const related = blogPosts
    .filter(
      (post) =>
        post.slug !== currentPostSlug &&
        post.categories.some((cat) => targetCategories.includes(cat)),
    )
    .sort((a, b) => {
      // Calculate the number of matching categories
      const aMatchCount = a.categories.filter((cat) => targetCategories.includes(cat)).length;
      const bMatchCount = b.categories.filter((cat) => targetCategories.includes(cat)).length;
      // Sort by number of matches and then by date
      return bMatchCount - aMatchCount || new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, maxPosts);

  // If no related posts are found, show the newest posts (except the current one)
  const postsToShow =
    related.length > 0
      ? related
      : blogPosts
          .filter((post) => post.slug !== currentPostSlug)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, maxPosts);

  if (postsToShow.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
      <h2 className="text-2xl font-bold mb-6">You might also be interested in</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {postsToShow.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
