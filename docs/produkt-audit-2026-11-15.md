# Exchange Time: Produktprüfung und Umbauplan

## Nachprüfung – 16. November 2026

Der Umbau verbindet die bestehenden Bereiche, statt sie auf einer einzigen Startseite zu stapeln. Das Verzeichnis unter `/tools` erschließt 27 Arbeitsbereiche über Aufgabe, Suchbegriff, Bereich oder persönliche Favoriten. Neu sind der Vergleich zweier tatsächlich beobachteter Kursreihen, ein Kreditplan mit Sondertilgung und ein Break-even-Rechner für Long-Positionen.

| Frage | Bedienweg und Datengrenze |
|---|---|
| Welches Wertpapier ist gemeint? | In der Suche „Instruments“ wählen oder aus Research nach Namen suchen. Treffer stammen von Yahoo Finance und zeigen Typ und Handelsplatz. Die lokale Werkzeugsuche überträgt keine Suchbegriffe an Yahoo. |
| Wie hat es sich entwickelt? | Aktien führen zur Unternehmensanalyse; Fonds, Indizes, Krypto, Devisen und Futures zum Kursprofil. Tagesbeobachtungen sind einsehbar; Vergleichsreihen verwenden nur gemeinsame UTC-Daten. Kein Dividenden- oder Währungsausgleich. Ein laufender Handelstag ist vorläufig. |
| Welches Unternehmen möchte ich untersuchen? | Anbieterlisten nach gemeldetem Volumen, Bewertungsmultiple oder Lage zum 200-Tage-Durchschnitt eingrenzen. Ein aktives Kriterium schließt fehlende Werte aus; der Filter ist kein Scan aller weltweit notierten Aktien. Forward-P/E ist als Schätzung gekennzeichnet. |
| Kann ich dem Score vertrauen? | Verschuldungsgrad wird bei Yahoo von Prozent in ein Verhältnis umgerechnet. Gesamtkapitalrendite, ROCE und allgemeines Gewinnwachstum werden nicht als ROIC bzw. EPS-Wachstum eingesetzt. Berichtsquelle und Abrufzeit stehen getrennt vom Kurszeitpunkt. |
| Was lädt im Hintergrund? | Nicht ausgewählte Radiosender laden keine Player mehr. Die externe, ungenutzte Icon-Schrift entfällt. Kalender zeigen den Unterschied zwischen einem leeren Terminplan und einem Anbieterausfall. |

**Geprüft:** 52 Seitenaufrufe einschließlich aller 27 Arbeitsbereiche ohne erfassten JavaScript-Seitenfehler. In getrennten Browserprofilen bei 390 und 1440 px: Apple-Namenssuche, SPY-Kursprofil, Zeitraumauswahl, Watchlist, Direktlink nach Neuladen, Auswahl und Trennung eines Radiosenders sowie die Schnellaktionen für Transaktion, Ziel und Journal. Ein echter Screener-Abruf wurde gefiltert, gespeichert und nach Neuladen wieder angewendet. Keine Ersatzkurse für diese Browserprüfungen.

**Offen:** Die Routenprüfung bestätigt keine vollständige fachliche Abnahme. Als Nächstes sollten Insider-Meldungen unbekannte Beträge von belegten Nullbeträgen und Geschenke von Käufen trennen. Danach folgen Referenzfälle für Kapitalmaßnahmen im Portfolio und regionale Steuerannahmen. Die Radioprüfung bestätigt das Laden und Trennen des Players, nicht die Audioverfügbarkeit jedes Senders.

## Ausgangslage
24 Arbeitsbereiche, sechs Hauptbereiche und eine gemeinsame Navigation. Der Einstieg leitet auf das Dashboard. Die stärkste Grundlage sind die getrennt testbaren Rechenkerne für Optionen, Backtests, Portfolio-Risiko und Zinseszins. Sie sollten beim Umbau erhalten bleiben.

## Befunde nach Risiko
1. **Portfolio, hohe Priorität:** In `components/stock-market/portfolio-tracker.tsx` liefert `convertToBase` bei fehlendem FX-Kurs den ursprünglichen Betrag. 100 USD können so numerisch als 100 EUR in Summen eingehen. Historisch wird zuerst ein Kurs am oder *nach* dem Stichtag gesucht. Fehlende Umrechnung explizit als unvollständig behandeln, niemals stillschweigend späteres Wissen verwenden.
2. **Research, hohe Priorität:** In `components/stock-market/stock-analysis.tsx` wird bei fehlendem Vergleichskurs eine Veränderung von null eingesetzt. Ohne Basis lässt sich keine Tagesänderung berechnen. „Nicht verfügbar“ muss sich von einem echten unveränderten Kurs unterscheiden.
3. **Marktübersicht:** Bereits der US-Einstieg fordert Historien für elf Instrumente, VIX und elf Sektor-ETFs an. Der Cache vermeidet Doppelanfragen, reduziert aber nicht den ersten Abruf. Sichtbare Kurse und Regime-Eingaben priorisieren; andere Regionen erst bei Auswahl laden.
4. **Private Daten:** Portfolio, Journal und Finanzpläne hängen am Browserprofil. Vor einer Änderung des Speicherformats braucht es einen vollständigen, versionierten Export und einen Import mit Vorschau und Validierung.
5. **Wartbarkeit:** Portfolio und Research umfassen zusammen über 6.000 Zeilen. Dort sind Datenbeschaffung, Finanzlogik und Darstellung eng gekoppelt. Funktionsbereiche einzeln herauslösen, nicht beide Seiten neu schreiben.

## Funktionsmatrix für die Abnahme
| Bereich | Arbeitsbereiche | Entscheidender End-to-End-Test |
|---|---|---|
| Märkte | Überblick, Handelszeiten, Screener, Sektoren | Region wechseln, Zeitraum ändern, vom Sektor ins richtige Asset springen; Feiertag und unterschiedliche Sommerzeitwechsel prüfen. |
| Portfolio | Portfolio-Dashboard | Kauf und Teilverkauf mit Gebühren und Fremdwährung erfassen, neu laden, Bestände und Rendite gegen eine manuelle Referenz prüfen; FX-Ausfall erzwingen. |
| Research | Asset Research, Makro, Nachrichten | Schnell zwischen zwei Tickern wechseln; verspätete Antworten dürfen das neue Asset nicht überschreiben. Fehlender Vortageskurs, leerer Newsfeed und Quellenausfall müssen unterscheidbar sein. |
| Trading | Chart, Backtest, Optionen, Positionsgröße, Journal | Chartlayout wiederherstellen; Kosten im Backtest variieren; Spread am Verfall gegen Handrechnung prüfen; ungültigen Stop abweisen; Journaleintrag speichern, ändern und exportieren. |
| Finanzen | Budget, Nettovermögen, Ziele, Zinseszins, DCF, Steuern, Währungen | Einkommen bis Sparziel durchspielen und nach Neuladen vergleichen; Nullzins, negative Cashflows, WACC ≤ Terminalwachstum, fehlende Steuerannahmen und veralteten FX-Kurs prüfen. |
| Kalender | Wirtschaft, Gewinne, Dividenden, Feiertage | Ereignis an einer Datumsgrenze in zwei Zeitzonen prüfen; „keine Ereignisse“ von „Quelle nicht erreichbar“ trennen. |
| Websiteweit | Start, Bibliothek und Artikel, Datenschutz, Suche, Watchlist, Einstellungen, mobile Navigation | Direktlink und Zurück-Navigation, Tastaturfokus, gespeicherte Einstellungen, kleines Display und Ende langer Seiten prüfen. |

## Reihenfolge des Umbaus
1. **Verlässlichkeit zuerst:** Gemeinsames Modell für Betrag, Währung, Beobachtungszeit, Vergleichsperiode und Fehlerzustand. Start mit Portfolio-FX und Research-Tagesänderung. Abnahme: definierte Referenzfälle einschließlich fehlender Eingaben bestehen ohne erfundene Werte.
2. **Drei durchgehende Wege gestalten:** „Was bewegt den Markt?“ → Sektor → Asset; „Wie entwickelt sich mein Depot?“ → Benchmark → Risiko; „Was kann ich sparen?“ → Budget → Ziel. Bestehende Spezialwerkzeuge als vertiefende Ansichten erhalten. Abnahme: pro Weg eine konkrete Frage auf Desktop und Handy ohne Anleitung beantworten; Zeit messen, Ziel unter 30 Sekunden.
3. **Vertikal statt global migrieren:** Zuerst Research mit einheitlichem Such-, Lade-, Fehler- und Detailzustand, anschließend Portfolio mit Buchungsmodell und Datensicherung. Danach dieselben Bausteine für Kalender und Finanztools nutzen. Bestehende Direktlinks und gespeicherte Daten als Regressionstests sichern.
4. **Geschwindigkeit und Freigabe messbar machen:** Für jeden Arbeitsbereich Browser-Test mit kontrollierter Datenquelle; zusätzliche echte Provider-Prüfungen separat. Anfragen und Zeit bis zum ersten nutzbaren Kurs vor und nach Änderungen vergleichen. Kritische Wege bei 390 und 1440 px sowie nur mit Tastatur prüfen.

## Aussagekraft

Nachprüfung Datensicherung: In den Einstellungen lassen sich aktuelle Depotbuchungen (mit Basiswährung und Quellensteuersatz), Watchlists, Budget, Nettovermögen und dessen Verlauf, Ziele und Journal als persönliche Sicherung übertragen. Keine Komplettsicherung des Browserprofils: Kurs-Caches, ältere noch nicht migrierte Daten, gespeicherte Screens und Werkzeuglayouts gehören nicht dazu. Der Import ersetzt nur aufgelistete Gruppen und startet die Seite neu. Bei 390 × 844 px in einem separaten Browserprofil geprüft: Vorschau schreibt keine Daten, Bestätigung stellt eine Journalgruppe wieder her. Unbekannte Gruppen, fehlerhafte Datensätze und ein simulierter Speicherplatzfehler sind automatisiert geprüft. Stand nach diesem Schritt: 57 Unit-Tests erfolgreich, Typprüfung erfolgreich.

Browser-Stichprobe: Alle 24 Arbeitsbereiche per Direktlink aufgerufen. 22 erfüllten die einfache Inhaltsprüfung; bei Research und News war die Textlängenschwelle ungeeignet. Separat bestätigt: Research zeigt das Suchfeld und seinen Leerzustand, News den Anbieterlink und ein eingebettetes Fenster. Dessen externe Inhalte wurden nicht bestätigt. Startseite, Bibliothek, Datenschutz und die 21 Artikelpfade lieferten nach etwaigen Weiterleitungen HTTP 200. Ein erfolgreicher Seitenaufruf prüft keine Buchung, keinen Export und keine Berechnung.
51 Unit-Tests in elf Dateien und TypeScript-Prüfung erfolgreich. Lint beendet sich erfolgreich mit 57 Warnungen. Diese Ergebnisse bestätigen weder alle Provider noch die fachliche Richtigkeit jeder Bildschirmzahl. Die Funktionsmatrix ist ein Abnahmeplan, kein Protokoll bestandener End-to-End-Tests.
