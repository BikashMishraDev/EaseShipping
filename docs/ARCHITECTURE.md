# Architecture

- **client/**: React + Vite + Tailwind v4. In dev, Vite proxies `/api` to the Express server so session cookies stay same-origin.
- **server/**: Express (ES modules), Mongoose, `express-session` with `connect-mongo`.
- Route files are thin; logic lives in `server/src/services/*`.

## Analysis pipeline (`services/analysis/pipeline.js`)
1. Validate project inputs and list missing fields.
2. Include only user-confirmed document data; surface conflicts.
3. If AI is not configured, stop and save a `blocked` report (no fake output).
4. AI normalizes the product and proposes search keywords.
5. Retrieve tariff lines from USITC (`services/trade-research/usitc.js`).
6. AI selects candidates **only from retrieved lines**; any other code is discarded.
7. Build checklist (static corridor starter list + AI-suggested areas, all marked "verify").
8. Deterministic cost estimate.
9. Save report with stages, sources, findings.

## Landed cost (`services/landed-cost`)
BigInt integer minor units, half-away-from-zero rounding once per line, customs value = transaction value (FOB assumed), freight and insurance excluded from dutiable value, only user-supplied FX rates, ad valorem or "Free" duty rates only. Anything else is reported as missing.

## AI adapter
`services/ai/index.js` talks to any OpenAI-compatible `/chat/completions` endpoint (default Meta Model API, `muse-spark-1.3`). Output is parsed and validated with zod; one retry on invalid JSON.

## Storage
Uploaded files are stored in MongoDB (private, owner-scoped, 5 MB limit) so the app works on serverless hosts without a writable disk.
