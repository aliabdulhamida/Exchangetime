# SEO and monetization implementation

## Audit
- Next.js 15 App Router, TypeScript, React, Tailwind and shared terminal/product/tool CSS.
- Dashboard metadata renders on the server; most tool data loads after hydration.
- The old shared Suspense boundary enclosed content behind query-dependent navigation. Navigation now has isolated boundaries so static asset content remains prerenderable.
- Existing timeframe controls and local watchlists should be reused, not replaced.
- Google AdSense is disabled, as documented in the current privacy policy. No revenue improvement can be attributed to disabled ads.
- The public robots file already allows crawling except API routes. It now advertises the sitemap.

## Phase 1: implemented structure
- `lib/seo-assets.ts`: curated public asset catalogue, canonical origin and safe JSON-LD serialization.
- `lib/asset-snapshot.ts`: typed, testable price/history parsing. No generated quotes, inferred 52-week extrema or unsupported movement explanations.
- `lib/server/seo-asset-data.ts`: bounded server-side provider requests and five-minute shared cache; failures are not stored as successful snapshots.
- `app/dashboard/[asset-slug]/page.tsx`: six generated routes, unique metadata/canonical/OpenGraph, server-rendered educational content and reported data, visible FAQ matching JSON-LD, breadcrumbs, related links and explicit unavailable states.
- `components/exchangetime/asset-history.tsx`: lazy chart using existing shared chart, daily-history timeframe toggles, existing watchlist entry point.
- `components/exchangetime/asset-discovery.tsx`: crawlable links from the main dashboard and related asset pages.
- `app/sitemap.ts`: main dashboard, library, all supported asset routes and published weekly reviews. No fake last-modified dates for assets. Other historic article routes can be consolidated after canonical/duplicate-language review.
- Existing query-based workspaces remain functional; personal/tool states are not separate search landing pages. Clean asset routes have their own canonical URLs.

## Phase 2: prepared advertising components (disabled)
Implemented files: `components/advertising/ad-slot.tsx`, `components/advertising/adsense-loader.ts`, `lib/advertising-config.ts`.

Required before enabling: actual publisher/slot IDs, Google-certified CMP configuration where required, withdrawal controls, privacy disclosure update and verification of the exact AdSense account settings. Do not invent IDs or load third-party ad scripts before the applicable consent requirements are satisfied.

Publisher confirmed by the operator: `ca-pub-8377777238288489`. The operator identifies the CMP as Google Privacy & messaging, active in their AdSense account, and currently uses Auto Ads only. The account settings have not been independently verified. Manual slot IDs and the actual CMP signal integration are still required before live activation.

### Configuration and preview
`NEXT_PUBLIC_ADS_ENABLED` defaults to off. The placeholder `1234567890` is deliberately rejected by the request gate, even if the flag is accidentally enabled. Missing consent also blocks all SDK/ad requests. No publisher script or preconnect is globally installed.

For local visual preview, start the dev server with `NEXT_PUBLIC_ADS_PREVIEW=true pnpm dev`. Preview mode is disabled in production and never loads the SDK, even when the live flag is enabled. With both flags off, components return nothing, so there are no unused advertising gaps on the public site.

Future build-time environment settings:
```
NEXT_PUBLIC_ADS_ENABLED=false
NEXT_PUBLIC_ADS_SLOT_OVERVIEW=1234567890
NEXT_PUBLIC_ADS_SLOT_ASSET_CONTENT=1234567890
```
Replace both slot values with real IDs from manual responsive display units. These are **not** live IDs. Rebuild/redeploy after changing public environment settings. No ads run merely by copying this example.

The components are wired below the overview heading and between the asset chart and educational context. Both reserve responsive height before consent/initialization when enabled. The `consentGranted` prop defaults to false and is intentionally not granted by any current caller. A verified client-side CMP adapter must provide this value; do not change it to a constant `true` or infer consent from the fact that a CMP exists in the account. Advertising remains disabled until that adapter and privacy/withdrawal controls are implemented and checked.

The loader runs only after a slot passes its gates and is at least 50% visible. It is shared between slots; each mounted slot submits at most one request. An unavailable IntersectionObserver fails closed. Errors/no-fill do not collapse the reserved space, and there is no timed ad refresh. An enabled slot is not proof of a viewable impression; Google measures that separately.

Before enabling manual units, review the Auto Ads settings in the account. Loading the SDK can also trigger account-enabled Auto Ads. Do not enable both blindly: exclusions, anchor ads and overall ad density must be checked on the actual site.

Reserve responsive slot dimensions in server-rendered markup; clearly label advertisements and separate them from tool controls. Load below-fold slots through IntersectionObserver, at most once per mounted slot; do not simulate ad clicks or periodically refresh ads. Start with one desktop sidebar/heading placement and one content placement between chart and educational context, then evaluate actual mobile content depth. Do not place ads in the mobile Tools launcher, keypad, or alongside destructive/transaction actions.

Use official responsive-ad sizing guidance. Min-height alone does not guarantee zero CLS, and clipping an ad is not an acceptable fix for overflow. Keep placeholders stable after no-fill; test all supported breakpoints. Never promise a particular RPM or Active View percentage.

## Phase 3: measurement and expansion
- Verify production raw HTML and Googlebot rendering, Search Console URL inspection, sitemap coverage and canonical selection.
- Track real-user LCP/INP/CLS with applicable consent. Use Search Console impressions/clicks and AdSense RPM, Active View and revenue per session as baselines.
- Compare a placement change against a control period; do not optimize a single slot while ignoring total revenue or usability.
- Add new asset pages only with distinct, useful context and confirmed provider support; no unbounded ticker routes or mass-generated filler.
- A true 1D toggle requires intraday observations; do not relabel daily bars as intraday data.
- FAQ JSON-LD describes visible content but no longer produces Google FAQ rich results. It is not a ranking guarantee.

## Primary references (reviewed 2026-11-18)
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/updates
- https://support.google.com/adsense/answer/13554116
- https://support.google.com/adsense/answer/6219980
- https://support.google.com/adsense/answer/9183363

No claim of improved ranking, RPM, production indexing, consent compliance or site-wide zero CLS is implied by local tests.

## Verification
- Production compilation passed using the repository's existing Node preload: `node --require ./scripts/patch-stdio.js node_modules/next/dist/bin/next build`. The plain CLI encountered the pre-existing undefined-write issue covered by that preload.
- Build output confirms all six asset routes are SSG with 300-second revalidation, the main dashboard is dynamically server-rendered, and the sitemap is static with hourly revalidation.
- `scripts/check-public-assets.mjs` verifies all six pages with JavaScript disabled, canonical URLs, visible FAQ/JSON-LD agreement, related links, unknown-route 404, sitemap/robots, and interactive layouts at 390/1440px.
- Existing mobile navigation, calendar navigation/timeout and screener storage/filter tests passed against the local production server.
- 193 unit tests, type checking and strict lint passed. Actual deployed Google indexing and ad metrics still require post-deployment measurement.
- Advertising preparation adds four tests (197 total) for disabled slots, placeholder rejection, consent gating and inert previews. `CHECK_AD_PREVIEW=1 node scripts/check-ad-placeholders.mjs` verifies the 390/1440px preview dimensions and zero advertising requests; running the script without that variable checks the default disabled state. No live AdSense impression, revenue or CMP integration is claimed by these tests.
