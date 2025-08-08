"use client";

import { useState, useEffect, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BlogCard } from "./blog-card";

// Typ-Definitionen
export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  categories: string[];
  slug: string;
}

// Blog article list component
interface BlogListProps {
  posts: BlogPost[];
  category?: string | null;
}

export function BlogList({ posts, category }: BlogListProps) {
  const filteredPosts = category 
    ? posts.filter(post => post.categories.includes(category))
    : posts;
    
  if (filteredPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500 dark:text-gray-400">No articles found in this category.</p>
      </div>
    );
  }

  return (
    <div className="blog-grid">
      {filteredPosts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// Blog categories component
interface BlogCategoriesProps {
  categories: string[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function BlogCategories({ categories, activeCategory, onSelectCategory }: BlogCategoriesProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button 
        onClick={() => onSelectCategory(null)} 
        className={`px-3 py-1 text-sm rounded-full transition-colors ${activeCategory === null 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        All
      </button>
      
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${activeCategory === category 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}



// Export blog sample articles
export const blogPosts: BlogPost[] = [
  {
    id: 8,
    title: "Real Estate vs. Stocks: A Comprehensive Investor’s Guide",
    excerpt: "An in-depth comparison of direct real estate, REITs, and equities: returns, risk, liquidity, taxes, and practical takeaways.",
    date: "August 8, 2025",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&h=450",
    categories: ["Investing", "Markets"],
    slug: "real-estate-vs-stocks"
  },
  {
    id: 7,
    title: "Stock Market Trends 2025: January to August",
    excerpt: "Key equity market trends YTD: AI leadership, sector rotation, earnings resilience, and what to watch into Q4.",
    date: "August 8, 2025",
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&h=450",
    categories: ["Markets", "Trends"],
    slug: "boersentrends-jan-aug-2025"
  },
  {
    id: 1,
    title: "Market Analysis: The Impact of Interest Rate Policy on Global Markets",
    excerpt: "A detailed analysis of how current interest rate decisions affect various markets and which sectors are most affected.",
    date: "August 8, 2025",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&h=450",
    categories: ["Markets", "Analysis"],
    slug: "marktanalyse-zinspolitik"
  },
  {
    id: 2,
    title: "Technical Analysis: Fundamentals for Beginners",
    excerpt: "Learn the basics of technical analysis and how to identify chart patterns to make better trading decisions.",
    date: "August 5, 2025",
    image: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=800&h=450",
    categories: ["Education", "Trading"],
    slug: "technische-analyse-grundlagen"
  },
  {
    id: 3,
    title: "Cryptocurrencies: A New Era of Trading?",
    excerpt: "How cryptocurrencies are changing the financial world and what opportunities and risks exist for investors.",
    date: "August 1, 2025",
    image: "https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&h=450",
    categories: ["Crypto", "Innovation"],
    slug: "kryptowaehrungen-neue-aera"
  },
  {
    id: 4,
    title: "Portfolio Diversification in Uncertain Times",
    excerpt: "Strategies for diversifying your investment portfolio to minimize risks and secure long-term returns.",
    date: "July 28, 2025",
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&h=450",
    categories: ["Strategy", "Investing"],
    slug: "portfoliodiversifikation"
  },
  {
    id: 5,
    title: "The Psychology of Trading: Keeping Emotions Under Control",
    excerpt: "How emotions can influence your trading decisions and techniques to keep a clear head.",
    date: "July 25, 2025",
    image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&h=450",
    categories: ["Psychology", "Trading"],
    slug: "psychologie-des-handels"
  },
  {
    id: 6,
    title: "ESG Investments: Sustainability as a Growth Driver",
    excerpt: "Why sustainable investments can be good not only for the planet but also for your portfolio.",
    date: "July 20, 2025",
    image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&h=450",
    categories: ["ESG", "Trends"],
    slug: "esg-investitionen"
  }
];

// Extract all unique categories from blog articles
export const allCategories = Array.from(
  new Set(blogPosts.flatMap(post => post.categories))
).sort();
