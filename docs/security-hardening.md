# Security hardening

## Implemented in the application

- Removed the server PDF-rendering route, its share-menu button, browser fallback and unused PDF/Chromium dependencies. `/api/pdf` returns 410 before application work.
- Updated Next.js and its ESLint configuration to 15.5.29 and React/React DOM to 19.1.10; lockfile tracks the installed tree.
- Global anti-framing, MIME-sniffing, referrer, permissions and minimal CSP protections. CSP restricts base URLs, plugin objects and frame ancestors; it is deliberately not a complete script-source/XSS policy, to preserve existing charts and radio integrations. Vercel supplies HTTPS transport protection in production.
- API middleware limits methods, rejects declared bodies over 64 KiB and cross-origin POSTs, and returns 429 above 120 API requests per minute. Declared content length is not a complete streaming-body limit. Public article/image/crawler requests are not rate-limited by this rule.
- Known unused WordPress and secret-file probe paths return 404. This reduces unwanted application work; it does not stop distributed attacks.
- Optional Upstash REST Redis counter provides atomic limits across instances. Set both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` on Vercel and redeploy. Once configured, counter failure returns 503 rather than silently bypassing limits. Keys contain a SHA-256 hash of the Vercel-provided IP and expire after 60 seconds. Hashed IPs remain pseudonymous data, not anonymous data; add the chosen provider and processing terms to privacy disclosures before enabling.
- Without shared storage, the bounded in-memory fallback is **per-instance only**, may reset on restarts and is not reliable distributed rate limiting. Local development uses a shared local bucket and does not trust spoofable client IP headers. IP-based limits can affect visitors sharing a network and should be monitored.

## Account actions still required

The production dependency audit after these updates reports zero high/critical findings and two moderate findings in the CSS build-tool chain (glob/minimatch). They are not silently suppressed. A full dev-tool dependency upgrade remains separate work; moving the browser-test runner into devDependencies removes it from the runtime manifest but does not repair all of its transitive advisories. Audit results are time-dependent and do not prove absence of vulnerabilities.

1. Enable passkeys or 2FA on GitHub and Vercel. Review collaborators, integrations, deploy tokens, recovery methods and active sessions. Revoke unused credentials; rotate secrets if compromise is suspected. No account credentials were changed by this patch.
2. Vercel project → Firewall → Configure: add a rate-limit rule for `/api/` using the IP key. Start by logging the effect, then enforce 429 after checking normal dashboard traffic. The application's initial threshold is 120/minute, not a universally safe recommendation. Account limits and pricing must be reviewed before publishing a rule.
3. Keep public article/robots/image paths accessible to legitimate search/AI crawlers. Avoid a site-wide challenge or unverified user-agent allowlist. Use targeted WAF protection for API abuse; inspect false positives.
4. Protect preview deployments with Vercel Authentication where available, not the public production site. Enable usage/cost alerts and review abnormal requests.
5. Deploy and smoke-test chart, search, radio, article and portfolio flows. Security headers and middleware are not active on the public site until deployment. This work is not proof of compromise or a full penetration test.

References: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting and https://vercel.com/docs/headers/request-headers
