
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';


interface NewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
}

interface FinnhubNewsItem {
  headline: string;
  datetime: number;
  summary: string;
  url: string;
  source: string;
}


const NewsModal: React.FC<NewsModalProps> = ({ open, onOpenChange, ticker }) => {
  const [news, setNews] = useState<FinnhubNewsItem[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Calculate last 7 days range
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const fromDate = sevenDaysAgo.toISOString().slice(0, 10);
  const toDate = today.toISOString().slice(0, 10);

  useEffect(() => {
    if (!open || !ticker) return;
    setLoading(true);
    setError(null);
  fetch(`/api/news?ticker=${ticker}&from=${fromDate}&to=${toDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNews(data);
          setPage(1);
        } else {
          setError('No news found.');
        }
      })
      .catch(() => setError('Failed to fetch news.'))
      .finally(() => setLoading(false));
  }, [open, ticker, fromDate, toDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-[420px] h-[750px] p-0 overflow-hidden bg-white dark:bg-black text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-900">
  <div className="relative">
  <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-black px-6 pt-4 pb-2 text-gray-900 dark:text-gray-100 flex flex-col items-center">
      <DialogTitle asChild>
  <div className="w-full flex flex-col items-center justify-center mt-1">
          <span className="text-base font-semibold text-gray-900 dark:text-white text-center">News for <span className="uppercase text-blue-600 dark:text-blue-400">{ticker}</span></span>
        </div>
      </DialogTitle>
    </DialogHeader>
  <DialogClose className="absolute right-6 top-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200">
  <span className="text-lg font-normal" aria-label="Close" title="Close">×</span>
    </DialogClose>
  </div>
  <div className="w-full border-b border-gray-200 dark:border-gray-800 mb-2" />
  <div className="px-6 pb-8 overflow-y-auto h-[590px]">
          {loading ? (
            Array.from({ length: pageSize }).map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full mb-2" />
            ))
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : news.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No news found.</div>
          ) : (
            news.slice((page - 1) * pageSize, page * pageSize).map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer group hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors border border-gray-100 dark:border-gray-800 mb-3 shadow-sm"
                onClick={() => window.open(item.url, '_blank')}
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-blue-600 dark:text-blue-400 group-hover:underline"
                  style={{ textDecoration: 'none' }}
                >
                  {item.headline}
                </a>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span>
                    {new Date(item.datetime * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded font-normal">
                    {item.source}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {item.summary}
                </div>
              </div>
            ))
          )}
        </div>
        {/* Pagination controls - always visible */}
  <div className="flex justify-center items-center gap-4 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky bottom-0 rounded-b-2xl">
          <button
            className="px-3 py-1 rounded bg-gray-100 dark:bg-black text-gray-700 dark:text-gray-200 font-medium disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-black/80 transition-colors"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Page {page} of {Math.max(1, Math.ceil(news.length / pageSize))}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-100 dark:bg-black text-gray-700 dark:text-gray-200 font-medium disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-black/80 transition-colors"
            onClick={() => setPage(page + 1)}
            disabled={page === Math.ceil(news.length / pageSize) || news.length === 0}
          >
            Next
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewsModal;
