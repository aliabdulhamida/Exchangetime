'use client';

import { Facebook, Linkedin, Mail, Link as LinkIcon, Download, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { SiX as XBrand } from 'react-icons/si';

import { toast } from '@/components/ui/use-toast';

interface ShareButtonsProps {
  title: string;
  url: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle copy link button
  const copyToClipboard = async () => {
    try {
      // Try modern clipboard API first, then fallback
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      // Auto-hide copied state
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: 'Copy failed',
        duration: 2000,
        variant: 'destructive',
        className: 'p-2 pr-3',
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      const currentUrl = typeof window !== 'undefined' ? window.location.href : url;
      if (!currentUrl) return;
      const res = await fetch(`/api/pdf?url=${encodeURIComponent(currentUrl)}`);
      if (!res.ok) throw new Error(`PDF API failed: ${res.status}`);
      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = fileUrl;
      const safeTitle = (title || document.title || 'blog-post')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      a.download = `${safeTitle || 'blog-post'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (e) {
      if (typeof window !== 'undefined') console.error('PDF download failed', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const shareLinks = {
    x: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  };

  return (
    <div ref={containerRef} className="share-buttons">
      <a
        href={shareLinks.x}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter"
        className="share-button"
      >
        <XBrand size={16} />
      </a>

      <a
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="share-button"
      >
        <Facebook size={16} />
      </a>

      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="share-button"
      >
        <Linkedin size={16} />
      </a>

      <a href={shareLinks.email} aria-label="Share via Email" className="share-button">
        <Mail size={16} />
      </a>

      <button
        onClick={copyToClipboard}
        aria-label="Copy link"
        className={`share-button transition-transform duration-150 active:scale-95 ${copied ? 'copy-expanded relative overflow-visible' : ''}`}
      >
        {copied ? (
          <>
            <span className="relative flex items-center justify-center">
              <span className="copied-halo" aria-hidden />
              <Check size={16} className="text-emerald-500 copied-check" />
            </span>
            <span className="text-[11px] font-medium text-emerald-500 copied-text">
              Link copied!
            </span>
          </>
        ) : (
          <LinkIcon size={16} />
        )}
        {copied && <span className="sr-only">Link copied!</span>}
      </button>
      {/* Right-aligned Download button */}
      <button
        onClick={handleDownloadPdf}
        aria-label="Als PDF herunterladen"
        title={isGeneratingPdf ? 'Erzeuge PDF…' : 'Als PDF herunterladen'}
        disabled={isGeneratingPdf}
        className="share-button ml-auto disabled:opacity-60"
      >
        <Download size={16} />
      </button>
    </div>
  );
}
