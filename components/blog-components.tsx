'use client';

import { BlogCard } from './blog-card';

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
    ? posts.filter((post) => post.categories.includes(category))
    : posts;

  if (filteredPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500 dark:text-gray-400">
          No articles found in this category.
        </p>
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

export function BlogCategories({
  categories,
  activeCategory,
  onSelectCategory,
}: BlogCategoriesProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3 py-1 text-sm rounded-full transition-colors ${
          activeCategory === null
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
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            activeCategory === category
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
    id: 13,
    title: 'Walmart Earnings Report: In-Depth Analysis & Outlook',
    excerpt:
      'A comprehensive analysis of Walmart’s financial health, strategic initiatives, and market outlook ahead of the upcoming earnings announcement.',
    date: 'August 21, 2025',
    image:
      'https://images.unsplash.com/photo-1648091855110-77a1c3dead63?q=80&w=2708&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    categories: ['Markets', 'Analysis', 'Earnings'],
    slug: 'walmart-earnings-analysis',
  },
  {
    id: 12,
    title: 'The Historic Trump-Putin Summit: A Geopolitical Gamble with Stock Market Ripples',
    excerpt:
      'A high-stakes summit in Alaska between Trump and Putin sends ripples through global markets, with impacts on stocks, energy, and investor sentiment.',
    date: 'August 15, 2025',
    image:
      'https://images.unsplash.com/photo-1534598974068-2d51eda7628f?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    categories: ['Markets', 'Weekly Wrap', 'Geopolitics'],
    slug: 'the-historic-trump-putin-summit',
  },
  {
    id: 11,
    title: 'Weekly Market Wrap: Records, Rotations, and a Reality Check – August 11–15, 2025',
    excerpt:
      'A dramatic week for U.S. stocks: record highs, inflation optimism, PPI reality check, sector rotations, and what lies ahead for investors.',
    date: 'August 15, 2025',
    image:
      'https://images.unsplash.com/photo-1439434768192-c60615c1b3c8?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    categories: ['Markets', 'Weekly Wrap', 'Trends'],
    slug: 'weekly-market-wrap-aug-2025',
  },
  {
    id: 10,
    title: 'Weekend Read: Warren Buffett’s Investing Lessons for Today’s Markets',
    excerpt:
      'A modern, analytical take on Buffett’s playbook: moats, owner earnings, capital allocation, and practical checklists to navigate today’s markets.',
    date: 'August 10, 2025',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&h=450&q=80',
    categories: ['Investing', 'Strategy', 'Markets'],
    slug: 'warren-buffett-investing-lessons-weekend-read',
  },
  {
    id: 9,
    title: 'Weekend Read: Lessons from the Dot-Com Bubble (1995–2002)',
    excerpt:
      "Deep dive into the build-up, peak and aftermath of the internet mania: capital flows, valuations, behavior, survivors, and actionable lessons for today's thematic booms.",
    date: 'August 9, 2025',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=450',
    categories: ['Markets', 'History', 'Investing'],
    slug: 'dot-com-bubble-weekend-read',
  },
  // Real Estate vs. Stocks post removed
  {
    id: 7,
    title: 'Stock Market Trends 2025: January to August',
    excerpt:
      'Key equity market trends YTD: AI leadership, sector rotation, earnings resilience, and what to watch into Q4.',
    date: 'August 8, 2025',
    image:
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&h=450',
    categories: ['Markets', 'Trends'],
    slug: 'boersentrends-jan-aug-2025',
  },
  {
    id: 1,
    title: 'Market Analysis: The Impact of Interest Rate Policy on Global Markets',
    excerpt:
      'A detailed analysis of how current interest rate decisions affect various markets and which sectors are most affected.',
    date: 'August 8, 2025',
    image:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&h=450',
    categories: ['Markets', 'Analysis'],
    slug: 'marktanalyse-zinspolitik',
  },
  {
    id: 2,
    title: 'Technical Analysis: Fundamentals for Beginners',
    excerpt:
      'Learn the basics of technical analysis and how to identify chart patterns to make better trading decisions.',
    date: 'August 5, 2025',
    image:
      'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=800&h=450',
    categories: ['Education', 'Trading'],
    slug: 'technische-analyse-grundlagen',
  },
  {
    id: 3,
    title: 'Cryptocurrencies: A New Era of Trading?',
    excerpt:
      'How cryptocurrencies are changing the financial world and what opportunities and risks exist for investors.',
    date: 'August 1, 2025',
    image:
      'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&h=450',
    categories: ['Crypto', 'Innovation'],
    slug: 'kryptowaehrungen-neue-aera',
  },
  {
    id: 4,
    title: 'Portfolio Diversification in Uncertain Times',
    excerpt:
      'Strategies for diversifying your investment portfolio to minimize risks and secure long-term returns.',
    date: 'July 28, 2025',
    image:
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&h=450',
    categories: ['Strategy', 'Investing'],
    slug: 'portfoliodiversifikation',
  },
  {
    id: 5,
    title: 'The Psychology of Trading: Keeping Emotions Under Control',
    excerpt:
      'How emotions can influence your trading decisions and techniques to keep a clear head.',
    date: 'July 25, 2025',
    image:
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&h=450',
    categories: ['Psychology', 'Trading'],
    slug: 'psychologie-des-handels',
  },
  {
    id: 6,
    title: 'ESG Investments: Sustainability as a Growth Driver',
    excerpt:
      'Why sustainable investments can be good not only for the planet but also for your portfolio.',
    date: 'July 20, 2025',
    image:
      'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&h=450',
    categories: ['ESG', 'Trends'],
    slug: 'esg-investitionen',
  },
];

// Extract all unique categories from blog articles
export const allCategories = Array.from(
  new Set(blogPosts.flatMap((post) => post.categories)),
).sort();
