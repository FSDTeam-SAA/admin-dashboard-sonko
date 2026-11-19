import { useMemo, useState } from "react";
import { ConfirmWithPin } from "./ConfirmWithPin";
import { TextArea, okLength } from "./common";
import { newIdempotencyKey } from "../lib/idempotency";
import {
  askReversal,
  NOTE_MAX,
  NOTE_MIN,
  placeHold,
  REVERSAL_REASONS,
  type HoldScope,
  type ReversalKind,
  type ReversalReason,
} from "../api/admin";

export const HOLD_REASON_MIN = 10;
export const HOLD_REASON_MAX = 500;

export const SCOPE_LABEL: Record<HoldScope, string> = {
  requests: "Payment requests blocked",
  all: "Full hold: no money can leave",
};

type PlaceProps = {
  customer: { id: string; label: string };
  /** Only "all" when the account already has a requests hold. */
  scopes?: HoldScope[];
  paymentRequestId?: string;
  onDone: () => void;
  onClose: () => void;
};

/** One staff member places a hold, at once. Lifting it later needs two. */
export function PlaceHoldDialog({ customer, scopes = ["requests", "all"], paymentRequestId, onDone, onClose }: PlaceProps) {
  const [scope, setScope] = useState<HoldScope>(scopes[0] ?? "requests");
  const [reason, setReason] = useState("");
  // One key for this dialog: a retry after a dropped connection is not done twice.
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Put this account on hold"
      confirmLabel="Place hold"
      danger
      canConfirm={okLength(reason, HOLD_REASON_MIN, HOLD_REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await placeHold(customer.id, { scope, reason: reason.trim(), pin, ...(paymentRequestId ? { payment_request_id: paymentRequestId } : {}) }, key);
        onDone();
      }}
    >
      <p>
        <strong>{customer.label}</strong>
      </p>
      <fieldset className="choices">
        <legend>What to stop</legend>
        {scopes.map((option) => (
          <label key={option} className="check">
            <input type="radio" name="scope" checked={scope === option} onChange={() => setScope(option)} />
            {SCOPE_LABEL[option]}
          </label>
        ))}
      </fieldset>
      <p className="hint">
        The customer is told only that their account is on hold and to contact support. They are never told the reason.
        Lifting a hold needs two staff members.
      </p>
      <TextArea label="Reason (staff only)" value={reason} onChange={setReason} min={HOLD_REASON_MIN} max={HOLD_REASON_MAX} />
    </ConfirmWithPin>
  );
}

type AskProps = {
  kind: ReversalKind;
  targetId: string;
  title: string;
  summary: string;
  defaultReason?: ReversalReason;
  onDone: () => void;
  onClose: () => void;
};

/** One staff member asks for a refund or reversal; a different one approves. */
export function AskReversalDialog({ kind, targetId, title, summary, defaultReason = "SCAM_REPORTED", onDone, onClose }: AskProps) {
  const [reason, setReason] = useState<ReversalReason>(defaultReason);
  const [note, setNote] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title={title}
      confirmLabel="Ask for approval"
      canConfirm={okLength(note, NOTE_MIN, NOTE_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await askReversal(kind, targetId, { reason, note: note.trim(), pin }, key);
        onDone();
      }}
    >
      <p>{summary}</p>
      <p className="hint">No money moves yet. A different staff member must approve it on the Refunds and reversals page.</p>
      <label>
        Reason
        <select value={reason} onChange={(e) => setReason(e.target.value as ReversalReason)}>
          {REVERSAL_REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <TextArea
        label="What happened"
        hint="This is the evidence the approver reads."
        value={note}
        onChange={setNote}
        min={NOTE_MIN}
        max={NOTE_MAX}
      />
    </ConfirmWithPin>
  );
}
