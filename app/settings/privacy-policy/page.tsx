import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/exchangetime/layout';
import { siteOperator } from '@/lib/site-operator';

export const metadata: Metadata = {
  title: 'Datenschutz · Exchange Time',
  robots: { index: false, follow: true },
};

export default function PrivacyPolicyPage() {
  const operator = siteOperator();
  return (
    <Layout>
      <article
        lang="de"
        className="blog-container max-w-3xl mx-auto prose prose-lg dark:prose-invert"
      >
        <h1>Datenschutzhinweise</h1>
        <p className="terminal-note">Stand: 16. November 2026 · technischer Stand dieser Website</p>
        {!operator.complete && (
          <p role="alert" className="border border-amber-500 p-4 rounded-lg">
            Diese Hinweise sind noch nicht vollständig: Die Identität des Verantwortlichen und
            Angaben des tatsächlichen Hostingbetriebs müssen vor Veröffentlichung bestätigt bzw.
            ergänzt werden.
          </p>
        )}
        <h2>1. Verantwortlicher und Kontakt</h2>
        <p className="whitespace-pre-line">
          {operator.name || 'Vollständiger Betreibername noch nicht hinterlegt'}
          {'\n'}
          {operator.address}
        </p>
        <p>
          Datenschutzanfragen: <a href={'mailto:' + operator.email}>{operator.email}</a>. Weitere
          Angaben im <Link href="/impressum">Impressum</Link>.
        </p>
        <h2>2. Bereitstellung und Serverprotokolle</h2>
        <p>
          Beim Abruf der Website erhält der Hostinganbieter technisch erforderliche
          Verbindungsdaten, insbesondere IP-Adresse, Zeitpunkt, angeforderte URL und
          Browserinformationen. Zweck ist die sichere Bereitstellung und Fehlerbehebung; als
          Rechtsgrundlage kommt Art. 6 Abs. 1 lit. f DSGVO in Betracht (berechtigtes Interesse an
          einem sicheren Webangebot).
        </p>
        <p>
          {operator.hosting ||
            'Noch zu ergänzen: konkreter Hostinganbieter, Empfänger und Unterauftragnehmer, Verarbeitungsorte, Protokoll-Speicherdauer sowie gegebenenfalls Drittlandübermittlungen und deren Garantien. Aus dem Quellcode allein lassen sich diese Betriebsdaten nicht zuverlässig feststellen.'}
        </p>
        <h2>3. Lokale Einstellungen und Finanzdaten</h2>
        <p>
          Darstellung, Watchlists, eingegebene Portfolio- und Planungsdaten werden von den
          entsprechenden Funktionen im lokalen Browserspeicher gehalten. Sie bleiben dort
          grundsätzlich bis zum Löschen über die Anwendung oder die Browsereinstellungen. Das bloße
          Speichern lokaler Datensätze lädt sie nicht automatisch in eine serverseitige
          Kontodatenbank. Bei benutzten Datenabfragen können jedoch Suchbegriffe, Symbole oder
          andere für die jeweilige Funktion erforderliche Parameter an unseren Server gelangen.
        </p>
        <p>
          Technisch erforderliche Speicherung bzw. ausdrücklich angeforderte Funktionen sind nach §
          25 Abs. 2 TDDDG zu beurteilen. Eine pauschale Befreiung sämtlicher optionaler
          Speichervorgänge wird damit nicht behauptet. Eine installierte Offline-Version kann
          Website-Dateien im Browsercache halten.
        </p>
        <h2>4. Marktdaten und externe Inhalte</h2>
        <p>
          Abfragen nach Kursen, Unternehmensdaten und Nachrichten werden je nach Funktion an
          Datenquellen wie Yahoo Finance, Financial Modeling Prep, Nasdaq und weitere konfigurierte
          Anbieter weitergegeben. Bei serverseitigen Abfragen kommuniziert unser Server mit dem
          Anbieter. Direkte externe Bilder, Links und eingebettete Inhalte sind davon zu
          unterscheiden: Beim Laden erhält der jeweilige Anbieter Verbindungsdaten des Browsers.
        </p>
        <p>
          Bestehende Artikel enthalten teilweise Bilder von images.unsplash.com. Der neue
          Wochenrückblick verwendet eine lokal bereitgestellte Illustration und löst dafür keinen
          externen Bildabruf aus. Externe Websites öffnen sich erst beim Betätigen eines Links. Der
          TuneIn-Player wird erst nach der Stationsauswahl geladen; dann gelten zusätzlich die
          Datenschutzinformationen des Anbieters. Hierbei können auch Verarbeitungen außerhalb der
          EU stattfinden. Die konkrete Zulässigkeit und Garantien müssen anhand der eingesetzten
          Anbieter geprüft werden.
        </p>
        <h2>5. Keine automatisch geladenen Werbe- und Analyseskripte</h2>
        <p>
          Weitere direkte Einbindungen sind TradingView-Charts und -Nachrichten sowie
          OpenStreetMap-Karten in den jeweils geöffneten Funktionen. Auch diese Anbieter erhalten
          beim Laden Verbindungsdaten. Ob eine Einwilligung oder andere Schutzmaßnahmen erforderlich
          sind, ist für die tatsächliche Konfiguration noch zu prüfen; die Abschaltung globaler
          Analyseskripte allein ersetzt diese Prüfung nicht.
        </p>
        <p>
          Die bisher global eingebundenen Google-AdSense-, Vercel-Analytics- und
          Speed-Insights-Skripte sind in diesem Stand deaktiviert. Für ihre spätere Reaktivierung
          sind eine separate datenschutzrechtliche Prüfung, gegebenenfalls vorherige Einwilligung,
          Widerrufsmöglichkeit und angepasste Hinweise erforderlich.
        </p>
        <h2>6. Kontaktaufnahme</h2>
        <p>
          Wenn Sie uns eine E-Mail senden, verarbeiten wir Absenderadresse, Inhalt und freiwillige
          Angaben zur Bearbeitung der Anfrage. Rechtsgrundlage ist je nach Anlass Art. 6 Abs. 1 lit.
          b oder lit. f DSGVO. Angaben werden gelöscht, sobald die Anfrage abgeschlossen und weitere
          Speicherung nicht mehr erforderlich ist, sofern keine gesetzlichen Aufbewahrungs- oder
          Nachweispflichten entgegenstehen. E-Mail-Dienstleister und konkrete Aufbewahrungsvorgaben
          sind vom Betreiber noch zu bestätigen.
        </p>
        <h2>7. Ihre Rechte</h2>
        <p>
          Nach Maßgabe der DSGVO haben Sie insbesondere Rechte auf Auskunft, Berichtigung, Löschung,
          Einschränkung und Datenübertragbarkeit (Art. 15–20). Gegen Verarbeitungen auf Grundlage
          berechtigter Interessen können Sie nach Art. 21 Widerspruch einlegen. Eine erteilte
          Einwilligung kann für die Zukunft widerrufen werden. Sie können sich nach Art. 77 bei
          einer zuständigen Datenschutzaufsichtsbehörde beschweren.
        </p>
        <h2>8. Automatisierte Entscheidungen</h2>
        <p>
          Rechenmodelle und KI-gestützte Marktartikel dienen der Information. Sie treffen keine
          Entscheidung über Kreditgewährung, Vertragsabschluss oder vergleichbare Rechtsfolgen für
          Sie. Aus einem errechneten Score folgt keine personalisierte Anlageempfehlung.
        </p>
      </article>
    </Layout>
  );
}
