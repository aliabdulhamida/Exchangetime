# German publication readiness — 16 November 2026

This is a technical implementation and issue list, not a legal compliance certification. Operator identity, business model and deployment contracts cannot be determined from source code. Obtain professional review before public launch.

## Implemented

- Dedicated `/impressum`, `/redaktion` and revised `/settings/privacy-policy`; accessible legal footer on terminal layouts and sidebar imprint link. Legal pages visibly disclose missing setup rather than passing placeholders off as a compliant imprint.
- Central server-side operator settings in `lib/site-operator.ts`, documented in `.env.example`. Existing published contact address and email were retained, not inferred from the developer's account. They still need confirmation. No personal operator name or responsible editor has been invented.
- Removed automatic global AdSense, Vercel Analytics and Speed Insights. This does not certify that all third-party processing elsewhere is compliant. Existing article images can still contact Unsplash, and users can load TuneIn; hosting and data-source operations require assessment.
- Weekly articles identify AI assistance, use a local image with explicit AI/symbolic credit and per-article provenance. Publication checks verify structure/references, not truth or copyright clearance.

## Must be completed before publication

The operator has explicitly confirmed the publication name Ali Abdul Hamid Hassan and the contact email info@exchangetime.de. Editorial responsibility has not yet been separately confirmed. A Vercel settings screenshot shows Washington, D.C., United States (iad1) selected for Functions, and the operator explicitly chose to retain this region for a US audience. The English privacy disclosure records this configuration, possible US processing and global CDN delivery without claiming that all processing takes place in one location. Log retention and applicable international transfer safeguards remain unconfirmed.

The operator confirmed the public address as Frieda-Seidlitz-Straße 6, 13086 Berlin, Germany and named GitHub/Vercel as hosting/deployment services. Processing locations beyond the selected function region, log retention and transfer safeguards remain unconfirmed. The project is described as a personal project but has used AdSense; this must not be interpreted as a blanket exemption from provider-information or privacy obligations. Do not publish the revenue amount as legal-notice content. The responsible editor remains unconfirmed.

1. Actual operator legal name, address, email; legal form, representative, registry, VAT identification and professional/regulatory details where applicable. DDG applicability depends on service and operation; non-private media may also be covered by MStV. Never add a private tax number.
2. Real qualified responsible editor with name/address for the regular journalistic Research Library. An AI cannot be named as this person.
3. Hosting provider, processing locations, processors/subprocessors, retention, legal bases and transfer safeguards; confirm the existing address/email. Check Art. 28 processing agreements as applicable. The privacy page remains a visibly incomplete draft until operations are confirmed.
4. Audit third-party images, TradingView embeds, OpenStreetMap maps, TuneIn and all browser storage for necessity/consent requirements. Do not reactivate advertising/analytics without appropriate prior consent and withdrawal controls where required. A decorative cookie banner is not sufficient.
5. Evaluate consumer dispute-resolution disclosure under section 36 VSBG based on actual business circumstances. Do not assert participation/non-participation without confirmation.
6. Assess concrete financial recommendations and conflicts under capital-markets rules; a disclaimer does not override substantive obligations. Review copyright, journalistic due diligence, AI transparency and correction processes.
7. Assess accessibility duties if the eventual business offers covered consumer services; present free editorial content alone does not establish the scope of BFSG obligations.

## Primary sources reviewed

- DDG section 5: https://www.gesetze-im-internet.de/ddg/__5.html
- MStV section 18: https://www.gesetze-bayern.de/Content/Document/MStV-18
- Journalistic due diligence: https://www.die-medienanstalten.de/journalistische-sorgfalt/
- TDDDG section 25: https://www.gesetze-im-internet.de/ttdsg/__25.html
- GDPR information duties: https://www.datenschutz.sachsen.de/informationspflichten.html
- VSBG section 36: https://www.gesetze-im-internet.de/vsbg/__36.html
- EU Commission AI transparency guidance: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
- ESMA/BaFin financial-content guidance: https://www.esma.europa.eu/sites/default/files/2026-01/DE_Germany_de_-_Finfluencers_factsheet.pdf
