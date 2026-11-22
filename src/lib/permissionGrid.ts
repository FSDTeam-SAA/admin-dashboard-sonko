// The Staff page's grid: each area of the panel with "See" and "Change".
// It is a simpler view of the same permissions the server checks
// (utils/staffPermissions.js); nothing new is created. "Change" always
// includes "See". A test checks every permission is in exactly one place.

export type Module = { key: string; label: string; read: string[]; write: string[] };

export const MODULES: Module[] = [
  { key: "dashboard", label: "Dashboard and analytics", read: ["view_dashboard", "view_analytics"], write: [] },
  { key: "customers", label: "Customers", read: ["view_customers", "view_kyc"], write: ["edit_customers", "message_customers", "verify_callers"] },
  { key: "transactions", label: "Transactions", read: ["view_transactions"], write: [] },
  { key: "tickets", label: "Tickets", read: ["view_tickets"], write: ["manage_tickets", "translate_notes"] },
  { key: "ticketFiles", label: "Ticket files (ID documents, statements)", read: [], write: ["ticket_files", "keep_ticket_files"] },
  { key: "ticketsSenior", label: "Critical tickets and overdue limits (senior)", read: [], write: ["set_critical", "manage_ticket_limits"] },
  { key: "complaints", label: "Complaints: final answers and FCA return", read: ["view_complaint_return"], write: ["close_complaints"] },
  { key: "agents", label: "Agents", read: ["view_agents"], write: ["review_agents"] },
  { key: "fraud", label: "Fraud and alert cases", read: ["view_cases", "view_reports"], write: ["close_cases"] },
  { key: "fraudRules", label: "Fraud monitoring limits (senior)", read: [], write: ["manage_fraud_rules"] },
  { key: "holds", label: "Account holds", read: ["view_holds"], write: ["place_hold", "lift_hold"] },
  { key: "blocklist", label: "Blocklist", read: ["view_blocklist"], write: ["add_to_blocklist", "manage_blocklist"] },
  { key: "reversals", label: "Refunds and reversals", read: ["view_reversals"], write: ["request_reversal", "approve_reversal"] },
  { key: "reversalsOld", label: "Approve refunds older than 30 days (senior)", read: [], write: ["approve_old_reversal"] },
  { key: "payouts", label: "Agent payouts", read: ["view_commission"], write: ["approve_commission", "hold_commission", "release_commission"] },
  { key: "bills", label: "Bills and top-ups to check", read: [], write: ["review_purchases"] },
  { key: "finance", label: "Finance, safeguarding and backups", read: ["view_finance", "view_safeguarding", "view_headroom", "view_backups", "view_checks"], write: ["record_safeguarding", "manage_headroom", "record_restore_tests", "run_checks"] },
  { key: "limits", label: "Sending limits", read: [], write: ["manage_limits"] },
  { key: "settings", label: "Rates, services and countries", read: ["view_gateways"], write: ["manage_rates", "manage_countries", "manage_gateways"] },
  { key: "sales", label: "Sales and invites", read: ["view_sales", "view_referrals"], write: ["manage_sales", "manage_referrals"] },
  { key: "marketing", label: "Announcements, offers and events", read: [], write: ["send_announcements", "manage_offer_cards", "manage_ticket_events", "ticket_money"] },
  { key: "audit", label: "Audit trail", read: ["view_audit"], write: [] },
  { key: "staff", label: "Staff and access", read: [], write: ["manage_staff"] },
];

/** Permissions given one by one only (in "Fine-tune"), never by the grid. */
export const FINE_TUNE_ONLY = ["view_own_sales"];

export type Level = "none" | "read" | "write" | "some";

/** Where a staff member stands in one area. "some" means part of it, set in Fine-tune. */
export function levelOf(m: Module, held: ReadonlySet<string>): Level {
  const all = [...m.read, ...m.write];
  const has = all.filter((p) => held.has(p)).length;
  if (has === 0) return "none";
  if (has === all.length) return m.write.length ? "write" : "read";
  if (m.read.length && m.read.every((p) => held.has(p)) && !m.write.some((p) => held.has(p))) return "read";
  return "some";
}

/** Set an area to none, see, or see and change. Other areas are untouched. */
export function setLevel(m: Module, held: ReadonlySet<string>, level: "none" | "read" | "write"): Set<string> {
  const next = new Set(held);
  for (const p of [...m.read, ...m.write]) next.delete(p);
  if (level === "read" || level === "write") m.read.forEach((p) => next.add(p));
  if (level === "write") m.write.forEach((p) => next.add(p));
  return next;
}

export type Preset = { key: string; label: string; levels: Record<string, "read" | "write">; extra?: string[] };

/** Starting points. They fill the grid; you can change any square before asking for approval. */
export const PRESETS: Preset[] = [
  {
    key: "support",
    label: "Customer support",
    levels: { dashboard: "read", customers: "write", transactions: "read", tickets: "write", holds: "read", reversals: "read" },
  },
  {
    key: "compliance",
    label: "Compliance",
    levels: { dashboard: "read", customers: "read", transactions: "read", tickets: "write", complaints: "write", fraud: "write", holds: "write", blocklist: "write", limits: "write", audit: "read" },
  },
  {
    key: "finance",
    label: "Finance",
    levels: { dashboard: "read", transactions: "read", reversals: "write", payouts: "write", bills: "write", finance: "write" },
  },
  {
    key: "agents",
    label: "Agent manager",
    levels: { dashboard: "read", customers: "read", transactions: "read", agents: "write", payouts: "read" },
  },
  {
    key: "viewer",
    label: "Senior viewer (see only)",
    levels: { dashboard: "read", customers: "read", transactions: "read", tickets: "read", complaints: "read", agents: "read", fraud: "read", holds: "read", blocklist: "read", reversals: "read", payouts: "read", finance: "read", settings: "read", sales: "read", audit: "read" },
  },
  { key: "sales", label: "Salesperson", levels: { dashboard: "read" }, extra: ["view_own_sales"] },
];

export function applyPreset(preset: Preset): Set<string> {
  let held = new Set<string>(preset.extra ?? []);
  for (const m of MODULES) {
    const level = preset.levels[m.key];
    if (level) held = setLevel(m, held, level);
  }
  return held;
}

/** Short text for one square of the "who can do what" table. */
export const LEVEL_SHORT: Record<Level, string> = { none: "—", read: "See", write: "See and change", some: "Part" };
