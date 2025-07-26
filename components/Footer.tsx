import React from "react";

export default function Footer() {
  return (
    <footer className="w-full border-t bg-white dark:bg-zinc-900 text-center py-4 text-xs text-zinc-500 dark:text-zinc-400 relative">
      <span>
        © {new Date().getFullYear()} Exchange Time. All rights reserved.
      </span>
    </footer>
  );
}
