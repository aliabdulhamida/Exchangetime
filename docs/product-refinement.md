# Product refinement and regression checks

## Shared UI

- `styles/product.css` owns the shell, navigation, market overview and global tokens.
- `styles/tools.css` owns reusable tool surfaces, forms, results and responsive tool styling. It loads after product.css, preserving the original cascade.
- `ToolSegmented` provides one accessible selection primitive for tax inputs and preferences. Use named groups and `aria-pressed` rather than styling-only active states.
- `DataFreshness` displays the full observation date and time. Source, frequency and delay details are expandable. Stale and estimated states remain visible.

## Portfolio data failures

Missing historical FX must not produce invented converted totals. The recovery view instead retains holdings in units and transactions in their original currencies. Records can be edited, deleted with confirmation, or exported as CSV without a successful provider response. The normal view exposes the same record manager under “Manage all transactions”. CSV string fields are guarded against spreadsheet-formula interpretation.

No unavailable current prices are substituted with zero in the displayed summary metrics. Return and drawdown summary values are withheld while current price coverage is incomplete.

## Number entry

The custom keypad is reserved for coarse-pointer devices. Desktop users retain normal keyboard input. The first digit replaces the existing value; subsequent digits append. Done and Next validate the draft against required/min/max constraints. Next commits before focusing the next visible numeric input in the same form. Cancel discards explicitly. Outside clicks cannot silently discard a changed draft.

The content scroll area reserves space while the keypad is open. Actual iOS software-keyboard suppression still requires a real-device check; headless Chromium is not an iPhone simulator.

## Research and data

Asset research puts price history before detailed metrics. Asset actions and score methodology are expandable. The screener explicitly identifies its loaded-list universe; it is not a whole-market fundamental database.

Market-series caching and in-flight request deduplication are retained. Visible pages revalidate after the cache lifetime, including when returning to a tab. Provider failures retain cached values with a stale warning, not synthetic replacements.

## Validation

Start the development server, then run:

```sh
pnpm typecheck
pnpm lint:strict
pnpm test:unit
pnpm test:browser
```

Set `CHECK_BASE_URL` to test a different local server. Browser checks use isolated browser profiles, not the user's saved portfolio. The recovery check deliberately aborts API requests and seeds an explicitly test-only transaction in that isolated profile.

Coverage includes touch/desktop number entry, unsaved-draft protection, missing-FX record editing, compact tools navigation, library/radio discovery, English legal routes, light/dark shell geometry and all 28 dashboard tool layouts on mobile and desktop. Layout checks do not certify every provider's data or every possible trading strategy. Keep independent calculation tests and real-device Safari checks.

Do not edit application source while browser checks run: development hot reload can invalidate the very navigation state being tested.
