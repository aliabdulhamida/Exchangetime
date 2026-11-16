# Exchange Time product design

The product layer in `styles/product.css` follows the supplied editorial mobile references: warm neutral canvas, spacious rounded surfaces, large financial figures and restrained botanical-green accents. It is loaded after the structural styles in `styles/terminal.css`; layout mechanics remain separate from the shared visual tokens.

- Light mode uses an off-white canvas and near-white surfaces. Dark mode uses a true-black canvas and achromatic grey surfaces, controls, borders and selections; green is reserved for meaningful positive financial states rather than a tint across the interface.
- Green and coral indicate financial direction only alongside arrows, signed figures or text. The mint chart stroke is a brand colour, not an assertion of positive performance.
- Main values receive the strongest type emphasis; units, observation dates, sources and delayed/stale states remain visible. Do not replace missing financial data with decorative/sample figures.
- Mobile navigation is a full-width dark bottom section in the normal flex layout, not a floating pill or an overlay. The content frame above it has rounded lower corners. Only the active item has a small light pill and visible label. Main content ends above navigation, including on safe-area devices. Other icons retain accessible text labels. No notification badges are added without real notifications.
- Global search is a circular utility button on mobile, not another navigation row. Workspace titles open a searchable, scoped two-column tool picker. Optional title swiping and keyboard arrows remain functional without a permanent instruction block or pagination controls.
- Shared panel, form, chart, article and navigation styles use the same tokens. New page-specific visuals should extend these primitives rather than introduce unrelated palettes or gradients.
- `components/exchangetime/tool-ui.tsx` supplies shared tool surfaces, explanatory empty states and the accessible seven-day calendar strip. Earnings and dividends reuse one date-selection implementation; portfolio onboarding and summaries reuse the surface/empty-state primitives. No sample balance or return is inserted to fill an empty portfolio.
- Legacy shadcn controls use the same HSL background, surface, input, border and focus tokens as the product palette. Popovers and dialogs must not silently revert to the previous blue-grey theme.

Validation: `scripts/check-product-design.mjs`, `scripts/check-workspace-title.mjs`, `scripts/check-mobile-navigation.mjs` and unit tests. Browser tests use real observed market data, not mocked prices. Public API failures must remain distinguishable from empty data.
