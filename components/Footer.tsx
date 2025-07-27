

export default function Footer() {
  return (
    <footer className="w-full border-t bg-white dark:bg-[#0F0F12] px-3 sm:px-6 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400 relative z-10">
      © {new Date().getFullYear()} Exchange Time. All rights reserved.
    </footer>
  );
}
