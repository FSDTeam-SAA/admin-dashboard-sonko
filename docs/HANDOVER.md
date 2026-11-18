# Admin panel handover

Written by Claude for the developer who takes over the panel. Nothing here
has been run against a real server yet. The tests, type check and build
pass, and the login and home pages were checked in a browser against a fake
server.

## Done (step 1 of the build order)

- Login with phone number and PIN, staff accounts only.
- Session rules: memory-only tokens, refresh once on 401, 15-minute idle
  logout, logout ends the session on the server.
- Page list filtered by permission (`src/lib/nav.ts`), with the server routes
  each page will use.
- PIN re-entry dialog for two-person and money actions
  (`src/components/ConfirmWithPin.tsx`). Not used by a page yet.
- Light, dark and System themes.

## Server changes this needs

On server branch `agent-cash-out` (and merged into `notification-feed`):

- `GET /admin/me`: the logged-in staff member and their permissions.
- Every older admin route now needs a permission (`utils/staffPermissions.js`
  lists them all). Staff with no permissions list are still full admins, so
  nobody loses access.
- Staff access tokens last 15 minutes; a staff session ends 8 hours after
  the PIN was typed, however often it is refreshed.

## Before it goes live

1. Create the Render static site from `render.yaml` and set
   `VITE_API_BASE_URL` to the server's https address.
2. Add the panel's address (for example `https://admin.sunupay.app`) to
   `allowedOrigins` in the server's `server.js`.
3. Remove `https://admin-dashboard-sonko.vercel.app` from `allowedOrigins`
   once the old dashboard is no longer used.
4. Add a second login step for staff (see below). Do not give real staff
   accounts access before this is in.

## Next steps, in order

1. Second login step for staff: an authenticator app code (TOTP) after the
   PIN, set up once per staff member. Needs server work first.
2. Reported requests page, with refund (`POST /admin/payment-requests/:id/refund`).
3. Account holds page: place, ask to lift, approve lift (two people).
4. Refunds and reversals page: request, approve (two people), cancel.
5. Agent payouts page.
6. Rates and fees page: propose, approve (two people).
7. Staff page: role changes (two people).
8. The rest of the agreed panel: customers, tickets, analytics, and so on.
