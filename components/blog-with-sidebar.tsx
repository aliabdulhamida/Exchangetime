"use client";

import BlogLayout from "@/components/blog-layout";
import BlogSidebar from "@/components/blog-sidebar";
import { ReactNode } from "react";

interface BlogWithSidebarProps {
  children: ReactNode;
}

export default function BlogWithSidebar({ children }: BlogWithSidebarProps) {
  return (
    <BlogLayout>
      <div className="blog-container">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Hauptinhalt */}
          <div className="flex-1">
            {children}
          </div>
          
          {/* Seitenleiste */}
          <BlogSidebar />
        </div>
      </div>
    </BlogLayout>
  );
}
