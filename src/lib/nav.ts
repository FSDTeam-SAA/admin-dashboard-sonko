// The panel's pages and the permission each needs to be shown. Hiding a page
// is only a convenience: the server checks the permission again on every
// call, so a hidden page can't be used by typing its address.
export type NavItem = {
  path: string;
  label: string;
  permission: string | null;
  /** The server routes this page will use, for the developer. */
  routes: string[];
  ready: boolean;
  /** Also shown to staff who have any of these instead. */
  alsoFor?: string[];
};

export const NAV: NavItem[] = [
  { path: "/", label: "Home", permission: null, routes: ["GET /admin/me"], ready: true },
  {
    path: "/reports",
    label: "Reported requests",
    permission: "view_reports",
    routes: ["GET /admin/reported-requests", "POST /admin/payment-requests/:id/refund"],
    ready: true,
  },
  {
    path: "/cases",
    label: "Debt and alert cases",
    permission: "view_cases",
    routes: ["GET /admin/compliance-cases", "POST /admin/compliance-cases/:id/close"],
    ready: true,
  },
  {
    path: "/safeguarding",
    label: "Safeguarding",
    permission: "view_safeguarding",
    routes: ["GET /admin/safeguarding", "POST /admin/safeguarding/checks", "POST /admin/safeguarding/checks/:id/confirm", "POST /admin/safeguarding/checks/:id/withdraw"],
    ready: true,
  },
  {
    path: "/headroom",
    label: "Regulatory headroom",
    permission: "view_headroom",
    routes: ["GET /admin/headroom", "PUT /admin/headroom/countries", "DELETE /admin/headroom/countries/change"],
    ready: true,
  },
  {
    path: "/backups",
    label: "Backups",
    permission: "view_backups",
    routes: ["GET /admin/backups", "POST /admin/backups/restore-tests"],
    ready: true,
  },
  {
    path: "/holds",
    label: "Account holds",
    permission: "view_holds",
    routes: [
      "GET /admin/users/:id/hold",
      "POST /admin/users/:id/hold",
      "POST /admin/users/:id/hold/lift",
      "POST /admin/users/:id/hold/lift/approve",
      "POST /admin/users/:id/hold/lift/cancel",
    ],
    ready: true,
  },
  {
    path: "/reversals",
    label: "Refunds and reversals",
    permission: "view_reversals",
    routes: [
      "GET /admin/reversals",
      "POST /admin/cashouts/:id/reverse",
      "POST /admin/cashins/:id/reverse",
      "POST /admin/reversals/:id/approve",
      "POST /admin/reversals/:id/cancel",
    ],
    ready: true,
  },
  {
    path: "/payouts",
    label: "Agent payouts",
    permission: "view_commission",
    routes: [
      "GET /admin/commission/days",
      "GET /admin/commission/payouts",
      "POST /admin/commission/payouts/:id/approve",
      "POST /admin/commission/payouts/approve-batch",
      "POST /admin/commission/payouts/:id/hold",
      "POST /admin/commission/payouts/:id/release",
    ],
    ready: true,
  },
  {
    path: "/settings",
    label: "Rates and fees",
    permission: "manage_rates",
    routes: [
      "GET /admin/settings/rates",
      "POST /admin/settings/rates/changes",
      "GET /admin/settings/cash-out/:country",
      "POST /admin/settings/cash-out/:country/changes",
      "GET /admin/settings/changes",
      "POST /admin/settings/changes/:id/approve",
      "POST /admin/settings/changes/:id/cancel",
    ],
    ready: true,
  },
  {
    path: "/staff",
    label: "Staff",
    permission: "manage_staff",
    routes: ["GET /admin/staff", "PATCH /admin/users/:userId/role", "PUT /admin/users/:userId/permissions", "POST /admin/users/:userId/2fa/reset"],
    ready: true,
  },
  {
    path: "/agents",
    label: "Agents",
    permission: "view_agents",
    routes: ["GET /admin/agents", "GET /admin/agents/:id", "PATCH /admin/agent-applications/:userId"],
    ready: true,
  },
  {
    path: "/customers",
    label: "Customers",
    permission: "view_customers",
    routes: [
      "GET /admin/customers",
      "GET /admin/customers/:id",
      "PATCH /admin/customers/:id",
      "PUT /admin/customers/:id/phone",
      "DELETE /admin/customers/:id/phone-change",
      "POST /admin/customers/:id/caller-check/code",
      "POST /admin/customers/:id/caller-check/code/verify",
      "POST /admin/customers/:id/caller-check/questions",
      "POST /admin/customers/:id/caller-check/questions/:checkId",
    ],
    ready: true,
  },
  {
    path: "/tickets",
    label: "Tickets",
    permission: "view_tickets",
    routes: [
      "GET /admin/tickets",
      "GET /admin/tickets/stats",
      "GET /admin/tickets/:id",
      "POST /admin/tickets",
      "POST /admin/tickets/:id/notes",
      "PATCH /admin/tickets/:id",
    ],
    ready: true,
  },
  {
    path: "/complaints",
    label: "Complaints",
    permission: "view_tickets",
    routes: [
      "GET /admin/complaints",
      "GET /admin/complaints/:id",
      "POST /admin/complaints",
      "POST /admin/complaints/:id/acknowledge",
      "POST /admin/complaints/:id/holding",
      "POST /admin/complaints/:id/close",
    ],
    ready: true,
  },
  {
    path: "/analytics",
    label: "Analytics",
    permission: "view_analytics",
    routes: ["GET /admin/analytics"],
    ready: true,
  },
  {
    path: "/sales",
    label: "Sales team",
    permission: "view_sales",
    alsoFor: ["view_own_sales"],
    routes: ["GET /admin/sales", "GET /admin/sales/mine", "GET/PUT /admin/sales/settings", "POST /admin/sales/reps", "POST /admin/sales/reps/:id/stop"],
    ready: true,
  },
  {
    path: "/bills",
    label: "Bills and top-ups",
    permission: "review_purchases",
    routes: ["GET /admin/needs-checking", "PATCH /admin/needs-checking/:transactionId"],
    ready: true,
  },
  {
    path: "/announcements",
    label: "Announcements",
    permission: "send_announcements",
    routes: ["GET /admin/announcements", "POST /admin/announcements", "POST /admin/announcements/:id/approve", "POST /admin/announcements/:id/withdraw"],
    ready: true,
  },
  {
    path: "/blocklist",
    label: "Blocklist",
    permission: "view_blocklist",
    routes: [
      "GET /admin/blocklist",
      "GET /admin/blocklist/matches",
      "POST /admin/blocklist/look-up",
      "POST /admin/blocklist",
      "POST /admin/blocklist/:id/confirm",
      "POST /admin/blocklist/:id/remove",
      "DELETE /admin/blocklist/:id/remove",
      "POST /admin/blocklist/matches/:id/close",
    ],
    ready: true,
  },
  {
    path: "/services",
    label: "Services and countries",
    // Staff who can see the dashboard can see what is switched on; changing needs manage_countries.
    permission: "view_dashboard",
    routes: [
      "GET /admin/services",
      "PUT /admin/services/:country/:service",
      "DELETE /admin/services/:country/:service/switch-on",
      "GET /admin/countries",
      "PATCH /admin/countries/:code",
      "DELETE /admin/countries/:code/switch-on",
      "PUT /admin/countries/:code/licence",
    ],
    ready: true,
  },
  {
    path: "/audit",
    label: "Audit trail",
    permission: "view_audit",
    routes: ["GET /admin/audit"],
    ready: true,
  },
];

export function visibleNav(permissions: readonly string[]): NavItem[] {
  return NAV.filter(
    (item) => item.permission === null || permissions.includes(item.permission) || Boolean(item.alsoFor?.some((p) => permissions.includes(p))),
  );
}
