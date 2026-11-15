# Exchange Time interface direction

The interface is a research workspace with a restrained financial identity: neutral surfaces, ink-colored controls, and a muted green chart palette. Color communicates market direction alongside signed values and arrows. The chart and numbers take precedence over navigation.

## Research

- [Linear's 2026 interface refresh](https://linear.app/now/behind-the-latest-design-refresh): navigation should recede, actions should occupy predictable positions, and separators should establish relationships without dominating the page.
- [Geist typography](https://vercel.com/geist/typography): a deliberate type scale creates hierarchy in a dense application. Exchange Time uses the bundled Geist family, tabular values, and separate display, label, and metadata scales.
- [Geist colors](https://vercel.com/geist/colors): use semantic surface, interaction, border, and text levels. Light and dark modes share the same semantic structure.
- [Mercury's public product design process](https://mercury.com/blog/designing-in-the-open): evaluate the working product and realistic states rather than idealized static mockups.
- [Apple's material guidance](https://developer.apple.com/design/human-interface-guidelines/materials) and [tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars): navigation floats above content in a distinct material layer, with consistent destinations and legible selection states.

## Implemented structure

- Stable primary navigation for the six product areas; horizontal page navigation exposes the selected area's workspaces. Quick access links cover frequently used tools.
- Global search, command navigation, watchlist, and creation controls remain available across workspaces.
- Region filters reduce the number of market quotes shown at once. Every displayed sparkline uses actual cached observations.
- The main price workspace has selectable one-week, one-month, and three-month windows. The displayed return corresponds to the selected observations; it is distinct from the daily change on quote tiles.
- Market pulse exposes its component observations and scoring methodology. It describes conditions and does not issue trading instructions.
- Sector tiles communicate signed ETF performance. Tile sizes are equal, explicitly not market-cap weights. Each tile links to research and exposes its observation time.
- Shared surfaces, form controls, metrics, charts, empty states, and navigation follow the same visual tokens across existing tools.
- Mobile uses horizontal market exploration, a single-column research workspace, compact market factors, and bottom navigation.
- Dark mode uses actual black for the canvas, sidebar, toolbar, and content surfaces. Controls retain minimal neutral elevation for visibility.
- Mobile navigation is an inset floating capsule with a CSS Liquid Glass-inspired material: backdrop blur and saturation, translucent fill, reflective edges, and an inset selected capsule. The content scrolls underneath it with sufficient end-of-page clearance. Safe-area insets, reduced transparency, increased contrast, and browsers without backdrop blur have explicit fallbacks. Native Apple Liquid Glass rendering is not available as a web API.

## Guardrails

Preserve existing calculations and saved records. Do not add mock prices or synthetic portfolio balances to improve a screenshot. Identify delayed or retained observations. Keep signed change labels and direction arrows, visible keyboard focus, reduced-motion support, and text alternatives for scoring. New components should reuse the semantic tokens in `styles/terminal.css` and the application theme variables.
