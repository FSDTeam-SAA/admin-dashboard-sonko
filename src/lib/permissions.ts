// Every staff permission, grouped, in plain words, for the Staff page. The
// names must match utils/staffPermissions.js on the server.
export const PERMISSION_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Customers",
    items: [
      ["view_dashboard", "See the dashboard"],
      ["view_customers", "See customers and search for them"],
      ["view_transactions", "See transactions"],
      ["view_kyc", "See ID checks"],
    ],
  },
  {
    title: "Agents",
    items: [
      ["view_agents", "See agents, their activity and balances"],
      ["review_agents", "Approve or turn down agent applications"],
    ],
  },
  {
    title: "Reports and holds",
    items: [
      ["view_reports", "See reported requests"],
      ["view_cases", "See debt and alert cases"],
      ["view_holds", "See account holds"],
      ["place_hold", "Put an account on hold"],
      ["lift_hold", "Ask to lift or approve lifting a hold"],
    ],
  },
  {
    title: "Money",
    items: [
      ["view_reversals", "See refunds and reversals"],
      ["request_reversal", "Ask for a refund or reversal"],
      ["approve_reversal", "Approve a refund or reversal"],
      ["approve_old_reversal", "Approve one older than 30 days (senior)"],
      ["review_purchases", "Decide bill payments that need checking"],
      ["view_commission", "See agent payouts"],
      ["approve_commission", "Approve agent payouts"],
      ["hold_commission", "Hold an agent payout"],
      ["release_commission", "Release a held payout"],
    ],
  },
  {
    title: "Settings",
    items: [
      ["manage_rates", "Exchange rates, fees, agent pay and limits (senior only)"],
      ["manage_countries", "Change countries, services and logos"],
      ["view_gateways", "See payment providers"],
      ["manage_gateways", "Change payment providers"],
      ["view_checks", "See balance checks"],
      ["run_checks", "Run a balance check"],
    ],
  },
  {
    title: "Staff",
    items: [
      ["manage_staff", "Manage staff (roles, permissions, lost phones)"],
    ],
  },
];

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items));
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map(([key]) => key));
