# Exchangetime

Kurzüberblick

- Next.js (App Router), React 19, TypeScript, Tailwind CSS
- Empfohlene Node-Version: 20 (siehe .nvmrc / .node-version)
- Paketmanager: pnpm

## Voraussetzungen

- Node 20 LTS (empfohlen). Alternativ Node 22 mit aktivem Webpack-Workaround in `next.config.mjs`.
- pnpm installiert.

## Schnellstart

```zsh
pnpm install
pnpm dev
```

Lokal: http://localhost:3000

## Produktionsbuild

```zsh
pnpm build
pnpm start
```

Hinweis zu Node 22: Der Build ist mit dem konfigurierten Workaround stabil. Besser ist Node 20 – dann kann der Workaround aus `next.config.mjs` (webpack-Sektion) entfernt werden.

## Ordnerstruktur (Auszug)

- `app/` – App Router Seiten, Layouts und API-Routen (`app/api/*`).
- `components/` – UI-Komponenten (inkl. `components/views/ViewCounter.tsx`).
- `data/` – z. B. `views.json`.
- `styles/` – globale Styles, von `app/globals.css` importiert.
- `public/` – statische Assets (inkl. `ads.txt`).

## Views API (app/api/views)

- GET `/api/views?slug=foo` → `{ slug, views }`; ohne `slug` → gesamte Map.
- HEAD `/api/views?slug=foo` → Header `X-Views`.
- POST `/api/views` → Body `{ slug: string }`, inkrementiert flüchtig im Speicher.

Alle Antworten mit `Cache-Control: no-store`.

## Entwicklungshinweise

- CSS ist zentral in `app/globals.css` eingebunden; Blog-Seiten importieren keine CSS-Dateien direkt.
- Pages Router wurde entfernt/neutralisiert – bitte den App Router verwenden (`app/`).

## Troubleshooting

- Webpack/WasmHash-Fehler unter Node 22: Bereits mitigiert via `next.config.mjs` (hashFunction=sha256, realContentHash=false, wasm aus). Wechsel auf Node 20 empfohlen, dann die `webpack`-Sektion dort entfernen.
