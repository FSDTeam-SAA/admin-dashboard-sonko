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

export type TicketPriority = "high" | "medium" | "low";
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
};

export type TicketDetail = Omit<TicketRow, "customer" | "assignedTo"> & {
  detail: string;
  customer: Mini;
  createdBy: Mini;
  assignedTo: Mini;
  notes: { by: Mini; text: string; at: string }[];
  history: { by: Mini; field: string; from: string; to: string; at: string }[];
};

export type TicketFilters = { status: TicketStatus | "active" | "all"; priority: TicketPriority | "all"; mine: boolean; search: string; customer?: string };

export function tickets(filters: TicketFilters, page: number) {
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.priority !== "all") query.set("priority", filters.priority);
  if (filters.mine) query.set("assignedTo", "me");
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.customer) query.set("customer", id(filters.customer));
  return api<{ tickets: TicketRow[]; pagination: Pagination }>(`/admin/tickets?${query.toString()}`);
}

export function ticket(ticketId: string) {
  return api<TicketDetail>(`/admin/tickets/${id(ticketId)}`);
}

export function openTicket(body: { subject: string; detail: string; priority: TicketPriority; category: TicketCategory; customer?: string }, key: string) {
  return api<{ id: string; number: number }>(`/admin/tickets`, { method: "POST", body, idempotencyKey: key });
}

export function addTicketNote(ticketId: string, text: string, key: string) {
  return api(`/admin/tickets/${id(ticketId)}/notes`, { method: "POST", body: { text }, idempotencyKey: key });
}

export function changeTicket(ticketId: string, body: { priority?: TicketPriority; status?: TicketStatus; category?: TicketCategory; assignedTo?: string | null }) {
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
