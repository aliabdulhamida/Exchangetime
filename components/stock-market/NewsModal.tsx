'use client';

import { ExternalLink, Newspaper } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6);
    return date;
  }, [today]);
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
          setNews([]);
          setError('No news found.');
        }
      })
      .catch(() => {
        setNews([]);
        setError('Failed to fetch news.');
      })
      .finally(() => setLoading(false));
  }, [open, ticker, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(news.length / pageSize));
  const paginatedNews = news.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden border-border bg-background p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border bg-card/60 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 rounded-md border border-border bg-background p-1.5 text-muted-foreground">
              <Newspaper className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                News for <span className="uppercase text-foreground">{ticker}</span>
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="et-scrollbar max-h-[calc(88vh-156px)] space-y-3 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {loading ? (
            Array.from({ length: pageSize }).map((_, idx) => (
              <Skeleton key={idx} className="h-28 w-full rounded-xl" />
            ))
          ) : error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : paginatedNews.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No news found.
            </div>
          ) : (
            paginatedNews.map((item, idx) => (
              <a
                key={`${item.url}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-border bg-card/40 p-4 transition hover:border-foreground/20 hover:bg-card/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.source || 'Source'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.datetime * 1000).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground group-hover:underline">
                  {item.headline}
                </h4>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 group-hover:text-foreground">
                  Read article
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </a>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card/40 px-5 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            Previous
          </button>

          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || news.length === 0}
            aria-label="Next page"
          >
            Next
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default NewsModal;
