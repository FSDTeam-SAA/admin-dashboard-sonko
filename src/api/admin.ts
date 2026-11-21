// The admin server routes the pages use. Each money, hold or settings action
// takes an idempotency key (one per dialog) and the staff member's own PIN.
import { api } from "./client";

export type Pagination = { page: number; limit: number; total: number; pages: number };
export type Person = { name: string; phone: string; role?: string };

// ---- Reported payment requests ----

export type ReportedRequest = {
  _id: string;
  requester: { _id: string; name?: string; username?: string; phone?: string; accountHold?: { active?: boolean; scope?: "requests" | "all" } } | null;
  payer: { _id: string; name?: string; username?: string; phone?: string } | null;
  amount: number;
  currency: string;
  note?: string;
  status: string;
  reportedAt: string;
  reportReason?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
};

export function reportedRequests(page: number) {
  return api<{ requests: ReportedRequest[]; totalText: string; pagination: Pagination }>(
    `/admin/reported-requests?page=${page}&limit=25`,
  );
}

// ---- Holds ----

export type HoldScope = "requests" | "all";

export type HoldRow = {
  user: { id: string; name: string; phone: string; role: string };
  active: true;
  scope: HoldScope;
  reason: string;
  placedBy: string | null;
  placedAt: string | null;
  liftRequestedBy: string | null;
  liftRequestedAt: string | null;
  liftReason: string | null;
  placedByName: string | null;
  liftRequestedByName: string | null;
};

export function holds(liftAsked: boolean, page: number) {
  return api<{ holds: HoldRow[]; pagination: Pagination }>(`/admin/holds?page=${page}&limit=25${liftAsked ? "&lift=asked" : ""}`);
}

const id = (value: string) => encodeURIComponent(value);

export function placeHold(userId: string, body: { scope: HoldScope; reason: string; payment_request_id?: string; pin: string }, key: string) {
  return api(`/admin/users/${id(userId)}/hold`, { method: "POST", body, idempotencyKey: key });
}

export function askToLift(userId: string, body: { reason: string; pin: string }, key: string) {
  return api(`/admin/users/${id(userId)}/hold/lift`, { method: "POST", body, idempotencyKey: key });
}

export function approveLift(userId: string, pin: string, key: string) {
  return api(`/admin/users/${id(userId)}/hold/lift/approve`, { method: "POST", body: { pin }, idempotencyKey: key });
}

export function cancelLift(userId: string) {
  return api(`/admin/users/${id(userId)}/hold/lift/cancel`, { method: "POST", body: {} });
}

export type CustomerHit = { _id: string; name?: string; username?: string; phone?: string; role: string };

export function findCustomers(search: string) {
  return api<{ users: CustomerHit[] }>(`/admin/users?limit=10&search=${encodeURIComponent(search)}`);
}

// ---- Reversals and refunds ----

export type ReversalKind = "cash_out" | "cash_in" | "payment_request";
export type ReversalStatus = "pending" | "completed" | "blocked" | "cancelled";
export const REVERSAL_REASONS = [
  ["SCAM_REPORTED", "Reported as a scam"],
  ["CUSTOMER_FRAUD", "Customer fraud"],
  ["AGENT_FRAUD", "Agent fraud"],
  ["CASH_NOT_GIVEN", "Cash not given"],
  ["WRONG_AMOUNT", "Wrong amount"],
  ["DUPLICATE", "Done twice by mistake"],
] as const;
export type ReversalReason = (typeof REVERSAL_REASONS)[number][0];
export const NOTE_MIN = 20;
export const NOTE_MAX = 1000;

export type Reversal = {
  id: string;
  kind: ReversalKind;
  target_id: string;
  tx_ref: string | null;
  agent_id: string | null;
  requester_id: string | null;
  customer_id: string;
  amount: { amount: number; currency: string };
  occurred_at: string;
  reason: ReversalReason;
  note: string;
  status: ReversalStatus;
  requested_by: string;
  approved_by: { id: string; at: string }[];
  blocked_reason: string | null;
  clawback: { amount: number; currency: string };
  completed_at: string | null;
};

export function reversals(status: ReversalStatus, page: number) {
  return api<{ reversals: Reversal[]; people: Record<string, Person>; pagination: Pagination }>(
    `/admin/reversals?status=${status}&page=${page}&limit=25`,
  );
}

type AskBody = { reason: ReversalReason; note: string; pin: string };

const ASK_PATH: Record<ReversalKind, string> = {
  cash_out: "cashouts",
  cash_in: "cashins",
  payment_request: "payment-requests",
};

/** One person asks; a different person must approve (approveReversal). */
export function askReversal(kind: ReversalKind, targetId: string, body: AskBody, key: string) {
  const action = kind === "payment_request" ? "refund" : "reverse";
  return api<Reversal>(`/admin/${ASK_PATH[kind]}/${id(targetId)}/${action}`, { method: "POST", body, idempotencyKey: key });
}

export function approveReversal(reversalId: string, pin: string, key: string) {
  return api<Reversal>(`/admin/reversals/${id(reversalId)}/approve`, { method: "POST", body: { pin }, idempotencyKey: key });
}

export function cancelReversal(reversalId: string, reason: string) {
  return api<Reversal>(`/admin/reversals/${id(reversalId)}/cancel`, { method: "POST", body: { reason } });
}

// ---- Agent commission payouts ----

export type PayoutStatus = "in_review" | "held" | "approved" | "paid" | "cancelled";
type Money = { amount: number; currency: string };

export type Payout = {
  id: string;
  agent: { id: string; business_name: string };
  country: string;
  period_start: string;
  period_end: string;
  days_earned: number;
  cashout_count: number;
  cashin_count: number;
  gross: Money;
  clawbacks: Money;
  net: Money;
  status: PayoutStatus;
  fraud_check: { status?: string; flags: string[] };
  approved_by: { id: string; at: string }[];
  history: { action: string; by: string; reason?: string; at: string }[];
  paid_at: string | null;
};

export const APPROVALS_NEEDED = 2;

export function payouts(status: PayoutStatus, page: number) {
  return api<{ payouts: Payout[]; people: Record<string, Person>; pagination: Pagination }>(
    `/admin/commission/payouts?status=${status}&page=${page}&limit=50`,
  );
}

export function approvePayout(payoutId: string, pin: string, key: string) {
  return api<Payout>(`/admin/commission/payouts/${id(payoutId)}/approve`, { method: "POST", body: { pin }, idempotencyKey: key });
}

export type BatchResult = { id: string; result: "paid" | "approved_once" | "refused"; message?: string };

export function approvePayoutBatch(ids: string[], pin: string, key: string) {
  return api<{ results: BatchResult[] }>(`/admin/commission/payouts/approve-batch`, { method: "POST", body: { ids, pin }, idempotencyKey: key });
}

export function holdPayout(payoutId: string, reason: string) {
  return api<Payout>(`/admin/commission/payouts/${id(payoutId)}/hold`, { method: "POST", body: { reason } });
}

export function releasePayout(payoutId: string, reason: string) {
  return api<Payout>(`/admin/commission/payouts/${id(payoutId)}/release`, { method: "POST", body: { reason } });
}

// ---- Cash out rates and fees (two-person changes) ----

export type Tier = { minVolumeMinor: number; minCustomers: number; amountMinor: number };

export type CashOutSettings = {
  country: string;
  currency: string;
  version: number;
  enabled: boolean;
  customerFeeBps: number;
  customerFeeFixedMinor: number;
  commissionTiers: Tier[];
  commissionTiersFromDay?: string | null;
  maxPerCashOutMinor: number;
  maxPerDayPerCustomerMinor: number;
  agentDailyCashOutMinor: number;
  maxPendingPerAgent: number;
  codeTtlSeconds: number;
  pendingTtlSeconds: number;
};

export const EDITABLE_FIELDS = [
  "enabled",
  "customerFeeBps",
  "customerFeeFixedMinor",
  "commissionTiers",
  "maxPerCashOutMinor",
  "maxPerDayPerCustomerMinor",
  "agentDailyCashOutMinor",
  "maxPendingPerAgent",
  "codeTtlSeconds",
  "pendingTtlSeconds",
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type SettingsSnapshot = Partial<Pick<CashOutSettings, EditableField>> & { version?: number };

export type SettingsChange = {
  id: string;
  country: string;
  status: "pending" | "approved" | "cancelled" | "expired" | "stale";
  baseVersion: number;
  changedFields: EditableField[];
  before: SettingsSnapshot;
  after: SettingsSnapshot;
  reason: string;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  expiresAt: string;
  createdAt: string;
};

export function cashOutSettings(country: string) {
  return api<{ settings: CashOutSettings; pendingChange: SettingsChange | null; people: Record<string, Person> }>(
    `/admin/settings/cash-out/${id(country)}`,
  );
}

export function settingsHistory(country: string, page: number) {
  return api<{ changes: SettingsChange[]; total: number; page: number; limit: number; people: Record<string, Person> }>(
    `/admin/settings/changes?country=${id(country)}&page=${page}&limit=25`,
  );
}

export function proposeSettings(country: string, body: { version: number; change: SettingsSnapshot; reason: string; pin: string }, key: string) {
  return api<SettingsChange>(`/admin/settings/cash-out/${id(country)}/changes`, { method: "POST", body, idempotencyKey: key });
}

export function approveSettings(changeId: string, pin: string, key: string) {
  return api(`/admin/settings/changes/${id(changeId)}/approve`, { method: "POST", body: { pin }, idempotencyKey: key });
}

export function cancelSettings(changeId: string, reason: string) {
  return api(`/admin/settings/changes/${id(changeId)}/cancel`, { method: "POST", body: { reason } });
}

// ---- Staff ----

export type StaffRow = {
  id: string;
  name: string;
  phone: string;
  role: string;
  fullAdmin: boolean;
  permissions: string[];
  twoStepSetUp: boolean;
  pendingRoleChange: { role: string; requestedBy: string; requestedAt: string } | null;
  pendingPermissionsChange: { full: boolean; permissions: string[]; requestedBy: string; requestedAt: string } | null;
};

export function staffList() {
  return api<{ staff: StaffRow[]; people: Record<string, Person> }>(`/admin/staff`);
}

/** Same call to ask and (by a different person) to approve. */
export function changeRole(userId: string, role: "user" | "agent" | "admin", pin: string) {
  return api(`/admin/users/${id(userId)}/role`, { method: "PATCH", body: { role, pin } });
}

export function cancelRoleChange(userId: string) {
  return api(`/admin/users/${id(userId)}/role-change`, { method: "DELETE" });
}

/** Same call to ask and (by a different person) to approve. */
export function changePermissions(userId: string, change: { full: true } | { permissions: string[] }, pin: string, key: string) {
  return api(`/admin/users/${id(userId)}/permissions`, { method: "PUT", body: { ...change, pin }, idempotencyKey: key });
}

export function cancelPermissionsChange(userId: string) {
  return api(`/admin/users/${id(userId)}/permissions-change`, { method: "DELETE" });
}

export function resetTwoStep(userId: string, pin: string) {
  return api(`/admin/users/${id(userId)}/2fa/reset`, { method: "POST", body: { pin } });
}

// ---- Exchange rates and the wallet transfer fee (two-person changes) ----

export const RATE_CURRENCIES = ["GBP", "GHS", "XOF", "NGN"] as const;
export type RateCurrency = (typeof RATE_CURRENCIES)[number];

export type RateSettings = {
  version: number;
  /** Units of each currency for 1 GMD. */
  ratesFromGmd: Record<RateCurrency, number>;
  sekPerEur: number;
  walletTransferFeeBps: number;
};

export type RateChangeBody = Partial<{ ratesFromGmd: Partial<Record<RateCurrency, number>>; sekPerEur: number; walletTransferFeeBps: number }>;

export type RateChange = Omit<SettingsChange, "country" | "changedFields" | "before" | "after"> & {
  changedFields: string[];
  before: RateSettings;
  after: RateSettings;
};

export function rateSettings() {
  return api<{ settings: RateSettings; pendingChange: RateChange | null; people: Record<string, Person> }>(`/admin/settings/rates`);
}

export function rateHistory(page: number) {
  return api<{ changes: RateChange[]; total: number; page: number; limit: number; people: Record<string, Person> }>(
    `/admin/settings/rates/changes?page=${page}&limit=25`,
  );
}

export function proposeRates(body: { version: number; change: RateChangeBody; reason: string; pin: string }, key: string) {
  return api<RateChange>(`/admin/settings/rates/changes`, { method: "POST", body, idempotencyKey: key });
}

export function approveRates(changeId: string, pin: string, key: string) {
  return api<RateChange>(`/admin/settings/rates/changes/${id(changeId)}/approve`, { method: "POST", body: { pin }, idempotencyKey: key });
}

export function cancelRates(changeId: string, reason: string) {
  return api<RateChange>(`/admin/settings/rates/changes/${id(changeId)}/cancel`, { method: "POST", body: { reason } });
}

// ---- Agents ----

export type AgentStatus = "pending" | "approved" | "rejected" | "suspended";

export type AgentRow = {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: AgentStatus;
  businessName: string;
  city: string;
  country: string;
  idChecked: boolean;
  onHold: boolean;
  holdScope: HoldScope | null;
  appliedAt: string;
  reviewedAt: string | null;
};

type Mini = { id: string; name: string; phone: string } | null;

export type AgentDetail = {
  agent: AgentRow & {
    email: string;
    fullName: string;
    businessAddress: string;
    nationalId: string;
    rejectionReason: string;
    reviewedBy: string | null;
    hold: { scope: HoldScope; reason: string; placedAt: string | null } | null;
  };
  wallets: { currency: string; balanceMinor: number; amount: number }[];
  lastSevenDays: { currency: string; count: number; amountMinor: number }[];
  cashOuts: { id: string; txRef: string; status: string; customer: Mini; currency: string; amountMinor: number; feeMinor: number; at: string }[];
  cashIns: { id: string; txRef: string; status: string; customer: Mini; currency: string; amountMinor: number; at: string }[];
  commissionDays: { day: string; countedVolumeMinor: number; amountMinor: number; clawbackMinor: number; agentApproved: boolean; currency: string }[];
  payouts: { id: string; periodStart: string; periodEnd: string; status: string; currency: string; netMinor: number }[];
  today: string;
};

export function agents(status: AgentStatus | "all", search: string, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (status !== "all") query.set("status", status);
  if (search.trim()) query.set("search", search.trim());
  return api<{ agents: AgentRow[]; pagination: Pagination }>(`/admin/agents?${query.toString()}`);
}

export function agent(agentId: string) {
  return api<AgentDetail>(`/admin/agents/${id(agentId)}`);
}

export function decideApplication(userId: string, body: { status: "approved" } | { status: "rejected"; rejectionReason: string }) {
  return api(`/admin/agent-applications/${id(userId)}`, { method: "PATCH", body });
}

// ---- Customers ----

export type CustomerFilter = "verified" | "unverified" | "held";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  role: string;
  country: string;
  idChecked: boolean;
  onHold: boolean;
  closed?: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
};

export type CustomerDetail = {
  customer: CustomerRow & {
    email: string;
    username: string;
    address: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
    receivingCurrency: string;
    /** Only a picture the customer chose. It is not proof of who they are. */
    profilePicture: string;
    verification: { identityVerifiedAt: string | null; addressVerifiedAt: string | null; nameOnId: string; country: string };
    hold: { scope: HoldScope; reason: string; placedAt: string | null } | null;
    /** Set when the account is closed. Older servers send nothing. */
    closed?: { at: string; via: "app" | "staff" | ""; reason: string; by: string } | null;
  };
  wallets: { currency: string; balanceMinor: number; amount: number }[];
  spend: { currency: string; count: number; amountMinor: number }[];
  transactions: {
    id: string;
    txRef: string;
    type: string;
    status: string;
    currency: string;
    amountMinor: number;
    description: string;
    direction: "in" | "out";
    otherParty: Person | null;
    at: string;
  }[];
  tickets: { id: string; number: number; subject: string; priority: TicketPriority; status: TicketStatus; createdAt: string }[];
  edits: { field: string; from: string; to: string; reason: string; by: string; requestedBy: string; at: string }[];
  pendingPhoneChange: { phone: string; reason: string; requestedBy: string; requestedByName: string; requestedAt: string } | null;
  /** Facts for the warning strip. Missing on an older server. */
  status?: { moneyOutPausedUntil: string | null; openCases: Partial<Record<"agent_debt" | "customer_debt" | "reversal_alert" | "blocklist_match", number>>; blockedPhones: number; openComplaints?: { open: number; late: number } };
  /** The phones they used lately, newest first. Missing on an older server. */
  devices?: CustomerDevice[];
  callerChecks: {
    questionsSet: boolean;
    questionsSetAt: string | null;
    /** Set when the latest check passed in the last 30 minutes. A later failed check cancels it. */
    verifiedUntil: string | null;
    /** The staff member the check counts for. Only they can ask for a phone or email change. */
    verifiedBy: string | null;
    verifiedByName: string | null;
    recent: { method: "code" | "questions"; passed: boolean; by: string; at: string }[];
  };
  recentlyOpenedBy: { staff: string; at: string }[];
};

export function customers(filter: CustomerFilter | "all", search: string, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (filter !== "all") query.set("filter", filter);
  if (search.trim()) query.set("search", search.trim());
  return api<{ customers: CustomerRow[]; pagination: Pagination }>(`/admin/customers?${query.toString()}`);
}

/** Opening a customer file is recorded on the server against the staff member. */
export function customer(customerId: string) {
  return api<CustomerDetail>(`/admin/customers/${id(customerId)}`);
}

// ---- Tickets ----

export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export const TICKET_CATEGORIES = [
  ["payment_failed", "Payment failed"],
  ["money_missing", "Money missing"],
  ["cash_out", "Cash out"],
  ["agent", "Agent"],
  ["id_check", "ID check"],
  ["login_or_pin", "Login or PIN"],
  ["fees_or_rates", "Fees or rates"],
  ["account", "Account"],
  ["other", "Other"],
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number][0];
/** Topics about one payment: the ticket must name the customer and the payment (the server checks too). */
export const PAYMENT_TOPICS: readonly TicketCategory[] = ["payment_failed", "money_missing", "cash_out"];
export type TicketPayment = {
  id: string;
  txRef: string;
  type: string;
  status: string;
  currency: string;
  amountMinor: number;
  description: string;
  direction: "in" | "out";
  otherParty: { id: string; name: string } | null;
  at: string;
};
export function ticketPayments(customerId: string) {
  return api<{ payments: TicketPayment[]; days: number }>(`/admin/tickets/payments?customer=${encodeURIComponent(customerId)}`);
}

type Named = { id: string; name: string } | null;

export type TicketRow = {
  id: string;
  number: number;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  customer: Named;
  assignedTo: Named;
  createdAt: string;
  resolvedAt: string | null;
  updatedAt?: string;
  overdue?: boolean;
  unassigned?: boolean;
};

export type TicketDetail = Omit<TicketRow, "customer" | "assignedTo"> & {
  detail: string;
  /** Wiped after six years of quiet: words gone, figures stay. */
  erased?: boolean;
  customer: Mini;
  /** The payment it is about. paymentLinked says one is linked; payment is null if this person may not see payments. */
  /** When it was given to the current person. */
  assignedAt?: string | null;
  paymentLinked?: boolean;
  payment?: TicketPayment | null;
  createdBy: Mini;
  assignedTo: Mini;
  notes: { by: Mini; text: string; at: string }[];
  history: { by: Mini; system?: boolean; field: string; from: string; to: string; at: string }[];
  /** Files kept past the six years (fraud, police, a dispute). null if none, or not shown to this person. */
  keep: TicketKeep | null;
  fileCount: number;
  /** null when this person may not see files (no ticket_files). */
  files: TicketFile[] | null;
};

export type TicketFile = {
  id: string;
  index: number;
  name: string;
  note: string;
  type: "image/jpeg" | "image/png" | "application/pdf";
  size: number;
  by: Mini;
  at: string;
  removed: boolean;
  /** Deleted automatically after six years. */
  expired?: boolean;
  removedAt: string | null;
  canRemove: boolean;
};

export type CaseType = "agent_debt" | "customer_debt" | "reversal_alert" | "safeguarding_shortfall" | "safeguarding_mismatch" | "fraud_alert";
export type ComplianceCaseRow = {
  id: string;
  type: CaseType | "blocklist_match";
  status: "open" | "closed";
  agent: Mini;
  customer: Mini;
  reversal: string | null;
  currency: string | null;
  amountMinor: number | null;
  note: string;
  /** fraud_alert: which rule matched. */
  rule?: string | null;
  createdAt: string;
  closedBy: Mini;
  closedAt: string | null;
  closeNote: string;
};

export function complianceCases(type: CaseType | "all", status: "open" | "closed", page: number) {
  const query = new URLSearchParams({ status, page: String(page), limit: "25" });
  if (type !== "all") query.set("type", type);
  return api<{ cases: ComplianceCaseRow[]; pagination: Pagination }>(`/admin/compliance-cases?${query.toString()}`);
}

export function closeComplianceCase(caseId: string, note: string) {
  return api(`/admin/compliance-cases/${id(caseId)}/close`, { method: "POST", body: { note } });
}

export type TicketKeep = {
  until: string;
  reason: string;
  by: Mini;
  at: string;
  ask: { action: "change" | "end"; until: string | null; reason: string; by: Mini; at: string } | null;
};

/** One person: keep every file on the ticket until [until] (at most 10 years). */
export function keepTicketFiles(ticketId: string, body: { until: string; reason: string; pin: string }, key: string) {
  return api(`/admin/tickets/${id(ticketId)}/keep`, { method: "POST", body, idempotencyKey: key });
}

/** Two people: the first asks, a different one approves the same change. */
export function changeKeepTicketFiles(ticketId: string, body: { action: "change" | "end"; until?: string; reason?: string; pin: string }, key: string) {
  return api<{ asked: boolean }>(`/admin/tickets/${id(ticketId)}/keep/change`, { method: "POST", body, idempotencyKey: key });
}

export function cancelKeepAsk(ticketId: string) {
  return api(`/admin/tickets/${id(ticketId)}/keep/change`, { method: "DELETE" });
}

export type TicketFilters = { status: TicketStatus | "active" | "all"; priority: TicketPriority | "all"; mine: boolean; search: string; customer?: string; sort?: "urgent" | "newest"; unassigned?: boolean };

export function tickets(filters: TicketFilters, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.priority !== "all") query.set("priority", filters.priority);
  if (filters.mine) query.set("assignedTo", "me");
  else if (filters.unassigned) query.set("assignedTo", "none");
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.customer) query.set("customer", id(filters.customer));
  if (filters.sort === "urgent") query.set("sort", "urgent");
  return api<{ tickets: TicketRow[]; pagination: Pagination }>(`/admin/tickets?${query.toString()}`);
}

export function ticket(ticketId: string) {
  return api<TicketDetail>(`/admin/tickets/${id(ticketId)}`);
}

export function openTicket(body: { subject: string; detail: string; priority: TicketPriority; category: TicketCategory; customer?: string; transaction?: string }, key: string) {
  return api<{ id: string; number: number }>(`/admin/tickets`, { method: "POST", body, idempotencyKey: key });
}

export function addTicketNote(ticketId: string, text: string, key: string) {
  return api(`/admin/tickets/${id(ticketId)}/notes`, { method: "POST", body: { text }, idempotencyKey: key });
}

export type NoteTranslation = { sameLanguage: boolean; text: string; target: "en" | "fr"; from?: string; partlyHidden?: boolean };

/** Translates one note for the reader. Nothing is saved; the note stays as written. */
export function translateTicketNote(ticketId: string, index: number, target: "en" | "fr") {
  return api<NoteTranslation>(`/admin/tickets/${id(ticketId)}/notes/${index}/translate`, { method: "POST", body: { target } });
}

/** Attach one evidence file (JPG, PNG or PDF, 5 MB at most) with a short note. */
export function attachTicketFile(ticketId: string, file: File, note: string, key: string) {
  const form = new FormData();
  form.append("note", note);
  form.append("file", file);
  return api(`/admin/tickets/${id(ticketId)}/files`, { method: "POST", form, idempotencyKey: key });
}

/** The file's bytes. The server always sends it as a download. */
export function ticketFile(ticketId: string, fileId: string) {
  return api<Blob>(`/admin/tickets/${id(ticketId)}/files/${id(fileId)}`, { asFile: true });
}

export function removeTicketFile(ticketId: string, fileId: string) {
  return api(`/admin/tickets/${id(ticketId)}/files/${id(fileId)}`, { method: "DELETE" });
}

export function changeTicket(ticketId: string, body: { priority?: TicketPriority; status?: TicketStatus; category?: TicketCategory; assignedTo?: string | null; transaction?: string }) {
  return api(`/admin/tickets/${id(ticketId)}`, { method: "PATCH", body });
}

export type TurnaroundMonth = { month: string; handled: number; averageHours: number };

export type TicketStats = {
  months: TurnaroundMonth[];
  thisMonth: TurnaroundMonth | null;
  lastMonth: TurnaroundMonth | null;
  openByPriority: { key: TicketPriority; count: number }[];
  byCategory: { key: TicketCategory; count: number }[];
};

export function ticketStats() {
  return api<TicketStats>(`/admin/tickets/stats`);
}

// ---- Analytics ----

export type Analytics = {
  totals: { customers: number; agents: number };
  activeCustomersLast30Days: number;
  months: { month: string; signups: number; volume: { currency: string; count: number; amountMinor: number }[] }[];
  usageLast90Days: { type: string; count: number }[];
  /** From the ledger. Older servers send nothing here. */
  revenue?: Revenue;
};

export type RevenueCell = { currency: string; feesMinor: number; commissionMinor: number; netMinor: number };

export type Revenue = {
  months: { month: string; currencies: RevenueCell[] }[];
  sourcesLast12Months: { currency: string; source: string; amountMinor: number; count: number }[];
};

export function analytics() {
  return api<Analytics>(`/admin/analytics`);
}

// ---- Audit trail ----

export type AuditKind = "login_pin" | "login_failed" | "login_complete" | "login_code_failed" | "action";

export type AuditEvent = {
  id: string;
  staff: { id: string; name: string };
  kind: AuditKind;
  method: string;
  route: string;
  targets: string[];
  status: number | null;
  ip: string;
  at: string;
};

export function auditTrail(kind: AuditKind | "all", staffId: string | null, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: "50" });
  if (kind !== "all") query.set("kind", kind);
  if (staffId) query.set("staff", staffId);
  return api<{ events: AuditEvent[]; pagination: Pagination }>(`/admin/audit?${query.toString()}`);
}

// ---- Services and countries ----

export type SwitchState = "on" | "paused" | "off";
export const SERVICE_NAMES = [
  ["send_money", "Send money"],
  ["request_money", "Payment requests"],
  ["cash_in", "Cash in (agents)"],
  ["cash_out", "Cash out (agents)"],
  ["add_money", "Add money (card top-up)"],
  ["airtime", "Airtime"],
  ["data", "Data bundles"],
  ["bills", "Bills (app and agent Pay Bills)"],
  ["bank_transfer", "Bank transfer"],
] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number][0];
export type LicenceStatus = "none" | "own" | "partner";
type StaffRef = { _id: string; name?: string; username?: string } | null;

export type CountryRow = {
  code: string;
  name: string;
  enabled: boolean;
  licence: { status: LicenceStatus; holder: string; reference: string; note: string; recordedAt?: string; recordedBy?: StaffRef };
  pendingOn: { requestedBy: StaffRef; requestedAt: string; reason: string } | null;
  updatedAt: string | null;
  history: { enabled: boolean; reason?: string; changedBy: StaffRef; requestedBy?: StaffRef; changedAt: string }[];
};

export type ServiceSwitchRow = {
  country: string;
  service: ServiceName;
  state: SwitchState;
  reason: string;
  pendingOn: { requestedBy: string; requestedByName: string; requestedAt: string; reason: string } | null;
  history: { state: SwitchState; reason: string; by: string; requestedBy: string; at: string }[];
};

export function countriesList() {
  return api<CountryRow[]>(`/admin/countries`);
}

/** Off at once. On needs a licence and a different staff member to approve (the same call). */
export function switchCountry(code: string, body: { enabled: boolean; reason: string; pin: string }) {
  return api<CountryRow>(`/admin/countries/${id(code)}`, { method: "PATCH", body });
}

export function cancelCountryOn(code: string) {
  return api(`/admin/countries/${id(code)}/switch-on`, { method: "DELETE" });
}

export function saveLicence(code: string, body: { status: LicenceStatus; holder: string; reference: string; note: string; pin: string }) {
  return api<CountryRow>(`/admin/countries/${id(code)}/licence`, { method: "PUT", body });
}

export function serviceSwitches() {
  return api<ServiceSwitchRow[]>(`/admin/services`);
}

/** Paused or off at once. On needs a different staff member to approve (the same call). */
export function switchService(country: string, service: ServiceName, body: { state: SwitchState; reason: string; pin: string }) {
  return api(`/admin/services/${id(country)}/${id(service)}`, { method: "PUT", body });
}

export function cancelServiceOn(country: string, service: ServiceName) {
  return api(`/admin/services/${id(country)}/${id(service)}/switch-on`, { method: "DELETE" });
}

// ---- Editing customers and checking callers ----

export type CustomerEditBody = {
  name?: string;
  email?: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
  reason: string;
  pin: string;
};

export function editCustomer(customerId: string, body: CustomerEditBody) {
  return api<{ changed: { field: string; from: string; to: string }[] }>(`/admin/customers/${id(customerId)}`, { method: "PATCH", body });
}

/** Two staff: the first call asks, the same call by someone else changes it. */
export function changeCustomerPhone(customerId: string, body: { phone: string; reason: string; pin: string }) {
  return api<{ asked?: boolean; done?: boolean }>(`/admin/customers/${id(customerId)}/phone`, { method: "PUT", body });
}

export function cancelCustomerPhoneChange(customerId: string) {
  return api(`/admin/customers/${id(customerId)}/phone-change`, { method: "DELETE" });
}

export function sendCallerCode(customerId: string) {
  return api<{ sentTo: string }>(`/admin/customers/${id(customerId)}/caller-check/code`, { method: "POST", body: {} });
}

export function checkCallerCode(customerId: string, code: string) {
  return api<{ passed: boolean }>(`/admin/customers/${id(customerId)}/caller-check/code/verify`, { method: "POST", body: { code } });
}

export type SecurityQuestion = { id: string; en: string; fr: string };

export function askCallerQuestions(customerId: string) {
  return api<{ checkId: string; questions: SecurityQuestion[] }>(`/admin/customers/${id(customerId)}/caller-check/questions`, { method: "POST", body: {} });
}

export function checkCallerAnswers(customerId: string, checkId: string, answers: Record<string, string>) {
  return api<{ passed: boolean }>(`/admin/customers/${id(customerId)}/caller-check/questions/${id(checkId)}`, { method: "POST", body: { answers } });
}

// ---- Bills and top-ups: purchases that need checking ----

export type StuckPurchase = {
  id: string;
  type: "airtime" | "bill";
  amount: number;
  currency: string;
  fee: number;
  txRef: string;
  providerReference: string;
  providerTransactionId: string;
  biller: string;
  /** The phone, meter or account number it was for. */
  target: string;
  reviewReason: string;
  country: string;
  /** Set when a refund above the country's limit is waiting for a second person. */
  refundAsk: { requestedBy: string; requestedAt: string; reason: string } | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string } | null;
};

export function stuckPurchases(page: number) {
  return api<{ transactions: StuckPurchase[]; totalText: string; pagination: Pagination }>(`/admin/needs-checking?page=${page}&limit=25`);
}

/** "successful": no refund. "failed": the customer is refunded once. */
export function decidePurchase(transactionId: string, body: { outcome: "successful" | "failed"; reason: string; pin: string }, key: string) {
  // Answers 202 { asked: true } when the refund needs a second person.
  return api<{ id: string; status: string } | { asked: true } | null>(`/admin/needs-checking/${id(transactionId)}`, { method: "PATCH", body, idempotencyKey: key });
}

export function cancelRefundAsk(transactionId: string) {
  return api(`/admin/needs-checking/${id(transactionId)}/refund-ask`, { method: "DELETE" });
}

// ---- Refund limits per country ----

export type RefundLimit = {
  country: string;
  currency: string;
  /** -1 while the first limit waits for approval: every refund needs two people. */
  limitMinor: number;
  pendingRaise: { limitMinor: number; currency: string; reason: string; requestedBy: string; requestedByName: string; requestedAt: string } | null;
  history: { limitMinor: number; currency: string; reason: string; by: string; at: string }[];
};

export function refundLimits() {
  return api<RefundLimit[]>("/admin/refund-limits");
}

/** Lowering saves at once; raising (or the first limit) answers { asked: true } until a second person approves. */
export function setRefundLimit(country: string, body: { amount: number; currency: string; reason: string; pin: string }, key: string) {
  return api<{ asked?: true; done?: true }>(`/admin/refund-limits/${id(country)}`, { method: "PUT", body, idempotencyKey: key });
}

export function cancelRefundLimitRaise(country: string) {
  return api(`/admin/refund-limits/${id(country)}/raise`, { method: "DELETE" });
}

// ---- Announcements ----

export type AnnouncementState = "waiting" | "scheduled" | "live" | "ended" | "withdrawn";
export type Announcement = {
  id: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string;
  bodyFr: string;
  country: string;
  audience: "all" | "user" | "agent";
  startsAt: string;
  endsAt: string;
  state: AnnouncementState;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  approvedByName: string;
  approvedAt: string | null;
  withdrawnByName: string;
  withdrawnAt: string | null;
  withdrawReason: string;
};
export type AnnouncementDraft = Pick<Announcement, "titleEn" | "titleFr" | "bodyEn" | "bodyFr" | "country" | "audience" | "startsAt" | "endsAt">;

export function announcements() {
  return api<Announcement[]>("/admin/announcements");
}

export function writeAnnouncement(draft: AnnouncementDraft, pin: string, key: string) {
  return api<{ id: string }>("/admin/announcements", { method: "POST", body: { ...draft, pin }, idempotencyKey: key });
}

export function approveAnnouncement(announcementId: string, pin: string, key: string) {
  return api(`/admin/announcements/${id(announcementId)}/approve`, { method: "POST", body: { pin }, idempotencyKey: key });
}

export function withdrawAnnouncement(announcementId: string, reason: string) {
  return api(`/admin/announcements/${id(announcementId)}/withdraw`, { method: "POST", body: { reason } });
}

// ---- Blocklist ----

export type BlockType = "phone" | "email" | "id_document" | "bank_account" | "device";
/** One of the phones a customer used, from their file. [device] is a keyed hash, not the phone's ID. */
export type CustomerDevice = { device: string; masked: string; lastSeenAt: string | null; blocked: boolean };
export type BlockReason = "CONFIRMED_FRAUD" | "MONEY_MULE" | "STOLEN_IDENTITY" | "IMPERSONATION" | "OTHER";
export type BlockState = "unconfirmed" | "blocked" | "expired" | "removed";
export type BlockEntry = {
  id: string;
  type: BlockType;
  masked: string;
  reason: BlockReason;
  note: string;
  state: BlockState;
  addedBy: string;
  addedByName: string;
  addedAt: string;
  unconfirmedUntil: string | null;
  confirmedByName: string;
  confirmedAt: string | null;
  removeAsk: { requestedBy: string; requestedByName: string; requestedAt: string; reason: string } | null;
  removedByName: string;
  removedAt: string | null;
  removeReason: string;
  matches: number;
  lastMatchAt: string | null;
  lastMatchPlace: string;
};
export type BlockMatch = {
  id: string;
  entryId: string;
  type: BlockType | "";
  masked: string;
  matches: number;
  places: string[];
  customer: string | null;
  firstAt: string;
  lastAt: string;
};

export function blocklist(all: boolean, page = 1) {
  return api<{ entries: BlockEntry[]; pagination: Pagination }>(`/admin/blocklist?all=${all ? "true" : "false"}&page=${page}`);
}

export function blocklistMatches() {
  return api<BlockMatch[]>("/admin/blocklist/matches");
}

/** POST, so the value is never in a web address or a log. */
export function lookUpBlock(type: BlockType, value: string) {
  return api<{ masked: string; entries: BlockEntry[] }>("/admin/blocklist/look-up", { method: "POST", body: { type, value } });
}

export function addBlock(entry: { type: BlockType; value: string; reason: BlockReason; note: string }, pin: string, key: string) {
  return api<{ id: string }>("/admin/blocklist", { method: "POST", body: { ...entry, pin }, idempotencyKey: key });
}

/** Blocks one of a customer's phones, picked from their file. Same 72-hour and two-person rules. */
export function blockCustomerDevice(
  entry: { customerId: string; device: string; reason: BlockReason; note: string },
  pin: string,
  key: string,
) {
  return api<{ id: string }>("/admin/blocklist", { method: "POST", body: { type: "device", ...entry, pin }, idempotencyKey: key });
}

export function confirmBlock(entryId: string, pin: string, key: string) {
  return api(`/admin/blocklist/${id(entryId)}/confirm`, { method: "POST", body: { pin }, idempotencyKey: key });
}

/** Returns { asked: true } when a second person must approve. */
export function removeBlock(entryId: string, reason: string, pin: string, key: string) {
  return api<{ asked?: boolean; removed?: boolean }>(`/admin/blocklist/${id(entryId)}/remove`, {
    method: "POST",
    body: { reason, pin },
    idempotencyKey: key,
  });
}

export function cancelBlockRemoveAsk(entryId: string) {
  return api(`/admin/blocklist/${id(entryId)}/remove`, { method: "DELETE" });
}

export function closeBlockMatch(caseId: string, note: string) {
  return api(`/admin/blocklist/matches/${id(caseId)}/close`, { method: "POST", body: { note } });
}

export type BackupCopy = { at: string; status: "completed" | "failed" | "inProgress" | "queued" | "unknown"; kind: "scheduled" | "on demand"; sizeBytes: number | null; expiresAt: string | null };
export type BackupLevel = "ok" | "warning" | "alert";
export type RestoreTestRow = { id: string; at: string; outcome: "worked" | "failed"; note: string; by: { name: string; phone: string; role: string } | null };
export type BackupStatus = {
  configured: boolean;
  level: BackupLevel;
  message: string;
  checkedAt: string;
  backups: { level: BackupLevel; message: string; newestAt: string | null; oldestAt: string | null; finishedCount: number; recent: BackupCopy[] } | null;
  restoreTests: { level: BackupLevel; message: string; lastAt: string | null; lastWorkedAt: string | null; recent: RestoreTestRow[] };
};

/** Read only: the server asks Atlas for the list of backups. */
export function backupStatus() {
  return api<BackupStatus>("/admin/backups");
}

export function recordRestoreTest(body: { outcome: "worked" | "failed"; note: string }, key: string) {
  return api("/admin/backups/restore-tests", { method: "POST", body, idempotencyKey: key });
}

// ---- Regulatory headroom ----

export type HeadroomLevel = "ok" | "warning" | "alert";
export type HeadroomSettings = {
  /** Countries left out of the payments count. Empty unless two people changed it. */
  excludedCountries: string[];
  /** A change one person asked for, waiting for a different person (24 hours). */
  pending: { countries: string[]; reason: string; by: string; byId: string; at: string } | null;
  changes: { from: string[]; to: string[]; reason: string; approveReason?: string; by: string; approvedBy: string; at: string }[];
};
export type Headroom = {
  asAt: string;
  level: HeadroomLevel;
  emoney: {
    limitEurMinor: number;
    windowMonths: number;
    daysCounted: number;
    averageEurMinor: number;
    ratio: number;
    level: HeadroomLevel;
    currentEurMinor: number;
    highestDay: { day: string | null; eurMinor: number };
    unpricedCurrencies: string[];
    currencies: { currency: string; minor: number; eurMinor: number }[];
  };
  payments: {
    limitEurMinor: number;
    windowMonths: number;
    activeMonths: number;
    averageEurMinor: number;
    averageIfNothingLeftOutEurMinor: number;
    ratio: number;
    level: HeadroomLevel;
    highestMonth: { month: string | null; eurMinor: number };
    unpricedPayments: number;
    months: { month: string; eurMinor: number; allEurMinor: number; count: number }[];
    countries: { country: string; eurMinor: number; count: number; excluded: boolean; noUkEndEurMinor?: number; noUkEndCount?: number }[];
    leftOut: string[];
    /** Payments left out because neither end is in the UK. Missing on an older server. */
    noUkEnd?: { eurMinor: number; count: number };
  };
  countedTypes: string[];
  settings: HeadroomSettings;
};

/** Senior staff only (view_headroom). Read only. */
export function headroom() {
  return api<Headroom>("/admin/headroom");
}

/** Same call to ask and (by a different person, same list) to approve. */
export function changeHeadroomCountries(countries: string[], reason: string, pin: string, key: string) {
  return api<{ asked?: boolean; done?: boolean; settings: HeadroomSettings }>("/admin/headroom/countries", {
    method: "PUT",
    body: { countries, reason, pin },
    idempotencyKey: key,
  });
}

export function cancelHeadroomCountriesChange() {
  return api<null>("/admin/headroom/countries/change", { method: "DELETE" });
}

// ---- Sales team ----

export type SalesRow = { id: string; name: string; code: string; active: boolean; signedUp: number; idChecked: number; qualified: number };
export type SalesReport = { from: string; until: string; minimumGmdMinor: number; salespeople: SalesRow[] };
export type SalesSettings = {
  minimumGmdMinor: number;
  /** A change one person asked for, waiting for a different person (24 hours). */
  pending: { toGmdMinor: number; reason: string; by: string; at: string } | null;
  changes: { fromGmdMinor: number; toGmdMinor: number; reason: string; by: string; approvedBy?: string; approveReason?: string; at: string }[];
};

function periodQuery(period?: { from: string; to: string }) {
  return period ? `?from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}` : "";
}

/** Every salesperson (view_sales). No period means this month so far. */
export function salesReport(period?: { from: string; to: string }) {
  return api<SalesReport>(`/admin/sales${periodQuery(period)}`);
}

/** Only the salesperson linked to this staff login (view_own_sales). */
export function mySales(period?: { from: string; to: string }) {
  return api<SalesReport>(`/admin/sales/mine${periodQuery(period)}`);
}

export function salesSettings() {
  return api<SalesSettings>(`/admin/sales/settings`);
}

/** Same call to ask and (by a different person, same amount) to approve. */
export function changeSalesMinimum(minimumGmd: number, reason: string, pin: string, key: string) {
  return api<{ asked?: boolean; done?: boolean; settings: SalesSettings }>(`/admin/sales/settings`, {
    method: "PUT",
    body: { minimumGmd, reason, pin },
    idempotencyKey: key,
  });
}

export function cancelSalesMinimumChange() {
  return api<null>(`/admin/sales/settings/change`, { method: "DELETE" });
}

export function addSalesRep(rep: { name: string; code: string; staffUserId?: string }, pin: string, key: string) {
  return api<{ id: string; code: string }>(`/admin/sales/reps`, { method: "POST", body: { ...rep, pin }, idempotencyKey: key });
}

export function stopSalesRep(id: string, pin: string) {
  return api<null>(`/admin/sales/reps/${encodeURIComponent(id)}/stop`, { method: "POST", body: { pin } });
}

// ---- Closing accounts ----

/** Close an account the customer asked to close. Needs an empty wallet and nothing in progress. */
export function closeCustomerAccount(id: string, reason: string, pin: string) {
  return api<{ closed: boolean }>(`/admin/customers/${encodeURIComponent(id)}/close`, { method: "POST", body: { reason, pin } });
}

/** Open a closed account again. You must have checked the caller in the last 30 minutes. */
export function reopenCustomerAccount(id: string, reason: string, pin: string) {
  return api<{ reopened: boolean }>(`/admin/customers/${encodeURIComponent(id)}/reopen`, { method: "POST", body: { reason, pin } });
}

export type SafeguardingEntry = {
  id: string;
  currency: string;
  asAt: string;
  owedMinor: number;
  /** Hidden (null) from everyone but the person who typed it until confirmed. */
  bankMinor: number | null;
  differenceMinor: number | null;
  short: boolean | null;
  note: string;
  status: "open" | "confirmed" | "mismatch" | "withdrawn";
  enteredBy: Mini;
  enteredAt: string;
  decidedBy: Mini;
  decidedAt: string | null;
  decisionNote: string;
  confirmTries: number;
  mine: boolean;
};
export type SafeguardingCurrency = {
  currency: string;
  level: "ok" | "warning" | "alert";
  paused: boolean;
  why: "open_shortfall" | "confirmed_shortfall" | null;
  owedNowMinor: number;
  latestConfirmed: SafeguardingEntry | null;
  open: SafeguardingEntry | null;
};
export type SafeguardingStatus = {
  checkedAt: string;
  ledger: { ok: boolean; checkedAt: string; walletsChecked: number; mismatches: number; unbalancedPostings: number; negativeWallets: number };
  currencies: SafeguardingCurrency[];
  history: SafeguardingEntry[];
};

export function safeguardingStatus() {
  return api<SafeguardingStatus>("/admin/safeguarding");
}

export function recordSafeguardingCheck(body: { currency: string; asAt: string; bankAmount: string; note: string; pin: string }, key: string) {
  return api<{ id: string; short: boolean; differenceMinor: number; owedMinor: number }>("/admin/safeguarding/checks", { method: "POST", body, idempotencyKey: key });
}

export function confirmSafeguardingCheck(id: string, body: { bankAmount: string; pin: string }, key: string) {
  return api<{ confirmed: boolean; short: boolean }>(`/admin/safeguarding/checks/${encodeURIComponent(id)}/confirm`, { method: "POST", body, idempotencyKey: key });
}

export function withdrawSafeguardingCheck(id: string, body: { reason: string; pin: string }, key: string) {
  return api(`/admin/safeguarding/checks/${encodeURIComponent(id)}/withdraw`, { method: "POST", body, idempotencyKey: key });
}

// ---- Complaints log (FCA DISP) ----
export type ComplaintChannel = "app" | "email" | "phone" | "in_person" | "post" | "other";
export type ComplaintCategory = "payment" | "emoney" | "fees" | "service" | "fraud" | "other";
export type ComplaintCountry = "GB" | "GM" | "SN" | "OTHER";
export type ComplaintOutcome = "upheld" | "partly_upheld" | "not_upheld" | "withdrawn";
export type Complaint = {
  id: string;
  number: number;
  status: "open" | "closed";
  customer: { id: string; name: string; phone: string } | null;
  complainantName: string;
  contact: string;
  channel: ComplaintChannel;
  category: ComplaintCategory;
  country: ComplaintCountry;
  summary: string;
  receivedAt: string;
  loggedBy: string;
  acknowledgedAt: string | null;
  holdingAt: string | null;
  finalPromisedFor: string | null;
  closedAt: string | null;
  outcome: ComplaintOutcome | null;
  /** Records are kept at least three years from the day received (DISP 1.9.1R). */
  retainUntil?: string;
  clock: { ackDue: string; finalDue: string; ackLate: boolean; finalLate: boolean; holdingLate: boolean; dueSoon: boolean; next: "ack" | "final" | null };
  history: { kind: "logged" | "acknowledged" | "holding" | "closed"; by: string; at: string; note: string }[];
};
export type ComplaintFilter = "open" | "late" | "closed";
export type ComplaintList = { complaints: Complaint[]; pagination: Pagination; counts: { open: number; late: number; dueSoon: number } };

export function complaints(filter: ComplaintFilter, page: number, customerId = "") {
  const query = new URLSearchParams({ filter, page: String(page), limit: "25" });
  if (customerId) query.set("customer", id(customerId));
  return api<ComplaintList>(`/admin/complaints?${query.toString()}`);
}
export function logComplaint(
  body: { summary: string; channel: ComplaintChannel; category: ComplaintCategory; country: ComplaintCountry; complainantName: string; contact: string; receivedAt?: string; customerId?: string },
  key: string,
) {
  return api<Complaint>("/admin/complaints", { method: "POST", body, idempotencyKey: key });
}
export function acknowledgeComplaint(complaintId: string, note: string, key: string) {
  return api<Complaint>(`/admin/complaints/${id(complaintId)}/acknowledge`, { method: "POST", body: { note }, idempotencyKey: key });
}
export function holdingResponse(complaintId: string, reason: string, finalPromisedFor: string, key: string) {
  return api<Complaint>(`/admin/complaints/${id(complaintId)}/holding`, { method: "POST", body: { reason, finalPromisedFor }, idempotencyKey: key });
}
export function closeComplaint(complaintId: string, body: { outcome: ComplaintOutcome; note: string; ombudsmanInformed: boolean; pin: string; redressMinor?: number; redressCurrency?: string }, key: string) {
  return api<Complaint>(`/admin/complaints/${id(complaintId)}/close`, { method: "POST", body, idempotencyKey: key });
}

// ---- Ticket overdue limits (two people) ----

export type OverdueHours = Record<TicketPriority, number>;
export type TicketSettings = {
  overdueHours: OverdueHours;
  defaults: OverdueHours;
  max: OverdueHours;
  pending: { hours: OverdueHours; reason: string; by: string; byId: string; at: string } | null;
  changes: { from: OverdueHours | null; to: OverdueHours; reason: string; by: string; approvedBy: string; approveReason: string; at: string }[];
};

export function ticketSettings() {
  return api<TicketSettings>("/admin/tickets/settings");
}

export function changeTicketLimits(hours: OverdueHours, reason: string, pin: string, key: string) {
  return api<{ asked?: boolean; done?: boolean; settings: TicketSettings }>("/admin/tickets/settings/limits", { method: "PUT", body: { hours, reason, pin }, idempotencyKey: key });
}

export function cancelTicketLimitsChange() {
  return api<null>("/admin/tickets/settings/limits/change", { method: "DELETE" });
}

// ---- Transactions (search every payment) ----

export type TxPerson = { id: string; name: string; phone?: string } | null;
export type TxRow = {
  id: string;
  txRef: string;
  providerReference: string;
  provider: string;
  type: string;
  status: string;
  currency: string;
  amountMinor: number;
  description: string;
  from: TxPerson;
  to: TxPerson;
  country: string;
  senderCountry: string;
  createdAt: string;
  updatedAt: string;
};
export type TxDetail = TxRow & {
  ledger: { purpose: string; account: string; currency: string; amountMinor: number; at: string }[];
  tickets: { id: string; number: number; subject: string; status: string }[];
};
export type TxFilters = { type: string; status: string; currency: string; search: string; from: string; to: string; customer?: string };

export function transactions(filters: TxFilters, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  for (const key of ["type", "status", "currency", "search", "from", "to", "customer"] as const) {
    const v = filters[key];
    if (v) query.set(key, key === "customer" ? id(v) : v);
  }
  return api<{ transactions: TxRow[]; pagination: Pagination }>(`/admin/transactions?${query.toString()}`);
}
export function transaction(txId: string) {
  return api<TxDetail>(`/admin/transactions/${id(txId)}`);
}

// ---- Finance overview ----

export type FinanceMoneyDay = { day: string; inMinor: number; outMinor: number; refundsMinor: number; feesMinor: number; commissionMinor: number };
export type Finance = {
  asAt: string;
  days: number;
  money: { currency: string; totals: Omit<FinanceMoneyDay, "day">; days: FinanceMoneyDay[] }[];
  payments: { days: { day: string; successful: number; failed: number; pending: number; other: number }[]; totals: { successful: number; failed: number; pending: number; other: number }; failureRate: number };
  owed: { currency: string; owedMinor: number }[];
  books: { ok: boolean; checkedAt: string; walletsChecked: number; mismatches: number; unbalancedPostings: number; negativeWallets: number };
  safeguarding: { currency: string; asAt: string; bankMinor: number; owedMinor: number; differenceMinor: number }[] | null;
  waiting: Partial<Record<"purchasesToCheck" | "openCases" | "reversalsWaiting" | "payoutsInReview" | "lateComplaints" | "stuckPayments", number>>;
};
export function finance(days: 7 | 30 | 90, fresh = false) {
  return api<Finance>(`/admin/finance?days=${days}${fresh ? "&fresh=1" : ""}`);
}

// ---- Fraud monitoring limits (two people) ----

export type FraudLimits = { paymentsPerHour: number; dayGbpMinor: number; newAccountDays: number; newAccountGbpMinor: number; recipientsPerDay: number; failuresPerHour: number };
export type FraudSettings = {
  limits: FraudLimits;
  defaults: FraudLimits;
  bounds: Record<keyof FraudLimits, [number, number]>;
  lastRunAt: string | null;
  pending: { limits: FraudLimits; reason: string; by: string; byId: string; at: string } | null;
  changes: { from: FraudLimits | null; to: FraudLimits; reason: string; by: string; approvedBy: string; approveReason: string; at: string }[];
};
export function fraudSettings() {
  return api<FraudSettings>("/admin/fraud/settings");
}
export function changeFraudLimits(limits: FraudLimits, reason: string, pin: string, key: string) {
  return api<{ asked?: boolean; done?: boolean }>("/admin/fraud/settings/limits", { method: "PUT", body: { limits, reason, pin }, idempotencyKey: key });
}
export function cancelFraudLimitsChange() {
  return api<null>("/admin/fraud/settings/limits/change", { method: "DELETE" });
}

// ---- Messages to one customer ----

export type CustomerMessage = { id: string; text: string; lang: "en" | "fr"; by: string; at: string; ticket: string | null };
export function customerMessages(customerId: string) {
  return api<{ messages: CustomerMessage[] }>(`/admin/customers/${id(customerId)}/messages`);
}
export function sendCustomerMessage(customerId: string, body: { text: string; lang: "en" | "fr" }, key: string) {
  return api<{ id: string }>(`/admin/customers/${id(customerId)}/messages`, { method: "POST", body, idempotencyKey: key });
}

// ---- FCA complaints return ----

export type ComplaintReturn = {
  period: string;
  from: string;
  to: string;
  openAtStart: number;
  received: number;
  receivedByCategory: Record<string, number>;
  receivedByCountry: Record<string, number>;
  receivedByChannel: Record<string, number>;
  closed: number;
  closedByOutcome: Record<string, number>;
  closedWithin: { "3": number; "15": number; "35": number; later: number };
  upheldRate: number;
  redress: Record<string, number>;
  ombudsmanInformed: number;
  fraudReceived: number;
  fraudClosed: number;
  openAtEnd: number;
  rows: { number: number; received: string; closed: string; category: string; country: string; channel: string; outcome: string; businessDays: number | ""; redress: string }[];
};
export function complaintReturn(period: string) {
  return api<ComplaintReturn>(`/admin/complaints/return?period=${encodeURIComponent(period)}`);
}
export function complaintReturnCsv(period: string) {
  return api<Blob>(`/admin/complaints/return?period=${encodeURIComponent(period)}&format=csv`, { asFile: true });
}
