# EaseShipping tasks

## Done in this build (code written; see README for what has and has not been run)
- [x] Phase 1 foundation: monorepo, Express app, Mongo connection, health endpoint, responsive shell
- [x] Phase 2: Google + Meta login, MongoDB sessions, CSRF, project CRUD, real dashboard
- [x] Phase 3: secure upload, text extraction, AI structured extraction with quote verification, review/confirm, conflicts
- [x] Phase 4: USITC retrieval, candidate HTS classification (restricted to retrieved codes), checklist
- [x] Phase 5: deterministic landed-cost engine, saved reports, print view, PDF export
- [x] Phase 6 (partial): unit tests for pure logic, integration tests (need MongoDB), docs

## Next
- [ ] Run `npm run install:all` and `npm test`, then run integration tests with MONGODB_URI_TEST
- [ ] Confirm the USITC response shape on first live call (adapter in server/src/services/trade-research/usitc.js)
- [ ] Confirm Meta Model API access for your region and that `AI_MODEL` is valid
- [ ] Add a Vercel setup (client static build + API as serverless function) when you are ready
- [ ] Add more corridors under server/src/services/analysis/checklist-base.js
- [ ] Optional: OCR integration for scanned PDFs and images
