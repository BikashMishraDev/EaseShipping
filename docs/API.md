# API (all under /api/v1; JSON; state-changing requests need `x-csrf-token` from GET /auth/me)

Public: `GET /health`, `GET /system/status`, `GET /auth/me`, `GET /auth/google[/callback]`, `GET /auth/meta[/callback]`, `POST /auth/logout`, `POST /auth/dev-login` (local only)

Private:
- `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `POST /projects/:id/archive`
- `GET/PUT /projects/:id/cost`
- `GET/POST /projects/:id/documents`; `GET/DELETE /documents/:docId`; `GET /documents/:docId/download`; `POST /documents/:docId/extract`; `PUT /documents/:docId/review`; `POST /documents/:docId/apply`
- `POST /projects/:id/reports/analysis`; `GET /projects/:id/reports`; `GET /reports/:reportId`; `PATCH /reports/:reportId/classifications/:index`; `GET /reports/:reportId/pdf`
- `GET /projects/:id/checklist`; `PATCH /checklist/:itemId`
- `GET /dashboard`; `PATCH/DELETE /account`
