# Admin panel handover

Written by Claude for the developer who takes over the panel. Nothing here
has been run against a real server yet. The tests, type check and build
pass, and the login and home pages were checked in a browser against a fake
server.

## Done

- Login in two steps, staff accounts only: phone number and PIN, then the
  6-digit code from an authenticator app (Google or Microsoft
  Authenticator). First login shows a QR code to set the app up, then ten
  one-off recovery codes, shown once. A recovery code can be used instead
  of the app code if the phone is lost.
- Session rules: memory-only tokens, refresh once on 401, 15-minute idle
  logout, logout ends the session on the server.
- Page list filtered by permission (`src/lib/nav.ts`), with the server routes
  each page will use.
- PIN re-entry dialog for two-person and money actions
  (`src/components/ConfirmWithPin.tsx`). Not used by a page yet.
- Light, dark and System themes.
- Reported requests page: put the requester on hold, ask for a refund to
  the payer.
- Account holds page: list of held accounts, place a hold (search by phone
  or name), ask to lift, approve a lift (a different person), keep the hold,
  widen to a full hold.
- Refunds and reversals page: approve (not your own request), cancel with
  a reason, and ask to reverse a cash out or cash in by its record ID.
- Agent payouts page: approve (two people; the second approval pays),
  approve several clean payouts at once, hold and release with a reason,
  retry a payment that failed. Payouts with fraud flags can't be batch
  approved and show what was flagged in plain words.
- Rates and fees page: what is in force, the waiting change with before
  and after, approve (a different person), cancel, propose a change, and
  the history. Money is typed in whole units and sent in the smallest unit.
- Staff page: staff list, who has the authenticator set up, make someone
  staff, remove someone, change permissions, reset a lost authenticator.
  Every change except the reset needs two people; nobody changes their own.
- Every money and hold action asks for the staff member's own PIN and sends
  one idempotency key per dialog.

## Server changes this needs

On server branch `agent-cash-out` (and merged into `notification-feed`):

- Staff second login step: `POST /auth/login` gives staff a 5-minute
  `loginTicket` and no tokens; `POST /auth/staff/2fa/setup` and
  `POST /auth/staff/2fa/verify` finish the login. Staff tokens without the
  second step are refused. `POST /admin/users/:userId/2fa/reset` (another
  staff member with `manage_staff` and their PIN) clears a lost app.
- New Render setting on the server: `STAFF_TOTP_KEY`, 64 hex characters
  (`openssl rand -hex 32`). Without it no staff member can log in. Keep it
  only in Render; if it is lost, every staff member must be reset.
- `GET /admin/me`: the logged-in staff member and their permissions.
- Every older admin route now needs a permission (`utils/staffPermissions.js`
  lists them all). Staff with no permissions list are still full admins, so
  nobody loses access.
- Staff access tokens last 15 minutes; a staff session ends 8 hours after
  the PIN was typed, however often it is refreshed.
- `GET /admin/holds` (with `?lift=asked`), names and phones on
  `GET /admin/reversals` (`people`), and `approve_old_reversal` in the
  permissions list. Database test: `test/holdList.test.js` (not run here).
- `GET /admin/staff`, `PUT /admin/users/:userId/permissions` and
  `DELETE /admin/users/:userId/permissions-change`: changing a staff
  member's permissions needs two different staff members. New staff start
  with `view_dashboard` only, never as full admins. Names (`people`) on
  payouts and settings changes. Database test:
  `test/staffPermissionsChange.test.js` (not run here).

## Before it goes live

1. Create the Render static site from `render.yaml` and set
   `VITE_API_BASE_URL` to the server's https address.
2. Add the panel's address (for example `https://admin.sunupay.app`) to
   `allowedOrigins` in the server's `server.js`.
3. Remove `https://admin-dashboard-sonko.vercel.app` from `allowedOrigins`
   once the old dashboard is no longer used.
4. Set `STAFF_TOTP_KEY` on the server, then run
   `node --test test/staffTwoStepFlow.test.js` there.
5. Each staff member logs in once to set up their authenticator app and
   saves their recovery codes. Do this for the owner account first.
6. On the Staff page, give each staff member only the permissions their
   job needs. Keep `manage_staff` to the owner and one trusted deputy.

## Next steps, in order

1. Agents page with cash out and cash in records, linking to "Reverse".
2. The rest of the agreed panel: customers, tickets, analytics, and so on.

## Known gaps

- Anyone who knows a new staff member's PIN before they first log in could
  set up the app in their place. Have each new staff member log in and set
  up the app straight after their account is made.
- Resetting a lost app needs one staff member (with `manage_staff`), not
  two. The server keeps who did it (`staffTotp.resetBy`, `resetAt`); a full
  audit trail of staff actions is still to be built.
- The old dashboard at `admin-dashboard-sonko.vercel.app` stops working
  for staff once this server change is live, because it has no code step.
- With only one staff account there is nobody to reset a lost app. Keep
  the recovery codes safe; failing that, the developer has to clear
  `staffTotp` on that account in the database.
- The reverse form takes a record ID typed by hand until the Agents page
  links to it. The server checks the record, the amount and the people.
- The hold reason and refund note are the only evidence until file uploads
  (contract 7.6) are built.
- With only one staff account, nothing that needs two people can be done,
  including adding the second staff member. The developer must make the
  second staff account directly in the database (role `admin`,
  `permissions` set to what they need, never left empty unless they are
  meant to be a full admin). After that, everything goes through the panel.
