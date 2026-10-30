# Security notes

- Social login only. Google: code flow + PKCE (S256) + state + nonce, ID token verified server-side. Meta: code flow + state, server-side token exchange, `debug_token` app check, `appsecret_proof`.
- Accounts are never merged by email; identity = provider + subject (unique index).
- Sessions: server-side, MongoDB store, HttpOnly cookie, regenerated on login, destroyed on logout. Nothing sensitive in localStorage.
- CSRF: per-session synchronizer token (`x-csrf-token`) on every state-changing request.
- All private queries are scoped by `userId`; foreign IDs return 404.
- Input validated with zod; Mongo operator keys stripped; request bodies limited to 100 KB.
- Uploads: extension + MIME + magic-byte checks, size limit, private download route.
- Document text and AI output are treated as untrusted; extracted values need a verbatim supporting quote or are flagged.
- `ALLOW_DEV_LOGIN` is a local-only shortcut and the server refuses to start with it enabled in production.
- Logs never include request bodies, document text or secrets.
