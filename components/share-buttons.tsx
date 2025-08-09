"use client";

import { Facebook, Twitter, Linkedin, Mail, Link as LinkIcon, Download } from "lucide-react";
import { useRef, useState } from "react";

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
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
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
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  };
  
  return (
    <div ref={containerRef} className="share-buttons">
      <a 
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter"
        className="share-button"
      >
        <Twitter size={16} />
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
      
      <a 
        href={shareLinks.email}
        aria-label="Share via Email"
        className="share-button"
      >
        <Mail size={16} />
      </a>
      
      <button 
        onClick={copyToClipboard}
        aria-label="Copy link"
        className="share-button"
        title={copied ? "Link copied!" : "Copy link"}
      >
        <LinkIcon size={16} />
        {copied && <span className="sr-only">Link copied!</span>}
      </button>
      {/* Right-aligned Download button */}
      <button
        onClick={handleDownloadPdf}
        aria-label="Als PDF herunterladen"
        title={isGeneratingPdf ? "Erzeuge PDF…" : "Als PDF herunterladen"}
        disabled={isGeneratingPdf}
        className="share-button ml-auto disabled:opacity-60"
      >
        <Download size={16} />
      </button>
    </div>
  );
}
