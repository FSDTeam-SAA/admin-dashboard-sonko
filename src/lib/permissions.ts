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
    title: "Tickets and analytics",
    items: [
      ["edit_customers", "Edit customer details (phone changes need a second person)"],
      ["verify_callers", "Check a caller is the customer (text code or questions)"],
      ["view_tickets", "See tickets and ticket figures"],
      ["manage_tickets", "Open tickets, write notes, change priority and status"],
      ["translate_notes", "Translate ticket notes (the note's text, without phone numbers or emails, is sent to Google)"],
      ["ticket_files", "Add and open files on tickets (ID documents and statements: give only to those who need it)"],
      ["keep_ticket_files", "Keep a ticket's files past the six years (fraud, police, a dispute); changing or ending it needs a second person"],
      ["view_analytics", "See sales, usage and sign-up figures (senior)"],
      ["view_audit", "See the audit trail of every staff login and action (senior)"],
      ["send_announcements", "Write announcements to customers (a second person approves)"],
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
      ["close_cases", "Close debt and alert cases with a note"],
      ["view_holds", "See account holds"],
      ["place_hold", "Put an account on hold"],
      ["lift_hold", "Ask to lift or approve lifting a hold"],
      ["view_blocklist", "See the blocklist and look a value up"],
      ["add_to_blocklist", "Add to the blocklist (blocks for 72 hours until a second person confirms)"],
      ["manage_blocklist", "Confirm blocklist entries and remove them (removing needs two people)"],
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
