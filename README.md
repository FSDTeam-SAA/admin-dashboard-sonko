# Sunu Pay Admin Panel

The staff panel for Sunu Pay. React + TypeScript, built with Vite. It talks
only to the Sunu Pay server (`sunu-pay-mobile-app-backend`).

## Run it

```
npm ci
cp .env.example .env    # set VITE_API_BASE_URL to the server address
npm run dev             # http://localhost:5173
npm test
npm run build           # needs an https VITE_API_BASE_URL
```

`.npmrc` sets `legacy-peer-deps=true` because npm 10 fails to resolve
vitest 4's optional peers without it. It affects test tools only.

## How it keeps staff logins safe

- Tokens are kept in memory only, never in localStorage, sessionStorage or
  cookies. Reloading or closing the tab logs the staff member out.
- 15 minutes without a click or key press logs them out.
- The server ends staff sessions after 8 hours (15-minute access tokens).
- Only accounts with the `admin` role get in; others are turned away and
  their tokens dropped.
- Two-step login: PIN, then a code from an authenticator app. The QR code
  is made in the browser, so the secret goes nowhere else.
- Every page is shown only with its permission, from `GET /admin/me`. The
  server checks the permission again on every call.
- Money, hold and settings actions send an `Idempotency-Key` and ask for the
  staff member's own PIN again (`src/components/ConfirmWithPin.tsx`).
- A real build carries a Content-Security-Policy (no outside or inline
  scripts) and `render.yaml` sends no-framing and HTTPS headers.

See `docs/HANDOVER.md` for what is done and what is next.
