# Automatic weekly reviews

The Codex project automation runs on Saturdays at 09:00 Europe/Berlin. It researches the latest completed Monday–Friday trading week and publishes one English-language JSON article at `content/weekly-reviews/YYYY-MM-DD.json`, using the Friday date as its unique identifier. The repository is the permanent archive. A deployment following the content commit makes the article available under `/blog/weekly/YYYY-MM-DD` and in the Research Library search, month and topic filters.

This is a **local Codex automation**, not a cloud scheduler: the computer and Codex must be available for scheduled execution. Successful publication also requires browser/network access, GitHub push permission, and a working production deployment. A missed run is not a guarantee of automatic catch-up. No external AI key is required for this implementation.

## Editorial contract

Always write every weekly review in English, regardless of the user's or browser's language. Set `language` to `en`. This applies to the title, summary, headings, body, image alt text and credit, and source descriptions. Preserve source URLs, figures and dates. The schema enforces the language declaration; editorial review must verify the actual prose.

Use `weeklyReviewSchema` in `lib/weekly-review.ts` as the authoritative format. Never populate production with examples or simulated prices. The schema checks dates, references and shape, not whether an external source is factually correct; the researcher must verify every claim by opening its source.

- `version`: 1; `weekStarting`: Monday; `weekEnding`: Friday; `publishedAt`: actual ISO UTC time after Friday has completed.
- `title`, `summary`, and `sourceIds` for the summary.
- `cover`: `{src, alt, credit}`. Create a relevant editorial illustration for each week or obtain a verifiably licensed free-to-use image. Store it locally under `public/images/weekly/`; `src` is its `/images/weekly/...` URL. Explicitly identify AI illustrations as symbolic, not documentary, in `credit`. For licensed photos include creator, license and original URL in the credit; keep supporting evidence in the article's sources. Never reuse a placeholder. Preserve generated provenance metadata when available.
- `markets`: at least three indices with `name`, `symbol`, `previousClose`, `previousDate`, `close`, `closeDate`, `sourceId`. Prefer S&P 500, Nasdaq Composite, DAX and Euro Stoxx 50. Use the prior week's last trading close and this week's last trading close, with actual dates; never confuse daily changes with weekly returns. No currency conversion or total-return claims.
- `sections`: at least three entries `{heading, paragraphs: [{text, sourceIds}]}`. Cover the week's drivers, material company/macro developments and the confirmed upcoming economic calendar. Distinguish sourced explanations from interpretation; no unsupported causal claims or recommendations.
- `sources`: at least three unique entries `{id, title, url, accessedAt}`. Use direct HTTPS article/data URLs, preferably exchange, issuer, central-bank or statistical-agency publications. Access timestamps must precede publication.

Only publish with adequate verified data. Omit unavailable secondary markets with an explicit coverage note, but stop entirely if fewer than three indices or material claims cannot be verified. An outage is not an empty or fabricated article. Existing Friday files make a run idempotent: do not overwrite without an explicit correction request.

## Publication checks

Run `pnpm test:unit`, `pnpm typecheck`, `pnpm lint:strict` and `pnpm build`. The archive test loads and validates every actual article and checks its filename. Stage and commit **only** the new weekly JSON and its cover image, never unrelated workspace changes. Push normally to the existing branch; no force pushes, resets, automatic rebases, or secret/configuration changes. If the branch is not main, the worktree is conflicted, checks fail, publication permission is absent, or a push fails, report the issue without claiming publication. A successful push is not itself proof that a deployment succeeded.
