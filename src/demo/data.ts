// Made-up data for the demo build only (demo.html). Nothing here is a real
// person, phone number or payment. The real panel never imports this folder.
// The fixtures use the real API types, so a change to the server's answers
// that the demo does not follow stops the build (tsc) instead of drifting.
import type {
  AgentDetail,
  AgentRow,
  Announcement,
  BlockEntry,
  BlockMatch,
  Complaint,
  ComplianceCaseRow,
  CountryRow,
  CustomerDetail,
  CustomerRow,
  EventTicketRow,
  HoldRow,
  OfferCard,
  Payout,
  Person,
  ReportedRequest,
  Reversal,
  ServiceName,
  ServiceSwitchRow,
  StaffInvite,
  StaffRow,
  StuckPurchase,
  TicketCategory,
  TicketDetail,
  TicketEvent,
  TicketPriority,
  TicketRow,
  TicketStatus,
  TicketTier,
  TxDetail,
  TxRow,
} from "../api/admin";
import { SERVICE_NAMES } from "../api/admin";
import type { Staff } from "../api/staff";
import { PERMISSION_GROUPS } from "../lib/permissions";

// ---- Time and a fixed random, so the demo looks the same every visit ----

export const NOW = Date.now();
export const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();
export const ahead = (hours: number) => ago(-hours);
export const day = (daysAgo: number) => ago(daysAgo * 24).slice(0, 10);

let seed = 20261123;
export function rand(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
export const between = (low: number, high: number) => Math.round(low + rand() * (high - low));
const ref = () => "SP" + Math.floor(rand() * 36 ** 8).toString(36).toUpperCase().padStart(8, "0");

// ---- Staff ----

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.items.map(([key]) => key)).filter(
  // A salesperson's own login sees only their sign-ups; the demo staff see everyone's.
  (key) => key !== "view_own_sales",
);

type DemoStaff = { id: string; name: string; phone: string; jobTitle: string; country: string; employeeId: string };
export const STAFF: DemoStaff[] = [
  { id: "s1", name: "Fatou Ceesay", phone: "+447700900101", jobTitle: "Operations lead", country: "GB", employeeId: "SP-001" },
  { id: "s3", name: "Aminata Sow", phone: "+221770000003", jobTitle: "Compliance officer", country: "SN", employeeId: "SP-003" },
  { id: "s2", name: "Ousman Bah", phone: "+2203012345", jobTitle: "Customer support", country: "GM", employeeId: "SP-002" },
  { id: "s4", name: "Lamin Jatta", phone: "+2203045678", jobTitle: "Agent network", country: "GM", employeeId: "SP-004" },
  { id: "s5", name: "Isatou Drammeh", phone: "+447700900105", jobTitle: "Finance", country: "GB", employeeId: "SP-005" },
];
/** The two people the demo can sign in as (both full admins, so one can approve the other). */
export const SIGN_IN_AS = ["s1", "s3"] as const;

export function staffMe(id: string): Staff {
  const person = STAFF.find((s) => s.id === id) ?? STAFF[0]!;
  return { _id: person.id, name: person.name, phone: person.phone, role: "admin", permissions: ALL_PERMISSIONS, fullAdmin: true, language: "en", translationOn: true, filesOn: true };
}

export const people: Record<string, Person> = Object.fromEntries(STAFF.map((s) => [s.id, { name: s.name, phone: s.phone, role: "admin" }]));
/** Staff, customers and agents by id, as the server sends with reversals and payouts. */
export function everyone(): Record<string, Person> {
  return {
    ...people,
    ...Object.fromEntries(customerRows.map((c) => [c.id, { name: c.name, phone: c.phone, role: "user" }])),
    ...Object.fromEntries(agentRows.map((a) => [a.id, { name: a.businessName, phone: a.phone, role: "agent" }])),
  };
}
export const staffName = (id: string) => STAFF.find((s) => s.id === id)?.name ?? "";
const mini = (id: string) => ({ id, name: staffName(id), phone: STAFF.find((s) => s.id === id)?.phone ?? "" });

const SUPPORT = ["view_dashboard", "view_customers", "view_transactions", "edit_customers", "message_customers", "verify_callers", "view_tickets", "manage_tickets"];
const AGENT_TEAM = ["view_dashboard", "view_agents", "review_agents", "view_agent_analytics", "view_commission", "view_reversals", "request_reversal"];
const FINANCE = ["view_dashboard", "view_finance", "view_safeguarding", "record_safeguarding", "view_commission", "view_reversals", "approve_reversal", "view_transactions"];

export const staffRows: StaffRow[] = STAFF.map((s, i) => ({
  id: s.id,
  name: s.name,
  phone: s.phone,
  role: "admin",
  fullAdmin: s.id === "s1" || s.id === "s3",
  permissions: s.id === "s2" ? SUPPORT : s.id === "s4" ? AGENT_TEAM : s.id === "s5" ? FINANCE : ALL_PERMISSIONS,
  twoStepSetUp: true,
  pendingRoleChange: null,
  pendingPermissionsChange:
    s.id === "s2" ? { full: false, permissions: [...SUPPORT, "view_holds", "place_hold"], requestedBy: "s4", requestedAt: ago(5) } : null,
  profile: { employeeId: s.employeeId, jobTitle: s.jobTitle, country: s.country },
  history: [{ full: i < 2, permissions: i < 2 ? [] : SUPPORT, requestedBy: "s1", approvedBy: "s3", how: i < 2 ? "made_staff" : "invite", at: ago(24 * (200 - i * 30)) }],
}));

export const staffInvites: StaffInvite[] = [
  {
    id: "inv1", name: "Babucarr Sillah", phone: "+2203099911", email: "b.sillah@example.com", country: "GM", employeeId: "SP-006", jobTitle: "Customer support",
    permissions: SUPPORT, status: "awaiting_approval", invitedBy: "Lamin Jatta", invitedById: "s4", invitedAt: ago(3), approvedBy: "", approvedAt: null, expiresAt: null, acceptedAt: null,
  },
  {
    id: "inv2", name: "Ndeye Faye", phone: "+221770000222", email: "n.faye@example.com", country: "SN", employeeId: "SP-007", jobTitle: "Agent network",
    permissions: AGENT_TEAM, status: "sent", invitedBy: "Fatou Ceesay", invitedById: "s1", invitedAt: ago(30), approvedBy: "Aminata Sow", approvedAt: ago(28), expiresAt: ahead(18), acceptedAt: null,
  },
];

// ---- Customers ----

type Country = "GB" | "GM" | "SN";
const CURRENCY: Record<Country, string> = { GB: "GBP", GM: "GMD", SN: "XOF" };
const NAMES: [string, Country][] = [
  ["Awa Ceesay", "GB"], ["Modou Sanneh", "GB"], ["Fatoumata Jallow", "GB"], ["Ebrima Darboe", "GB"], ["Kaddy Touray", "GB"], ["Musa Camara", "GB"],
  ["Haddy Jobe", "GB"], ["Alieu Sowe", "GB"], ["Isatou Njie", "GM"], ["Lamin Touray", "GM"], ["Binta Bojang", "GM"], ["Omar Jallow", "GM"],
  ["Mariama Kah", "GM"], ["Pa Modou Faye", "GM"], ["Sainabou Ceesay", "GM"], ["Yusupha Manneh", "GM"], ["Sarah Johnson", "SN"], ["Amadou Bah", "SN"],
  ["Aïssatou Diop", "SN"], ["Cheikh Ndiaye", "SN"], ["Mame Diarra Fall", "SN"], ["Ibrahima Sarr", "SN"], ["Coumba Mbaye", "SN"], ["Ousmane Diallo", "SN"],
];
function phoneFor(country: Country, i: number): string {
  if (country === "GB") return `+4477009002${String(10 + i).padStart(2, "0")}`;
  if (country === "GM") return `+2203${String(100000 + i * 7919).slice(-6)}`;
  return `+22177${String(1000000 + i * 104729).slice(-7)}`;
}

export const customerRows: CustomerRow[] = NAMES.map(([name, country], i) => {
  const level = i % 5 === 3 ? "none" : i % 4 === 1 ? "partial" : "full";
  return {
    id: `c${i + 1}`,
    name,
    phone: phoneFor(country, i),
    role: "user",
    country,
    idChecked: level !== "none",
    verification: level,
    onHold: i === 4 || i === 13,
    closed: i === 21,
    deactivated: i === 22,
    joinedAt: ago(24 * (20 + i * 13)),
    lastLoginAt: i === 21 ? ago(24 * 60) : ago(between(1, 90)),
  };
});
export const customerById = (id: string) => customerRows.find((c) => c.id === id);
const custCurrency = (c: CustomerRow) => CURRENCY[(c.country as Country) ?? "GB"] ?? "GBP";

// ---- Agents ----

const AGENTS: [string, string, string, Country, AgentRow["status"]][] = [
  ["Modou Njie", "Sunu Kiosk", "Serrekunda", "GM", "approved"],
  ["Fatou Jallow", "Bakau Mobile Money", "Bakau", "GM", "approved"],
  ["Lamin Sanneh", "Westfield Money Corner", "Serrekunda", "GM", "approved"],
  ["Ebrima Touray", "Brikama Phone Shop", "Brikama", "GM", "approved"],
  ["Moussa Diop", "Plateau Transfert", "Dakar", "SN", "approved"],
  ["Astou Ndiaye", "Thiès Multiservices", "Thiès", "SN", "approved"],
  ["Ousman Ceesay", "Farafenni Cash Point", "Farafenni", "GM", "pending"],
  ["Rokhaya Sarr", "Médina Services", "Dakar", "SN", "pending"],
  ["Alagie Bojang", "Lamin Village Shop", "Lamin", "GM", "suspended"],
];
export const agentRows: AgentRow[] = AGENTS.map(([name, businessName, city, country, status], i) => ({
  id: `a${i + 1}`,
  name,
  phone: country === "GM" ? `+2207${String(200000 + i * 3571).slice(-6)}` : `+22178${String(2000000 + i * 99991).slice(-7)}`,
  role: status === "approved" || status === "suspended" ? "agent" : "user",
  status,
  businessName,
  city,
  country,
  idChecked: status !== "pending" || i === 6,
  onHold: status === "suspended",
  holdScope: status === "suspended" ? "all" : null,
  appliedAt: ago(24 * (250 - i * 25)),
  reviewedAt: status === "pending" ? null : ago(24 * (240 - i * 25)),
}));
export const agentById = (id: string) => agentRows.find((a) => a.id === id);
const agentCurrency = (a: AgentRow) => CURRENCY[a.country as Country] ?? "GMD";

// ---- Payments ----

const TYPES = ["send-money", "send-money", "send-money", "airtime", "bill", "cash-in", "cash-out", "wallet-top-up", "bank", "convert"] as const;
function amountFor(type: string, currency: string): number {
  const base = type === "airtime" ? between(1, 6) : type === "bill" ? between(5, 60) : between(20, 400);
  if (currency === "GBP" || currency === "EUR") return base * 100;
  if (currency === "XOF") return base * 655;
  return base * 7_500;
}
export const txRows: TxRow[] = [];
for (let i = 0; i < 90; i++) {
  const type = TYPES[i % TYPES.length]!;
  const agentRow = agentRows[(i * 7) % 6]!;
  // Cash in and out happen where the agent is; people in the UK send home.
  const local = customerRows.filter((x) => x.country === agentRow.country && !x.closed);
  const c = type === "cash-in" || type === "cash-out" ? local[i % local.length]! : customerRows[i % 21]!;
  const other = c.country === "GB" ? customerRows[8 + ((i * 7) % 13)]! : customerRows[(i * 7 + 3) % 21]!;
  const country = (c.country as Country) ?? "GB";
  const currency = type === "cash-in" || type === "cash-out" ? agentCurrency(agentRow) : type === "send-money" && country === "GB" ? "GBP" : custCurrency(c);
  const status = i === 4 ? "needs_review" : i % 17 === 5 ? "failed" : i % 23 === 7 ? "pending" : i === 40 ? "reversed" : "successful";
  const isAgent = type === "cash-in" || type === "cash-out";
  const from = type === "cash-in" ? { id: agentRow.id, name: agentRow.businessName, phone: agentRow.phone } : { id: c.id, name: c.name, phone: c.phone };
  const to =
    type === "send-money" ? { id: other.id, name: other.name, phone: other.phone }
    : type === "cash-out" ? { id: agentRow.id, name: agentRow.businessName, phone: agentRow.phone }
    : type === "cash-in" ? { id: c.id, name: c.name, phone: c.phone }
    : null;
  const when = ago(i * 5.3 + 0.4);
  txRows.push({
    id: `x${i + 1}`,
    txRef: ref(),
    providerReference: type === "airtime" || type === "bill" ? `RL-${between(1_000_000, 9_999_999)}` : "",
    provider: type === "airtime" || type === "bill" ? "Reloadly" : type === "wallet-top-up" ? "Card" : type === "bank" ? "Bank" : "Sunu Pay",
    type,
    status,
    currency,
    amountMinor: amountFor(type, currency),
    description:
      type === "send-money" ? `Sent to ${other.name}`
      : type === "airtime" ? `Airtime for ${phoneFor(country, i + 40).slice(0, 7)}•••${String(i).padStart(4, "0")}`
      : type === "bill" ? pick(["NAWEC electricity", "Senelec électricité", "SDE water", "GAMTEL internet"])
      : type === "cash-in" ? `Cash in at ${agentRow.businessName}`
      : type === "cash-out" ? `Cash out at ${agentRow.businessName}`
      : type === "wallet-top-up" ? "Card top-up"
      : type === "bank" ? "To a bank account"
      : "GBP to GMD",
    from: isAgent || type !== "wallet-top-up" ? from : { id: c.id, name: c.name, phone: c.phone },
    to,
    country: type === "send-money" ? (other.country as string) : isAgent ? agentRow.country : country,
    senderCountry: country,
    createdAt: when,
    updatedAt: when,
  });
}
export function txDetail(row: TxRow): TxDetail {
  const fee = row.currency === "GBP" ? 99 : row.currency === "XOF" ? 500 : 2_500;
  return {
    ...row,
    ledger: [
      { purpose: "Customer pays", account: `wallet:${row.from?.id ?? "?"}:${row.currency}`, currency: row.currency, amountMinor: -row.amountMinor - fee, at: row.createdAt },
      { purpose: "Fee", account: `revenue:fees:${row.currency}`, currency: row.currency, amountMinor: fee, at: row.createdAt },
      { purpose: row.to ? "Received" : "Provider", account: row.to ? `wallet:${row.to.id}:${row.currency}` : `provider:${row.provider}`, currency: row.currency, amountMinor: row.amountMinor, at: row.createdAt },
    ],
    tickets: row.id === "x5" ? [{ id: "t3", number: 1043, subject: "Airtime not received", status: "in_progress" }] : [],
  };
}

// ---- Tickets ----

type T = [string, TicketCategory, TicketPriority, TicketStatus, number | null, string | null, number];
const TICKETS: T[] = [
  ["Money sent to Gambia not received", "money_missing", "critical", "open", 1, null, 1],
  ["Cash out code not working at agent", "cash_out", "high", "in_progress", 10, "s2", 3],
  ["Airtime not received", "payment_failed", "high", "in_progress", 1, "s2", 6],
  ["Wants a higher sending limit", "limit_increase", "medium", "open", 1, null, 20],
  ["Forgot PIN, security questions not set", "login_or_pin", "medium", "open", 17, "s2", 26],
  ["ID check keeps failing", "id_check", "medium", "in_progress", 18, "s3", 30],
  ["Asking why the fee changed", "fees_or_rates", "low", "open", 2, null, 44],
  ["Agent asked for extra money", "agent", "high", "open", 12, "s4", 50],
  ["Change of business address", "agent_address", "low", "open", null, "s4", 60],
  ["Bank transfer pending for 3 days", "payment_failed", "high", "resolved", 3, "s2", 80],
  ["Wrong name on the account", "account", "low", "resolved", 11, "s2", 110],
  ["Event ticket not showing", "other", "medium", "resolved", 19, "s2", 130],
  ["Card top-up taken twice", "money_missing", "critical", "closed", 4, "s5", 170],
  ["Cannot log in on new phone", "login_or_pin", "medium", "closed", 15, "s2", 200],
  ["Rate shown differs from receipt", "fees_or_rates", "low", "closed", 6, "s2", 260],
  ["Bill paid but NAWEC token missing", "payment_failed", "high", "open", 10, null, 2],
  ["Close my account", "account", "low", "in_progress", 22, "s2", 14],
  ["Agent shop closed during opening hours", "agent", "low", "open", 13, null, 70],
];
export const ticketRows: TicketRow[] = TICKETS.map(([subject, category, priority, status, cust, assigned, hoursAgo], i) => {
  const customer = cust ? customerRows[cust - 1]! : null;
  const overdueAfter = { critical: 4, high: 24, medium: 72, low: 168 }[priority];
  return {
    id: `t${i + 1}`,
    number: 1041 + i,
    subject,
    priority,
    status,
    category,
    customer: customer ? { id: customer.id, name: customer.name } : category === "agent_address" ? { id: "a2", name: "Fatou Jallow" } : null,
    assignedTo: assigned ? { id: assigned, name: staffName(assigned) } : null,
    createdAt: ago(hoursAgo),
    resolvedAt: status === "resolved" || status === "closed" ? ago(hoursAgo - 6) : null,
    updatedAt: ago(Math.max(0.2, hoursAgo - 2)),
    overdue: (status === "open" || status === "in_progress") && hoursAgo > overdueAfter,
    unassigned: !assigned,
  };
});

const NOTES: Record<string, { by: string; text: string; hours: number }[]> = {
  t1: [
    { by: "s2", text: "Customer called. Sent money home yesterday evening; the recipient says nothing arrived. Checked the payment: it shows successful on our side.", hours: 0.9 },
    { by: "s3", text: "Ledger shows the money credited to the recipient's wallet. Asked the customer to have the recipient refresh the app. Keeping open until confirmed.", hours: 0.5 },
  ],
  t2: [
    { by: "s2", text: "Agent Westfield Money Corner says the code shows 'expired'. Codes last 15 minutes; customer waited 25. Asked the customer to make a new code.", hours: 2.5 },
    { by: "s4", text: "Le client a refait un code, l'agent l'a accepté. On attend la confirmation du client.", hours: 1.2 },
  ],
  t3: [{ by: "s2", text: "Airtime of GMD 150.00 for an Africell number. Provider says 'processing'. Moved to Bills and top-ups to decide.", hours: 5 }],
};

export function ticketDetail(row: TicketRow): TicketDetail {
  const customer = row.customer ? customerById(row.customer.id) ?? null : null;
  const pay = row.id === "t3" ? txRows.find((x) => x.id === "x5") ?? null : row.id === "t1" ? txRows.find((x) => x.type === "send-money" && x.from?.id === "c1") ?? null : null;
  return {
    ...row,
    detail:
      row.id === "t1"
        ? "The customer sent money to a family member in The Gambia last night. The app says it was sent, but the recipient cannot see it. The customer is worried and wants to know where the money is."
        : `${row.subject}. Logged from a phone call. The customer asked to be called back on the number on their account.`,
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : row.customer ? { id: row.customer.id, name: row.customer.name, phone: "" } : null,
    assignedAt: row.assignedTo ? ago(1) : null,
    paymentLinked: Boolean(pay),
    payment: pay
      ? { id: pay.id, txRef: pay.txRef, type: pay.type, status: pay.status, currency: pay.currency, amountMinor: pay.amountMinor, description: pay.description, direction: "out", otherParty: pay.to ? { id: pay.to.id, name: pay.to.name } : null, at: pay.createdAt }
      : null,
    createdBy: mini("s2"),
    assignedTo: row.assignedTo ? mini(row.assignedTo.id) : null,
    notes: (NOTES[row.id] ?? []).map((n) => ({ by: mini(n.by), text: n.text, at: ago(n.hours) })),
    history: [
      { by: mini("s2"), field: "status", from: "", to: "open", at: row.createdAt },
      ...(row.assignedTo ? [{ by: mini("s2"), field: "assignedTo", from: "", to: row.assignedTo.name, at: ago(1) }] : []),
      ...(row.overdue ? [{ by: null, system: true, field: "overdue", from: "", to: "yes", at: ago(0.3) }] : []),
    ],
    keep: null,
    fileCount: row.id === "t1" ? 1 : 0,
    files:
      row.id === "t1"
        ? [{ id: "f1", index: 0, name: "screenshot-payment.png", note: "Customer's screenshot of the payment", type: "image/png", size: 182_400, by: mini("s2"), at: ago(0.8), removed: false, removedAt: null, canRemove: true }]
        : [],
  };
}

// ---- Customer file ----

export function customerDetail(row: CustomerRow): CustomerDetail {
  const currency = custCurrency(row);
  const mine = txRows.filter((x) => x.from?.id === row.id || x.to?.id === row.id).slice(0, 15);
  const balance = currency === "GBP" ? between(2_000, 90_000) : currency === "XOF" ? between(50, 900) * 655 : between(5, 120) * 75_000;
  // On the file, verification and closed are objects, not the list's labels.
  const { verification: _level, closed: _closed, ...listRow } = row;
  void _level;
  void _closed;
  return {
    customer: {
      ...listRow,
      email: `${row.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      username: row.name.split(" ")[0]!.toLowerCase() + row.id.slice(1),
      address: row.country === "GB" ? { street: "12 Example Road", city: "Milton Keynes", zipCode: "MK1 1AA", country: "GB" } : row.country === "GM" ? { street: "Kairaba Avenue", city: "Serrekunda", country: "GM" } : { street: "Rue 10", city: "Dakar", country: "SN" },
      receivingCurrency: row.country === "GB" ? "GMD" : currency,
      profilePicture: "",
      verification: {
        identityVerifiedAt: row.idChecked ? ago(24 * 15) : null,
        addressVerifiedAt: row.verification === "full" ? ago(24 * 14) : null,
        nameOnId: row.idChecked ? row.name.toUpperCase() : "",
        country: row.country,
      },
      hold: row.onHold ? { scope: row.id === "c5" ? "requests" : "all", reason: "Reported payment request under review", placedAt: ago(30) } : null,
      sendLock: { on: false },
      closed: row.closed ? { at: ago(24 * 20), via: "app", kind: "closed", reason: "Moving abroad", by: "" } : row.deactivated ? { at: ago(24 * 9), via: "app", kind: "deactivated", reason: "", by: "" } : null,
    },
    wallets: [{ currency, balanceMinor: balance, amount: balance / (currency === "XOF" ? 1 : 100) }],
    spend: [{ currency, count: mine.length, amountMinor: mine.reduce((sum, x) => sum + x.amountMinor, 0) }],
    transactions: mine.map((x) => ({
      id: x.id, txRef: x.txRef, type: x.type, status: x.status, currency: x.currency, amountMinor: x.amountMinor, description: x.description,
      direction: x.from?.id === row.id ? "out" : "in",
      otherParty: x.from?.id === row.id ? (x.to ? { name: x.to.name, phone: x.to.phone ?? "" } : null) : x.from ? { name: x.from.name, phone: x.from.phone ?? "" } : null,
      at: x.createdAt,
    })),
    tickets: ticketRows.filter((t) => t.customer?.id === row.id).map((t) => ({ id: t.id, number: t.number, subject: t.subject, priority: t.priority, status: t.status, createdAt: t.createdAt })),
    edits: row.id === "c1" ? [{ field: "address.city", from: "London", to: "Milton Keynes", reason: "Customer moved, confirmed by phone after caller check", by: "Ousman Bah", requestedBy: "", at: ago(24 * 40) }] : [],
    pendingPhoneChange: row.id === "c9" ? { phone: "+2203998877", reason: "Lost old SIM, new number confirmed with ID at the office", requestedBy: "s2", requestedByName: "Ousman Bah", requestedAt: ago(2) } : null,
    status: { moneyOutPausedUntil: null, openCases: row.id === "c3" ? { reversal_alert: 1 } : {}, blockedPhones: 0, openComplaints: row.id === "c1" ? { open: 1, late: 0 } : { open: 0, late: 0 } },
    devices: [
      { device: `d-${row.id}-1`, masked: "iPhone 15 · •••4f2a", lastSeenAt: row.lastLoginAt, blocked: false },
      ...(row.id === "c2" ? [{ device: "d-c2-2", masked: "Samsung A54 · •••91cc", lastSeenAt: ago(24 * 30), blocked: false }] : []),
    ],
    callerChecks: {
      questionsSet: row.id !== "c17",
      questionsSetAt: row.id !== "c17" ? ago(24 * 50) : null,
      verifiedUntil: null,
      verifiedBy: null,
      verifiedByName: null,
      recent: row.id === "c1" ? [{ method: "code", passed: true, by: "Ousman Bah", at: ago(24 * 2) }] : [],
    },
    recentlyOpenedBy: [{ staff: "Ousman Bah", at: ago(3) }],
  };
}

// ---- Agent file ----

export function agentDetail(row: AgentRow): AgentDetail {
  const currency = agentCurrency(row);
  const unit = currency === "XOF" ? 655 : 7_500;
  const outs = txRows.filter((x) => x.type === "cash-out" && x.to?.id === row.id).slice(0, 10);
  const ins = txRows.filter((x) => x.type === "cash-in" && x.from?.id === row.id).slice(0, 10);
  return {
    agent: {
      ...row,
      email: `${row.businessName.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      fullName: row.name,
      businessAddress: row.city === "Dakar" ? "Avenue Pompidou" : "Kairaba Avenue, opposite the petrol station",
      showOnMap: row.status === "approved",
      pin: row.country === "SN" ? { lat: 14.6708, lng: -17.4381 } : { lat: 13.4549, lng: -16.6788 },
      pendingAddress: row.id === "a2" ? { businessAddress: "Old Cape Road, next to the bakery", city: "Bakau", pin: { lat: 13.4781, lng: -16.6823 }, requestedAt: ago(60), proofAsked: false, ticketId: "t9" } : null,
      lastLoginAt: ago(between(1, 30)),
      nationalId: "•••••" + between(1000, 9999),
      rejectionReason: "",
      reviewedBy: row.reviewedAt ? "Lamin Jatta" : null,
      hold: row.onHold ? { scope: "all", reason: "Three reversals in 30 days, under review", placedAt: ago(24 * 6) } : null,
    },
    wallets: [{ currency, balanceMinor: between(80, 400) * unit, amount: (between(80, 400) * unit) / (currency === "XOF" ? 1 : 100) }],
    lastSevenDays: [{ currency, count: between(20, 80), amountMinor: between(200, 900) * unit }],
    cashOuts: outs.map((x) => ({ id: x.id, txRef: x.txRef, status: x.status, customer: x.from ? { id: x.from.id, name: x.from.name, phone: x.from.phone ?? "" } : null, currency: x.currency, amountMinor: x.amountMinor, feeMinor: Math.round(x.amountMinor * 0.01), at: x.createdAt })),
    cashIns: ins.map((x) => ({ id: x.id, txRef: x.txRef, status: x.status, customer: x.to ? { id: x.to.id, name: x.to.name, phone: x.to.phone ?? "" } : null, currency: x.currency, amountMinor: x.amountMinor, at: x.createdAt })),
    commissionDays: Array.from({ length: 7 }, (_, d) => ({
      day: day(d + 1), countedVolumeMinor: between(100, 600) * unit, amountMinor: between(1, 6) * unit, clawbackMinor: d === 3 ? unit : 0, agentApproved: d > 0, currency,
    })),
    payouts: [
      { id: "p-old-1", periodStart: day(14), periodEnd: day(8), status: "paid", currency, netMinor: between(20, 60) * unit },
      { id: "p-old-2", periodStart: day(21), periodEnd: day(15), status: "paid", currency, netMinor: between(20, 60) * unit },
    ],
    signIns: [
      { id: "si1", result: "success", ip: "41.223.•••.•••", device: "Tecno Spark 10", at: ago(3) },
      { id: "si2", result: "failed", ip: "41.223.•••.•••", device: "Tecno Spark 10", at: ago(3.1) },
      { id: "si3", result: "success", ip: "41.223.•••.•••", device: "Tecno Spark 10", at: ago(27) },
    ],
    otherActivity: [],
    today: day(0),
  };
}

// ---- Holds, reversals, payouts ----

export const holds: HoldRow[] = [
  {
    user: { id: "c5", name: "Kaddy Touray", phone: customerRows[4]!.phone, role: "user" }, active: true, scope: "requests", reason: "Payment request reported as a scam by the payer",
    placedBy: "s2", placedAt: ago(30), liftRequestedBy: "s2", liftRequestedAt: ago(4), liftReason: "Spoke to both people: it was a real debt between family. Payer withdrew the report.",
    placedByName: "Ousman Bah", liftRequestedByName: "Ousman Bah",
  },
  {
    user: { id: "c14", name: "Pa Modou Faye", phone: customerRows[13]!.phone, role: "user" }, active: true, scope: "all", reason: "Fraud alert: money passed straight on to six new people",
    placedBy: "s3", placedAt: ago(52), liftRequestedBy: null, liftRequestedAt: null, liftReason: null, placedByName: "Aminata Sow", liftRequestedByName: null,
  },
  {
    user: { id: "a9", name: "Alagie Bojang", phone: agentRows[8]!.phone, role: "agent" }, active: true, scope: "all", reason: "Three reversals in 30 days, under review",
    placedBy: "s4", placedAt: ago(24 * 6), liftRequestedBy: null, liftRequestedAt: null, liftReason: null, placedByName: "Lamin Jatta", liftRequestedByName: null,
  },
];

export const reversals: Reversal[] = [
  {
    id: "r1", kind: "cash_out", target_id: "x7", tx_ref: txRows[6]!.txRef, agent_id: "a1", requester_id: null, customer_id: "c7", amount: { amount: 150_000, currency: "GMD" }, occurred_at: ago(20),
    reason: "CASH_NOT_GIVEN", note: "Customer says the agent took the code but said the till was empty. Agent agrees, no cash was handed over.", status: "pending", requested_by: "s2", approved_by: [], blocked_reason: null, clawback: { amount: 0, currency: "GMD" }, completed_at: null,
  },
  {
    id: "r2", kind: "payment_request", target_id: "pr3", tx_ref: null, agent_id: null, requester_id: "c5", customer_id: "c12", amount: { amount: 4_000, currency: "GBP" }, occurred_at: ago(50),
    reason: "SCAM_REPORTED", note: "Payer reported the request as a scam. Requester could not explain what it was for when called.", status: "pending", requested_by: "s4", approved_by: [], blocked_reason: null, clawback: { amount: 0, currency: "GBP" }, completed_at: null,
  },
  {
    id: "r3", kind: "cash_in", target_id: "x16", tx_ref: txRows[15]!.txRef, agent_id: "a6", requester_id: null, customer_id: "c16", amount: { amount: 9825, currency: "XOF" }, occurred_at: ago(24 * 5),
    reason: "DUPLICATE", note: "Agent pressed confirm twice on a slow connection. Customer received the money twice and agreed to the reversal.", status: "completed", requested_by: "s4", approved_by: [{ id: "s5", at: ago(24 * 4) }], blocked_reason: null, clawback: { amount: 0, currency: "XOF" }, completed_at: ago(24 * 4),
  },
  {
    id: "r4", kind: "cash_out", target_id: "x27", tx_ref: txRows[26]!.txRef, agent_id: "a9", requester_id: null, customer_id: "c6", amount: { amount: 300_000, currency: "GMD" }, occurred_at: ago(24 * 8),
    reason: "AGENT_FRAUD", note: "Agent asked the customer for an extra GMD 500 in cash. Third report this month.", status: "blocked", requested_by: "s2", approved_by: [{ id: "s3", at: ago(24 * 7) }], blocked_reason: "The agent's balance is too low. A debt case was opened.", clawback: { amount: 0, currency: "GMD" }, completed_at: null,
  },
];

const payout = (i: number, status: Payout["status"], approvals: string[] = []): Payout => {
  const a = agentRows[i]!;
  const currency = agentCurrency(a);
  const unit = currency === "XOF" ? 655 : 100;
  const gross = between(150, 600) * unit;
  const claw = i === 2 ? 20 * unit : 0;
  return {
    id: `p${i + 1}`, agent: { id: a.id, business_name: a.businessName }, country: a.country, period_start: day(7), period_end: day(1), days_earned: between(4, 7),
    cashout_count: between(30, 120), cashin_count: between(20, 90), gross: { amount: gross, currency }, clawbacks: { amount: claw, currency }, net: { amount: gross - claw, currency },
    status, fraud_check: i === 2 ? { status: "flagged", flags: ["High share of cash outs from one customer"] } : { status: "clear", flags: [] },
    approved_by: approvals.map((id) => ({ id, at: ago(3) })),
    history: [{ action: "created", by: "system", at: ago(20) }, ...approvals.map((id) => ({ action: "approved", by: id, at: ago(3) }))],
    paid_at: status === "paid" ? ago(24 * 6) : null,
  };
};
export const payouts: Payout[] = [payout(0, "in_review"), payout(1, "in_review", ["s5"]), payout(2, "held"), payout(3, "in_review"), payout(4, "in_review"), payout(5, "paid", ["s5", "s1"])];

// ---- Purchases to check, reported requests ----

export const stuck: StuckPurchase[] = [
  {
    id: "x5", type: "airtime", amount: 150, currency: "GMD", fee: 0, txRef: txRows[4]!.txRef, providerReference: "RL-4482190", providerTransactionId: "8812331", biller: "Africell Gambia", target: "+220 7•••4412",
    reviewReason: "The provider took the money but did not confirm the top-up within 30 minutes.", country: "GM", refundAsk: null, createdAt: ago(5), customer: { id: "c1", name: "Awa Ceesay", phone: customerRows[0]!.phone },
  },
  {
    id: "x95", type: "bill", amount: 2400, currency: "GMD", fee: 25, txRef: "SPB7Q2K1M9", providerReference: "RL-4471002", providerTransactionId: "8810091", biller: "NAWEC electricity", target: "Meter •••7781",
    reviewReason: "Provider answered 'pending' for over 2 hours; no token sent to the customer.", country: "GM", refundAsk: { requestedBy: "s2", requestedAt: ago(1.5), reason: "Provider confirmed in writing the token was never issued." }, createdAt: ago(3), customer: { id: "c10", name: "Lamin Touray", phone: customerRows[9]!.phone },
  },
  {
    id: "x96", type: "bill", amount: 15000, currency: "XOF", fee: 0, txRef: "SPC81LZQ0A", providerReference: "RL-4469955", providerTransactionId: "8809004", biller: "Senelec électricité", target: "Compteur •••0912",
    reviewReason: "The provider's answer could not be read.", country: "SN", refundAsk: null, createdAt: ago(9), customer: { id: "c20", name: "Cheikh Ndiaye", phone: customerRows[19]!.phone },
  },
];

export const reported: ReportedRequest[] = [
  { _id: "pr3", requester: { _id: "c5", name: "Kaddy Touray", phone: customerRows[4]!.phone, accountHold: { active: true, scope: "requests" } }, payer: { _id: "c12", name: "Omar Jallow", phone: customerRows[11]!.phone }, amount: 40, currency: "GBP", note: "For the phone", status: "paid", reportedAt: ago(48), reportReason: "I don't know this person", createdAt: ago(60), paidAt: ago(59) },
  { _id: "pr4", requester: { _id: "c8", name: "Alieu Sowe", phone: customerRows[7]!.phone }, payer: { _id: "c2", name: "Modou Sanneh", phone: customerRows[1]!.phone }, amount: 25, currency: "GBP", note: "Football tickets", status: "pending", reportedAt: ago(7), reportReason: "Asked for money I never agreed to", createdAt: ago(9) },
];

// ---- Cases ----

const fraud = (i: number, rule: string, cust: number, hours: number, status: "open" | "closed" = "open", escalated = false): ComplianceCaseRow => {
  const c = customerRows[cust - 1]!;
  return {
    id: `k${i}`, type: "fraud_alert", status, agent: null, customer: { id: c.id, name: c.name, phone: c.phone }, reversal: null, currency: custCurrency(c),
    amountMinor: amountFor("send-money", custCurrency(c)) * 6,
    note: rule === "pass_through" ? "Received GMD 45,000.00 and sent 92% of it on within 40 minutes to six people." : rule === "shared_device" ? "Four accounts signed in from the same phone this week." : "Found by the automatic checks.",
    rule, outcome: status === "closed" ? "no_fraud" : null, escalatedAt: escalated ? ago(hours - 1) : null, escalatedBy: escalated ? mini("s3") : null, escalateNote: escalated ? "Looks like a money mule pattern. Hold placed." : "",
    createdAt: ago(hours), closedBy: status === "closed" ? mini("s3") : null, closedAt: status === "closed" ? ago(hours - 3) : null, closeNote: status === "closed" ? "Family sending for a wedding, receipts seen." : "",
  };
};
export const cases: ComplianceCaseRow[] = [
  fraud(1, "pass_through", 14, 53, "open", true),
  fraud(2, "many_recipients", 2, 6),
  fraud(3, "new_account_big", 24, 11),
  fraud(4, "shared_device", 19, 20),
  fraud(5, "wrong_pins", 7, 2),
  fraud(6, "big_day", 3, 24 * 4, "closed"),
  {
    id: "k7", type: "agent_debt", status: "open", agent: { id: "a9", name: "Lamin Village Shop", phone: agentRows[8]!.phone }, customer: null, reversal: "r4", currency: "GMD", amountMinor: 300_000,
    note: "Reversal refused: agent balance GMD 410.00, needed GMD 3,000.00.", createdAt: ago(24 * 7), closedBy: null, closedAt: null, closeNote: "",
  },
  {
    id: "k8", type: "reversal_alert", status: "open", agent: { id: "a9", name: "Lamin Village Shop", phone: agentRows[8]!.phone }, customer: null, reversal: null, currency: null, amountMinor: null,
    note: "Three reversals against this agent in 30 days.", createdAt: ago(24 * 6), closedBy: null, closedAt: null, closeNote: "",
  },
];

// ---- Countries and services ----

const country = (code: string, name: string, enabled: boolean, licence: CountryRow["licence"]): CountryRow => ({
  code, name, enabled, licence, pendingOn: null, updatedAt: ago(24 * 30),
  history: enabled ? [{ enabled: true, reason: "Launch", changedBy: { _id: "s3", name: "Aminata Sow" }, requestedBy: { _id: "s1", name: "Fatou Ceesay" }, changedAt: ago(24 * 90) }] : [],
});
export const countries: CountryRow[] = [
  country("GB", "United Kingdom", true, { status: "own", holder: "Sunu Pay Limited", reference: "FCA small EMI (applied)", note: "", recordedAt: ago(24 * 90), recordedBy: { _id: "s3", name: "Aminata Sow" } }),
  country("GM", "The Gambia", true, { status: "partner", holder: "Partner bank (demo)", reference: "CBG/PSP/DEMO", note: "", recordedAt: ago(24 * 90), recordedBy: { _id: "s3", name: "Aminata Sow" } }),
  country("SN", "Senegal", true, { status: "partner", holder: "Partner EMI (demo)", reference: "BCEAO/DEMO", note: "", recordedAt: ago(24 * 60), recordedBy: { _id: "s3", name: "Aminata Sow" } }),
  country("GN", "Guinea", false, { status: "none", holder: "", reference: "", note: "" }),
  country("GW", "Guinea-Bissau", false, { status: "none", holder: "", reference: "", note: "" }),
  country("SL", "Sierra Leone", false, { status: "none", holder: "", reference: "", note: "" }),
  country("ML", "Mali", false, { status: "none", holder: "", reference: "", note: "" }),
];
countries[3]!.pendingOn = null;

export const services: ServiceSwitchRow[] = [];
for (const c of ["GB", "GM", "SN", "GN", "GW", "SL", "ML"]) {
  for (const [service] of SERVICE_NAMES) {
    const on = ["GB", "GM", "SN"].includes(c);
    const notHere: ServiceName[] = c === "GB" ? ["cash_in", "cash_out", "airtime", "data", "bills"] : [];
    const state = !on || notHere.includes(service) ? "off" : c === "SN" && service === "data" ? "paused" : "on";
    services.push({
      country: c, service, state, reason: state === "paused" ? "Provider maintenance until Friday" : state === "off" && on ? "Not offered in this country" : "",
      pendingOn: c === "SN" && service === "bank_transfer" ? null : null, history: [],
    });
  }
}
const pendingService = services.find((s) => s.country === "SN" && s.service === "data");
if (pendingService) pendingService.pendingOn = { requestedBy: "s2", requestedByName: "Ousman Bah", requestedAt: ago(1), reason: "Provider says maintenance finished early." };

// ---- Messages to customers ----

export const announcements: Announcement[] = [
  {
    id: "an1", titleEn: "Tabaski: send early", titleFr: "Tabaski : envoyez tôt", bodyEn: "Agents close early on Tabaski. Send before Friday so your family gets cash in time.",
    bodyFr: "Les agents ferment tôt pour la Tabaski. Envoyez avant vendredi pour que votre famille reçoive l'argent à temps.", country: "GM", audience: "user", startsAt: ahead(24), endsAt: ahead(24 * 4),
    state: "waiting", createdBy: "s2", createdByName: "Ousman Bah", createdAt: ago(2), approvedByName: "", approvedAt: null, withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
  },
  {
    id: "an2", titleEn: "New: pay NAWEC in the app", titleFr: "Nouveau : payez NAWEC dans l'app", bodyEn: "Buy electricity tokens in seconds from Pay bills.", bodyFr: "Achetez vos codes d'électricité en quelques secondes dans Payer des factures.",
    country: "GM", audience: "all", startsAt: ago(24 * 3), endsAt: ahead(24 * 10), state: "live", createdBy: "s1", createdByName: "Fatou Ceesay", createdAt: ago(24 * 4), approvedByName: "Aminata Sow", approvedAt: ago(24 * 3.5), withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
  },
  {
    id: "an3", titleEn: "Agents: weekly payout on Monday", titleFr: "Agents : paiement hebdomadaire le lundi", bodyEn: "Your commission is paid every Monday after approval.", bodyFr: "Votre commission est payée chaque lundi après validation.",
    country: "", audience: "agent", startsAt: ago(24 * 30), endsAt: ago(24 * 10), state: "ended", createdBy: "s4", createdByName: "Lamin Jatta", createdAt: ago(24 * 31), approvedByName: "Fatou Ceesay", approvedAt: ago(24 * 30), withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
  },
];

export const offerCards: OfferCard[] = [
  {
    id: "oc1", titleEn: "Banjul Beach Festival", titleFr: "Festival de la plage de Banjul", bodyEn: "Tickets on sale now in the app.", bodyFr: "Billets en vente dans l'app.", sponsored: false, sponsorName: "", country: "GM", art: "sunset",
    imageUrl: "", eventDate: ahead(24 * 19), action: "tickets", eventId: "ev1", startsAt: ago(24 * 2), endsAt: ahead(24 * 19), state: "live", createdBy: "s1", createdByName: "Fatou Ceesay", createdAt: ago(24 * 3), approvedByName: "Aminata Sow", withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
  },
  {
    id: "oc2", titleEn: "Invite a friend, both get GBP 5", titleFr: "Invitez un ami, 5 GBP chacun", bodyEn: "When your friend sends their first GBP 50.", bodyFr: "Quand votre ami envoie ses premiers 50 GBP.", sponsored: false, sponsorName: "", country: "GB", art: "ocean",
    imageUrl: "", eventDate: null, action: "invite", eventId: null, startsAt: ahead(24), endsAt: ahead(24 * 30), state: "waiting", createdBy: "s2", createdByName: "Ousman Bah", createdAt: ago(5), approvedByName: "", withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
  },
];

// ---- Event tickets ----

const tier = (id: string, nameEn: string, nameFr: string, major: number, capacity: number, sold: number, extra: Partial<TicketTier> = {}): TicketTier => ({
  id, nameEn, nameFr, priceMinor: major * 100, capacity, sold, salesStartAt: null, salesEndAt: null, maxPerPerson: null, closed: false, ...extra,
});
const event = (over: Partial<TicketEvent> & Pick<TicketEvent, "id" | "titleEn" | "titleFr" | "state">): TicketEvent => ({
  aboutEn: "", aboutFr: "", venue: "", country: "GM", currency: "GMD", priceMinor: 0, feeMinor: 2_500, capacity: 0, sold: 0, checkedIn: 0, maxPerPerson: 6,
  startsAt: ahead(24 * 19), salesEndAt: ahead(24 * 19 - 2), organiserName: "Banjul Events (demo)", organiserPhone: "+2203077001", gateStaff: [{ name: "Gate 1", phone: "+2203077011" }, { name: "Gate 2", phone: "+2203077012" }],
  createdBy: "s1", createdByName: "Fatou Ceesay", createdAt: ago(24 * 10), approvedByName: "Aminata Sow", cancelledByName: "", cancelledAt: null, cancelReason: "", refunded: 0, refundsWaiting: 0,
  heldPriceMinor: 0, heldFeeMinor: 0, payoutState: "holding", payoutDueAt: ahead(24 * 21), paidOutAt: null, paidOutByName: "", payoutPriceMinor: null, payoutFeeMinor: null, featured: false, pendingEdit: null, editedBy: null,
  ...over,
});
export const ticketEvents: TicketEvent[] = [
  event({
    id: "ev1", titleEn: "Banjul Beach Festival", titleFr: "Festival de la plage de Banjul", state: "on_sale", featured: true, venue: "Kololi Beach", aboutEn: "Live music from 4pm to midnight. Food stalls, family area until 8pm.",
    aboutFr: "Musique live de 16h à minuit. Stands de nourriture, espace famille jusqu'à 20h.",
    tiers: [
      tier("tr1", "Early bird", "Prévente", 400, 300, 300, { salesEndAt: ago(24 * 2), maxPerPerson: 4 }),
      tier("tr2", "Standard", "Standard", 600, 1200, 643, { maxPerPerson: 6 }),
      tier("tr3", "VIP", "VIP", 1500, 150, 88, { maxPerPerson: 2 }),
      tier("tr4", "Table of 8", "Table de 8", 10000, 20, 20, { maxPerPerson: 1, closed: true }),
    ],
    priceMinor: 40_000, capacity: 1670, sold: 1051, heldPriceMinor: 83_780_000, heldFeeMinor: 1051 * 2_500,
    pendingEdit: {
      changes: { tiers: [tier("tr1", "Early bird", "Prévente", 400, 300, 300), tier("tr2", "Standard", "Standard", 600, 1400, 643), tier("tr3", "VIP", "VIP", 1500, 150, 88), tier("tr4", "Table of 8", "Table de 8", 10000, 20, 20, { closed: true })] },
      reason: "Venue confirmed 200 more standard places.", by: "s2", byName: "Ousman Bah", at: ago(2),
    },
  }),
  event({
    id: "ev2", titleEn: "Dakar Jazz Night", titleFr: "Nuit du jazz de Dakar", state: "waiting", country: "SN", currency: "XOF", feeMinor: 500, venue: "Institut français, Dakar", organiserName: "Jazz Dakar (demo)", organiserPhone: "+221770000999",
    tiers: [tier("tr5", "Standard", "Standard", 0, 400, 0, { priceMinor: 10_000 }), tier("tr6", "Front rows", "Premiers rangs", 0, 60, 0, { priceMinor: 25_000, maxPerPerson: 2 })],
    priceMinor: 10_000, capacity: 460, startsAt: ahead(24 * 33), salesEndAt: ahead(24 * 33 - 3), createdBy: "s3", createdByName: "Aminata Sow", approvedByName: "",
  }),
  event({
    id: "ev3", titleEn: "Independence Day Concert", titleFr: "Concert de la fête de l'indépendance", state: "over", venue: "Independence Stadium, Bakau", startsAt: ago(24 * 9), salesEndAt: ago(24 * 9 + 2),
    tiers: [tier("tr7", "Standard", "Standard", 300, 2000, 1874)], priceMinor: 30_000, capacity: 2000, sold: 1874, checkedIn: 1702, refunded: 6,
    heldPriceMinor: 1868 * 30_000, heldFeeMinor: 1868 * 2_500, payoutState: "due", payoutDueAt: ago(24 * 2),
  }),
];
export const eventTicketRows: EventTicketRow[] = Array.from({ length: 14 }, (_, i) => {
  const owner = customerRows[(i * 5) % 16]!;
  const buyer = i % 4 === 1 ? customerRows[(i * 5 + 1) % 16]! : owner;
  const status = i === 3 ? "refunded" : i % 6 === 5 ? "used" : "valid";
  return {
    id: `et${i + 1}`, number: `BBF-${String(4100 + i * 37)}`, status, ownerName: owner.name, ownerPhone: owner.phone, buyerName: buyer.name, buyerPhone: buyer.phone, beingSent: i === 7,
    priceMinor: i % 5 === 2 ? 150_000 : 60_000, feeMinor: 2_500, currency: "GMD", boughtAt: ago(24 * (i + 1)), usedAt: status === "used" ? ago(2) : null,
    refundedAt: status === "refunded" ? ago(24 * 2) : null, refundedByName: status === "refunded" ? "Ousman Bah" : "", feeRefunded: false, refundReason: status === "refunded" ? "Bought the wrong ticket type" : "",
  };
});

// ---- Blocklist ----

export const blockEntries: BlockEntry[] = [
  { id: "b1", type: "phone", masked: "+220 •••• 9921", reason: "MONEY_MULE", note: "Received money from 12 new accounts in two days, passed it on to one number.", state: "blocked", addedBy: "s3", addedByName: "Aminata Sow", addedAt: ago(24 * 20), unconfirmedUntil: null, confirmedByName: "Fatou Ceesay", confirmedAt: ago(24 * 19), removeAsk: null, removedByName: "", removedAt: null, removeReason: "", matches: 3, lastMatchAt: ago(24 * 2), lastMatchPlace: "sign-up" },
  { id: "b2", type: "id_document", masked: "Passport •••• 4471", reason: "STOLEN_IDENTITY", note: "Owner reported the passport stolen; police reference on the ticket.", state: "blocked", addedBy: "s2", addedByName: "Ousman Bah", addedAt: ago(24 * 45), unconfirmedUntil: null, confirmedByName: "Aminata Sow", confirmedAt: ago(24 * 44), removeAsk: null, removedByName: "", removedAt: null, removeReason: "", matches: 0, lastMatchAt: null, lastMatchPlace: "" },
  { id: "b3", type: "device", masked: "Android •••• 7c1e", reason: "CONFIRMED_FRAUD", note: "Phone used to open four accounts with different names.", state: "unconfirmed", addedBy: "s4", addedByName: "Lamin Jatta", addedAt: ago(6), unconfirmedUntil: ahead(66), confirmedByName: "", confirmedAt: null, removeAsk: null, removedByName: "", removedAt: null, removeReason: "", matches: 1, lastMatchAt: ago(1), lastMatchPlace: "login" },
  { id: "b4", type: "email", masked: "s•••@example.com", reason: "IMPERSONATION", note: "Pretended to be Sunu Pay support in WhatsApp messages.", state: "blocked", addedBy: "s3", addedByName: "Aminata Sow", addedAt: ago(24 * 70), unconfirmedUntil: null, confirmedByName: "Ousman Bah", confirmedAt: ago(24 * 69), removeAsk: { requestedBy: "s2", requestedByName: "Ousman Bah", requestedAt: ago(8), reason: "Police confirmed a different person; the email owner is innocent." }, removedByName: "", removedAt: null, removeReason: "", matches: 0, lastMatchAt: null, lastMatchPlace: "" },
];
export const blockMatches: BlockMatch[] = [
  { id: "bm1", entryId: "b1", type: "phone", masked: "+220 •••• 9921", matches: 2, places: ["sign-up", "send-money"], customer: "Yusupha Manneh", firstAt: ago(24 * 3), lastAt: ago(24 * 2) },
  { id: "bm2", entryId: "b3", type: "device", masked: "Android •••• 7c1e", matches: 1, places: ["login"], customer: "Ndeye (new account)", firstAt: ago(1), lastAt: ago(1) },
];

// ---- Complaints ----

const complaint = (i: number, over: Partial<Complaint>): Complaint => {
  const c = customerRows[i % 20]!;
  const received = over.receivedAt ?? ago(24 * (i + 1));
  const days = (NOW - new Date(received).getTime()) / 86_400_000;
  return {
    id: `cp${i}`, number: 301 + i, status: "open", customer: { id: c.id, name: c.name, phone: c.phone }, complainantName: c.name, contact: c.phone, channel: "app", category: "service", country: (c.country as "GB" | "GM" | "SN"),
    summary: "", receivedAt: received, loggedBy: "Ousman Bah", acknowledgedAt: null, holdingAt: null, finalPromisedFor: null, closedAt: null, outcome: null, retainUntil: ahead(24 * 365 * 3),
    clock: { ackDue: new Date(new Date(received).getTime() + 3 * 86_400_000).toISOString(), finalDue: new Date(new Date(received).getTime() + 21 * 86_400_000).toISOString(), ackLate: days > 3 && !over.acknowledgedAt, finalLate: days > 21, holdingLate: false, dueSoon: days > 12 && days < 21, next: "ack" },
    history: [{ kind: "logged", by: "Ousman Bah", at: received, note: "" }],
    ...over,
  };
};
export const complaints: Complaint[] = [
  complaint(0, { summary: "Money sent to The Gambia took two days to arrive and nobody called back.", category: "payment", receivedAt: ago(20) }),
  complaint(1, { summary: "Charged a fee that was not shown before paying.", category: "fees", receivedAt: ago(24 * 5) }),
  complaint(2, { summary: "Agent was rude and refused to give cash.", category: "service", channel: "phone", receivedAt: ago(24 * 14), acknowledgedAt: ago(24 * 13), clock: { ackDue: ago(24 * 11), finalDue: ahead(24 * 7), ackLate: false, finalLate: false, holdingLate: false, dueSoon: true, next: "final" }, history: [{ kind: "logged", by: "Ousman Bah", at: ago(24 * 14), note: "" }, { kind: "acknowledged", by: "Ousman Bah", at: ago(24 * 13), note: "Sent the acknowledgement letter by email." }] }),
  complaint(3, { summary: "Account held without explanation.", category: "emoney", receivedAt: ago(24 * 30), acknowledgedAt: ago(24 * 29), holdingAt: ago(24 * 10), finalPromisedFor: ahead(24 * 5), clock: { ackDue: ago(24 * 27), finalDue: ago(24 * 9), ackLate: false, finalLate: false, holdingLate: false, dueSoon: false, next: "final" } }),
  complaint(4, { summary: "Card top-up taken twice.", category: "payment", status: "closed", receivedAt: ago(24 * 40), acknowledgedAt: ago(24 * 39), closedAt: ago(24 * 33), outcome: "upheld", clock: { ackDue: ago(24 * 37), finalDue: ago(24 * 19), ackLate: false, finalLate: false, holdingLate: false, dueSoon: false, next: null } }),
];
