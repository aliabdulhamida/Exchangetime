import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/exchangetime/layout';

export const metadata: Metadata = { title: 'Redaktion & KI · Exchange Time' };

export default function EditorialPolicy() {
  return (
    <Layout>
      <article
        lang="de"
        className="blog-container max-w-3xl mx-auto prose prose-lg dark:prose-invert"
      >
        <h1>Redaktion & KI</h1>
        <h2>Quellen statt erfundener Gewissheit</h2>
        <p>
          Wochenrückblicke enthalten nachvollziehbare Quellen für Zahlen und Aussagen.
          Veröffentlichungszeitpunkt und betrachteter Zeitraum werden getrennt angegeben. Fehlende
          Daten werden nicht durch Schätzungen ersetzt, ohne diese kenntlich zu machen. Die
          Strukturprüfung ersetzt keine sachliche Prüfung der Originalquellen.
        </p>
        <h2>Kennzeichnung</h2>
        <p>
          Die automatischen Wochenrückblicke werden mit KI recherchiert und formuliert; dies wird am
          Artikelanfang offengelegt. Es wird keine menschliche redaktionelle Freigabe behauptet,
          wenn sie nicht tatsächlich stattgefunden hat. KI-generierte Bilder werden als Symbolbilder
          bezeichnet und dokumentieren keine echten Ereignisse.
        </p>
        <h2>Bilder und Rechte</h2>
        <p>
          Neue Artikel nutzen lokal gespeicherte, eigens generierte Illustrationen oder nachweisbar
          nutzbare Bilder mit Herkunfts- und Lizenzangaben. „Im Internet auffindbar“ bedeutet nicht
          frei verwendbar. Bei Korrekturen bleiben Bildnachweise und Quellenangaben nachvollziehbar.
        </p>
        <h2>Finanzinformationen und Interessen</h2>
        <p>
          Marktrückblicke sind keine auf persönliche Umstände abgestimmte Beratung. Sollten konkrete
          Anlageempfehlungen, Vergütungen, Sponsoring oder relevante Interessenkonflikte vorliegen,
          müssen diese gesondert geprüft und am betroffenen Inhalt transparent angegeben werden. Ein
          allgemeiner Haftungshinweis ersetzt diese Pflichten nicht.
        </p>
        <h2>Korrekturen</h2>
        <p>
          Fehlerhinweise können über den Kontakt im <Link href="/impressum">Impressum</Link>{' '}
          gemeldet werden. Wesentliche inhaltliche Korrekturen müssen mit Datum am Artikel kenntlich
          gemacht werden; bereits veröffentlichte Wochenrückblicke werden nicht stillschweigend
          überschrieben.
        </p>
      </article>
    </Layout>
  );
}
