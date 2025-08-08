"use client";

import Layout from "@/components/exchangetime/layout";
import Sidebar from "@/components/exchangetime/sidebar";
import { useState, useEffect, ReactNode } from "react";

interface BlogLayoutProps {
  children: ReactNode;
}

export default function BlogLayout({ children }: BlogLayoutProps) {
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function showModule(module: string) {
    setVisibleModules((prev) => prev.includes(module) ? prev : [...prev, module]);
  }

  function hideModule(module: string) {
    setVisibleModules((prev) => prev.filter((m) => m !== module));
  }

  if (!mounted) {
    return null;
  }

  return (
    <Layout
      sidebar={<Sidebar visibleModules={visibleModules} showModule={showModule} hideModule={hideModule} />}
    >
      {children}
    </Layout>
  );
}
