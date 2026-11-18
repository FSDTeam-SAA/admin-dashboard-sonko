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
};

export const NAV: NavItem[] = [
  { path: "/", label: "Home", permission: null, routes: ["GET /admin/me"], ready: true },
  {
    path: "/reports",
    label: "Reported requests",
    permission: "view_reports",
    routes: ["GET /admin/reported-requests", "POST /admin/payment-requests/:id/refund"],
    ready: false,
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
    ready: false,
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
    ready: false,
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
    ready: false,
  },
  {
    path: "/settings",
    label: "Rates and fees",
    permission: "view_settings",
    routes: [
      "GET /admin/settings/cash-out/:country",
      "POST /admin/settings/cash-out/:country/changes",
      "GET /admin/settings/changes",
      "POST /admin/settings/changes/:id/approve",
      "POST /admin/settings/changes/:id/cancel",
    ],
    ready: false,
  },
  {
    path: "/staff",
    label: "Staff",
    permission: "manage_staff",
    routes: ["GET /admin/users", "PATCH /admin/users/:userId/role", "DELETE /admin/users/:userId/role-change"],
    ready: false,
  },
  {
    path: "/customers",
    label: "Customers",
    permission: "view_customers",
    routes: ["GET /admin/users", "GET /admin/transactions"],
    ready: false,
  },
];

export function visibleNav(permissions: readonly string[]): NavItem[] {
  return NAV.filter((item) => item.permission === null || permissions.includes(item.permission));
}
