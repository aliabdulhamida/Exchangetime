import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/exchangetime/layout';
import { siteOperator } from '@/lib/site-operator';

export function generateMetadata(): Metadata {
  return {
    title: 'Impressum · Exchange Time',
    robots: { index: siteOperator().complete, follow: true },
  };
}

export default function Imprint() {
  const operator = siteOperator();
  return (
    <Layout>
      <article
        lang="de"
        className="blog-container max-w-3xl mx-auto prose prose-lg dark:prose-invert"
      >
        <h1>Impressum</h1>
        {!operator.complete && (
          <p role="alert" className="border border-amber-500 p-4 rounded-lg">
            Einrichtung noch nicht abgeschlossen: Betreiberdaten und Hostingangaben fehlen ganz oder
            teilweise. Diese Seite ist noch kein vollständiges Impressum und darf nicht als Nachweis
            rechtlicher Konformität verwendet werden.
          </p>
        )}
        <h2>Anbieter</h2>
        <p>Angaben nach § 5 DDG, soweit anwendbar, und § 18 MStV.</p>
        <p className="whitespace-pre-line">
          {operator.name || 'Name/Firma noch nicht hinterlegt'}
          {'\n'}
          {operator.address || 'Ladungsfähige Anschrift noch nicht hinterlegt'}
        </p>
        {operator.representative && <p>Vertreten durch: {operator.representative}</p>}
        <h2>Kontakt</h2>
        {operator.email ? (
          <p>
            <a href={'mailto:' + operator.email}>{operator.email}</a>
          </p>
        ) : (
          <p>Kontakt-E-Mail noch nicht hinterlegt.</p>
        )}
        {operator.register && <p>Register: {operator.register}</p>}
        {operator.vatId && <p>Umsatzsteuer-Identifikationsnummer: {operator.vatId}</p>}
        <h2>Redaktionell verantwortlich</h2>
        <p>Verantwortlich gemäß § 18 Abs. 2 MStV für die Research Library:</p>
        <p className="whitespace-pre-line">
          {operator.editor || 'Verantwortliche Person noch nicht benannt'}
          {'\n'}
          {operator.editorAddress || 'Anschrift noch nicht hinterlegt'}
        </p>
        {operator.dispute && (
          <>
            <h2>Verbraucherstreitbeilegung</h2>
            <p>{operator.dispute}</p>
          </>
        )}
        <h2>Redaktion, KI und Finanzinformationen</h2>
        <p>
          Automatisch erstellte Wochenrückblicke werden als KI-gestützt gekennzeichnet. Quellen und
          Datenstand stehen im Artikel; generierte Bilder sind als Illustration bezeichnet. Eine
          Quellenprüfung ist keine Garantie für Fehlerfreiheit.
        </p>
        <p>
          Die Inhalte dienen der allgemeinen Information und berücksichtigen keine persönlichen
          Anlageverhältnisse. Ein Hinweis „keine Anlageberatung“ ersetzt keine gegebenenfalls
          einschlägigen kapitalmarktrechtlichen Pflichten.
        </p>
        <p>
          <Link href="/settings/privacy-policy">Datenschutz</Link> ·{' '}
          <Link href="/redaktion">Redaktionelle Grundsätze</Link>
        </p>
      </article>
    </Layout>
  );
}
