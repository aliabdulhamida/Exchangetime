import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 py-6 mt-10 text-sm text-muted-foreground"
      aria-label="Legal information"
    >
      <span>© {new Date().getFullYear()} Exchange Time</span>
      <Link href="/impressum">Legal notice / Impressum</Link>
      <Link href="/settings/privacy-policy">Privacy policy</Link>
      <Link href="/redaktion">Editorial & AI policy</Link>
    </footer>
  );
}
