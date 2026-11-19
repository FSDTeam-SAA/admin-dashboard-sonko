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
