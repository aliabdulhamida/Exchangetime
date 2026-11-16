import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 py-6 mt-10 text-sm text-muted-foreground"
      aria-label="Rechtliche Informationen"
    >
      <span>© {new Date().getFullYear()} Exchange Time</span>
      <Link href="/impressum">Impressum</Link>
      <Link href="/settings/privacy-policy">Datenschutz</Link>
      <Link href="/redaktion">Redaktion & KI</Link>
    </footer>
  );
}
