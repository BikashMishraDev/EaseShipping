# EaseShipping

Global shipping. Made simpler. AI-assisted export research for small exporters (India to United States in v1).
Research assistance only. Not a carrier, customs authority or legal advice.

## Run locally
```bash
npm install                  # root (concurrently)
npm run install:all          # server + client
cp .env.example server/.env  # then fill in MONGODB_URI and the keys you have
npm run dev                  # API on :5000, web on :5173
```
No Google/Meta keys yet? Set `ALLOW_DEV_LOGIN=true` in `server/.env` and use "Continue as demo user" on the login page.
No `MODEL_API_KEY`? The app still runs; analysis is reported as unavailable (no fake results).

### Google and Meta redirect URIs (local)
- Google: `http://localhost:5173/api/v1/auth/google/callback`
- Meta: `http://localhost:5173/api/v1/auth/meta/callback` (app in Development mode; add yourself as a tester)

### Meta Model API
Sign up at dev.meta.ai, create a key, set `MODEL_API_KEY`. Default model is `muse-spark-1.3`; change `AI_MODEL` (e.g. `muse-spark-1.1`) if your account uses another name. Public-preview access was announced for US developers first, so check availability for your account.

## Tests
```bash
npm test                                   # unit tests (no database needed); API tests are skipped
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/easeshipping_test npm test   # includes API/integration tests
```

## Features

|---|---|---|---|
| 1 | Create and manage a project | `routes/projects.js`, `NewProject.jsx`, `Overview.jsx` | Code written; API test written, not run |
| 2 | Product and shipment details | `ProjectForm.jsx`, zod schema in `projects.js` | Syntax checked; not run |
| 3 | Upload and review extracted data | `routes/documents.js`, `services/documents/*`, `Documents.jsx` | Upload validation and quote/conflict logic unit-tested and passing; extraction needs AI key |
| 4 | Real AI analysis | `services/analysis/pipeline.js`, `services/ai/index.js` | Not run. Needs `MODEL_API_KEY` and Meta API access |
| 5 | Classifications with evidence | `services/classification`, `trade-research/usitc.js` | Not run. USITC response shape unconfirmed |
| 6 | Transparent cost estimate | `services/landed-cost/*` | 11 unit tests passing |
| 7 | Compliance checklist | `routes/checklist.js`, `Checklist.jsx` | API test written, not run |
| 8 | Save and reopen reports | `routes/reports.js`, `ReportView.jsx`, `reporting/pdf.js` | Not run |

## Known limits
- Dependencies were not installed and the app was never started where it was built (no network), so expect to fix small runtime issues on first run.
- Checklist items are a starter list and AI suggestions, all marked "needs professional verification". Nothing is shown as confirmed unless a live source supports it.
- Additional US tariffs, MPF/HMF, FX rates and agency rules (FDA, USDA, CPSC) are not fetched; the cost page lets you enter them with a source.
- Scanned PDFs and images are rejected (no OCR).
