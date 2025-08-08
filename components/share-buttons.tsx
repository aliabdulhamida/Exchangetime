"use client";

import { Facebook, Twitter, Linkedin, Mail, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  url: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  
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
  
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  };
  
  return (
    <div className="share-buttons">
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
    </div>
  );
}
