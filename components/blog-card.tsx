'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { BlogPost } from './blog-components';

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const [imageError, setImageError] = useState(false);

  // Kategoriespezifische Web-Bilder von Unsplash und anderen freien Quellen
  let webFallbackImage = '';

  // Kategoriespezifische Web-Bilder
  if (post.categories.includes('Markets')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Trading')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Crypto')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Education')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Psychology')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('ESG')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Analysis')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Strategy')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Investing')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('Innovation')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&h=450';
  } else if (post.categories.includes('History')) {
    webFallbackImage =
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=450';
  } else {
    webFallbackImage =
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&h=450';
  }

  return (
    <Link href={`/blog/${post.slug}`} className="blog-card">
      <div className="blog-card-image-container">
        <Image
          src={imageError ? webFallbackImage : post.image}
          alt={post.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={post.id <= 3}
          className="blog-card-image"
          onError={() => setImageError(true)}
        />
      </div>
      <div className="blog-card-content">
        <div className="blog-categories">
          {post.categories.map((category, index) => (
            <span key={index} className="blog-category">
              {category}
            </span>
          ))}
        </div>
        <p className="blog-card-date">{post.date}</p>
        <h2 className="blog-card-title">{post.title}</h2>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        <span className="blog-card-link">
          Read more <ArrowRight />
        </span>
      </div>
    </Link>
  );
}
