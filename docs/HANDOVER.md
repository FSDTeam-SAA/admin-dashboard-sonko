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
- Rates and fees page (senior staff only, `manage_rates`), two parts:
  - Exchange rates and the wallet transfer fee: shown as staff think of
    them ("1 GBP = 83.33 GMD", "1 GMD = 23.5 NGN"); propose with a worked
    example ("100 GBP becomes 8,000 GMD"); approve (a different person);
    cancel; history. The euro follows the CFA franc peg and is not set.
  - Agent cash out: what is in force, the waiting change with before and
    after, approve, cancel, propose, history. Money is typed in whole units
    and sent in the smallest unit.
- Staff page: staff list, who has the authenticator set up, make someone
  staff, remove someone, change permissions, reset a lost authenticator.
  Every change except the reset needs two people; nobody changes their own.
- Agents page: applications and working agents (filter, search), and one
  agent's details: ID number masked, ID check, hold, balance, last 7 days,
  recent cash outs and cash ins with a Reverse button, daily pay and weekly
  payouts. Approve or turn down an application (the reason is shown to the
  applicant). Put an agent on hold.
- Every money and hold action asks for the staff member's own PIN and sends
  one idempotency key per dialog.
- Blocking a phone (19 Nov): the customer file lists "Phones used" (masked)
  with "Block this phone". It posts `type: "device"` with the customer and the
  phone's keyed hash to `POST /admin/blocklist`; same 72-hour confirm and
  two-person removal as other entries. Phone IDs can't be typed or looked up.

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
- Exchange rates and the wallet transfer fee are settings now
  (`/admin/settings/rates`, model `RateSettings`), two people to change, at
  most 25% per change. The money sums read an in-memory copy refreshed on
  approval and every minute; until loaded at start, money actions answer
  "Rates are loading". `WALLET_TRANSFER_FEE_PERCENT` is only the starting
  fee. One permission, `manage_rates`, now covers every rate and fee page
  (it replaced `view_settings`, `propose_settings`, `approve_settings`).
  Database test: `test/rateSettingsFlow.test.js` (not run here).
- `GET /admin/agents` and `GET /admin/agents/:id` (new permission
  `view_agents`). Agent applications can only be decided while waiting, and
  turning one down needs a reason. Database test: `test/agentAdmin.test.js`
  (not run here).
- Customers, tickets and analytics (19 Nov). `GET /admin/customers` and
  `/admin/customers/:id` (`view_customers`): opening a file saves who opened
  it (`CustomerFileView`, never edited). The ID number is never sent. Tickets
  (`SupportTicket`): `GET/POST /admin/tickets`, `GET /admin/tickets/:id`,
  `GET /admin/tickets/stats`, `POST /admin/tickets/:id/notes`,
  `PATCH /admin/tickets/:id` (`view_tickets`, `manage_tickets`). Notes and
  history are only added to. `GET /admin/analytics` (`view_analytics`,
  senior). New `lastLoginAt` on users, set at login. The old
  `GET /admin/users` no longer sends the agent ID number or `cash`.
  Database test: `test/customersTickets.test.js` (not run here); unit test
  `test/ticket.rules.test.js`.
- Audit trail (19 Nov). `GET /admin/audit` (`view_audit`, senior). Model
  `AuditEvent`, only ever added to. Every staff request under `/admin` is
  saved after it is answered (who, method, route as written, ids, result,
  address), plus the login steps (PIN ok, wrong PIN, code ok, wrong code).
  Request bodies and query strings are never saved. Writing a line never
  blocks the action; a failed write logs `AUDIT WRITE FAILED`. Database test:
  `test/audit.test.js` (not run here); unit test `test/audit.rules.test.js`.
  Not yet covered: staff reading files through routes outside `/admin`.
- Services and countries (19 Nov). Each service (send money, requests, cash
  in, cash out, add money, airtime, data, bills, bank transfer) is on,
  paused or off, for every country (`ALL`) and per country; the stricter
  wins. Model `ServiceSwitch`. Checked on the server where the money moves
  (`assertServiceAvailable` in the wallet transfer, payment requests and
  agent cash out; `requireService` on top-up, airtime, bills and bank
  transfer). Paused answers 503, off 403, with a customer message (English
  and French). Countries now carry a licence record and can only be switched
  on with one. Switching anything ON needs two staff (the same call by a
  different person within 24 hours); pausing or switching off is one person,
  at once. All changes need the PIN and a reason. Guinea, Guinea-Bissau,
  Sierra Leone and Mali are added and start OFF; the other countries keep
  their current setting. `PATCH /admin/countries/:code` now needs
  `reason` and `pin` (the old dashboard's switch stops working). The app can
  read `GET /payments/services/availability` to grey out tiles; until it
  does, customers see the server's message when they try. Database test:
  `test/serviceSwitch.test.js` (not run here); unit test
  `test/serviceSwitch.rules.test.js`.
- Editing customers and checking callers (19 Nov). `PATCH /admin/customers/:id`
  (name, email, address; `edit_customers`, PIN and reason). The name on the
  ID check is never edited. `PUT /admin/customers/:id/phone` needs two staff
  (the same call by a different person within 24 hours) and signs the
  customer out on every phone; `DELETE /admin/customers/:id/phone-change`
  cancels. Every change is a `CustomerEdit` line. Caller checks
  (`verify_callers`): a Twilio Verify text code to the customer's own phone
  (`/caller-check/code`, `/caller-check/code/verify`), or 3 of the
  customer's 5 security questions (`/caller-check/questions`,
  `/caller-check/questions/:checkId`): all 3 must be right, staff are never
  told which was wrong, each set is used once within 10 minutes, and 3
  failed sets a day locks the questions. Answers are kept as salted scrypt
  hashes only. App: `GET/PUT /user/security-questions` (5 answers and PIN);
  the app screen for it is not built yet. Database test:
  `test/customerCare.test.js` (not run here); unit test
  `test/customerCare.rules.test.js`.

- Revenue (19 Nov). `GET /admin/analytics` now also sends `revenue`, read
  from the ledger only: fees kept (every `fee_income` line, so already net of
  refunds and staff reversals), agent commission (every `commission_expense`
  line, turned positive; clawbacks lower it; the weekly payout is not counted
  again) and net, per month and per currency, never added across currencies.
  Also where the fees came from (transfers, services, cash out, refunds,
  reversals). Not counted: any exchange-rate margin, which sits in
  `fx_clearing` in two currencies. Server branch `agent-cash-out` (merged
  into `notification-feed`), `utils/revenue.rules.js`. Unit test
  `test/revenue.rules.test.js` (passes); database test added to
  `test/customersTickets.test.js` (not run here). Check the figures against
  a few real fees on staging before trusting them.

- Sales team (19 Nov). New page "Sales team" (`view_sales`; a salesperson's
  own login with `view_own_sales` sees only their row; `manage_sales` adds
  and stops salespeople and sets the minimum). Server: `SalesRep` (name, code
  like AWA24, optional linked staff login; codes are never reused),
  `SalesSettings` (the minimum, in GMD, default 700 GMD, about 10 US dollars
  at the starting rates; every change kept with who and why). Sign-up
  (`POST /auth/register`) takes an optional `referralCode`; an unknown or
  stopped code is refused with a clear message; the code is saved on the
  customer as `referral` (immutable). Report per salesperson for a period
  (by sign-up date): signed up, passed the ID check (`kyc.identityVerifiedAt`),
  and of those, made one successful payment (`SPEND_TYPES`) of at least the
  minimum, other currencies converted to GMD at the rates in force when the
  report is opened. Routes: `GET /admin/sales`, `GET /admin/sales/mine`,
  `GET/PUT /admin/sales/settings`, `POST /admin/sales/reps`,
  `POST /admin/sales/reps/:id/stop`. Changing the minimum needs two people
  (20 Nov): the first `PUT /admin/sales/settings` asks (202); the same amount
  from a different staff member within 24 hours changes it; a different
  amount replaces the request; `DELETE /admin/sales/settings/change`
  withdraws it. PIN and reason from both; who asked and who approved are kept. Unit test `test/sales.rules.test.js` (passes);
  database test `test/sales.test.js` (not run here). App: the sign-up screen
  needs a "Sales code (optional)" field that sends `referralCode`.

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

1. Ticket file attachments (needs a place to keep the files and the same
   upload rules as other pictures: size limit, type check).
2. Analytics: revenue and the sales-team view are done (19 Nov). A
   share link that fills in the sales code (instead of typing it) is not built.
3. The app screen for customers to set their security questions, announcements,
   the per-user language setting.

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
- Reversals are best started from an agent's page (the Reverse button).
  The form on the Refunds page still takes a typed record ID for older
  records; the server checks the record, the amount and the people.
- The hold reason and refund note are the only evidence until file uploads
  (contract 7.6) are built.
- With only one staff account, nothing that needs two people can be done,
  including adding the second staff member. The developer must make the
  second staff account directly in the database. The owner has decided
  this is Khady (co-founder): role `admin` on her own Sunu Pay account,
  with `manage_rates` and `manage_staff` plus whatever else she needs
  (never an empty list, which would mean everything). She then logs in and
  sets up her authenticator. After that, everything goes through the panel.
  Rates and fees changes need two people holding `manage_rates`: the owner
  and Khady. Give it to a COO or other partner later from the Staff page.
