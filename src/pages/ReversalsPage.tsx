import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  approveReversal,
  cancelReversal,
  REVERSAL_REASONS,
  reversals,
  type Person,
  type Reversal,
  type ReversalKind,
  type ReversalStatus,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { AskReversalDialog } from "../components/dialogs";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";

const KIND_LABEL: Record<ReversalKind, string> = {
  cash_out: "Cash out reversal",
  cash_in: "Cash in reversal",
  payment_request: "Payment request refund",
};
const REASON_LABEL = Object.fromEntries(REVERSAL_REASONS) as Record<string, string>;
const OLD_AFTER_DAYS = 30;
const isOld = (occurredAt: string) => Date.now() - new Date(occurredAt).getTime() > OLD_AFTER_DAYS * 86_400_000;

type Open = { action: "approve" | "cancel"; row: Reversal } | { action: "new" } | null;

export function ReversalsPage() {
  const { staff } = useAuth();
  const [status, setStatus] = useState<ReversalStatus>("pending");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Open>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => reversals(status, page), [status, page]);
  const rows = data?.reversals ?? [];
  const people = data?.people ?? {};
  const name = (id: string | null) => (id ? personLabel(people[id]) : "—");

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader
        title="Refunds and reversals"
        intro="One staff member asks, a different one approves. Money only moves on approval."
        actions={
          can(staff, "request_reversal") ? (
            <button className="primary" onClick={() => setOpen({ action: "new" })}>
              Reverse a cash out or cash in
            </button>
          ) : undefined
        }
      />
      <Tabs
        value={status}
        options={[
          ["pending", "Waiting for approval"],
          ["completed", "Done"],
          ["blocked", "Blocked"],
          ["cancelled", "Cancelled"],
        ] as const}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      {done && <p className="notice">{done}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>What</th>
                <th>Amount</th>
                <th>Customer</th>
                <th>Reason and note</th>
                <th>Asked by</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const mine = row.requested_by === staff?._id;
                return (
                  <tr key={row.id}>
                    <td>
                      {KIND_LABEL[row.kind]}
                      <div className="muted small">{when(row.occurred_at)}</div>
                      {row.tx_ref && <div className="muted small">Ref {row.tx_ref}</div>}
                    </td>
                    <td className="num">{money(row.amount.amount, row.amount.currency)}</td>
                    <td>
                      {name(row.customer_id)}
                      {row.agent_id && <div className="muted small">Agent: {name(row.agent_id)}</div>}
                      {row.requester_id && <div className="muted small">Asked for the money: {name(row.requester_id)}</div>}
                    </td>
                    <td className="wrap">
                      <strong>{REASON_LABEL[row.reason] || row.reason}</strong>
                      <div className="small">{row.note}</div>
                      {row.blocked_reason && <div className="small warn-text">Blocked: {row.blocked_reason}</div>}
                    </td>
                    <td>
                      {mine ? "You" : name(row.requested_by)}
                      {row.completed_at && <div className="muted small">Done {when(row.completed_at)}</div>}
                    </td>
                    <td className="actions">
                      {row.status === "pending" && can(staff, "approve_reversal") && !mine && (
                        <button className="primary" onClick={() => setOpen({ action: "approve", row })}>
                          Approve
                        </button>
                      )}
                      {row.status === "pending" && mine && <Badge tone="plain">Needs someone else</Badge>}
                      {row.status === "pending" && can(staff, "request_reversal") && (
                        <button onClick={() => setOpen({ action: "cancel", row })}>Cancel</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />

      {open?.action === "approve" && (
        <Approve row={open.row} people={people} onClose={() => setOpen(null)} onDone={(r) => finish(r.status === "blocked" ? "Not done: there is not enough money. A case has been opened." : "Approved. The money has moved.")} />
      )}
      {open?.action === "cancel" && <Cancel row={open.row} onClose={() => setOpen(null)} onDone={() => finish("Cancelled. No money moved.")} />}
      {open?.action === "new" && <NewReversal onClose={() => setOpen(null)} onDone={() => finish("Asked for. A different staff member must approve it.")} />}
    </section>
  );
}

function Approve({ row, people, onDone, onClose }: { row: Reversal; people: Record<string, Person>; onDone: (r: Reversal) => void; onClose: () => void }) {
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title={`Approve: ${KIND_LABEL[row.kind]}`}
      confirmLabel={`Approve ${money(row.amount.amount, row.amount.currency)}`}
      onClose={onClose}
      onConfirm={async (pin) => onDone(await approveReversal(row.id, pin, key))}
    >
      <dl className="facts">
        <dt>Amount</dt>
        <dd>{money(row.amount.amount, row.amount.currency)}</dd>
        {row.kind === "payment_request" ? (
          <>
            <dt>Refund to</dt>
            <dd>{personLabel(people[row.customer_id])}</dd>
            <dt>Taken from</dt>
            <dd>{row.requester_id ? personLabel(people[row.requester_id]) : "—"}</dd>
          </>
        ) : (
          <>
            <dt>Customer</dt>
            <dd>{personLabel(people[row.customer_id])}</dd>
            <dt>Agent</dt>
            <dd>{row.agent_id ? personLabel(people[row.agent_id]) : "—"}</dd>
          </>
        )}
        <dt>Reason</dt>
        <dd>{REASON_LABEL[row.reason] || row.reason}</dd>
        <dt>What happened</dt>
        <dd>{row.note}</dd>
        <dt>Asked by</dt>
        <dd>{personLabel(people[row.requested_by])}</dd>
      </dl>
      {isOld(row.occurred_at) && <p className="notice">This is older than 30 days, so it needs a senior approver.</p>}
      <p className="hint">Check the note before approving. This moves money and can't be undone here.</p>
    </ConfirmWithPin>
  );
}

function Cancel({ row, onDone, onClose }: { row: Reversal; onDone: () => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Cancel this request"
      confirmLabel="Cancel request"
      needsPin={false}
      canConfirm={okLength(reason, 5, 1000)}
      onClose={onClose}
      onConfirm={async () => {
        await cancelReversal(row.id, reason.trim());
        onDone();
      }}
    >
      <p>
        {KIND_LABEL[row.kind]} of {money(row.amount.amount, row.amount.currency)}. No money will move.
      </p>
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={1000} />
    </ConfirmWithPin>
  );
}

const RECORD_ID = /^[a-f0-9]{24}$/i;

function NewReversal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [kind, setKind] = useState<"cash_out" | "cash_in">("cash_out");
  const [recordId, setRecordId] = useState("");
  const [ready, setReady] = useState(false);
  if (ready) {
    return (
      <AskReversalDialog
        kind={kind}
        targetId={recordId.trim()}
        title={kind === "cash_out" ? "Reverse a cash out" : "Reverse a cash in"}
        summary={`Record ${recordId.trim()}. The server checks the amount and the people involved.`}
        defaultReason="CASH_NOT_GIVEN"
        onClose={onClose}
        onDone={onDone}
      />
    );
  }
  return (
    <div className="overlay" role="presentation">
      <form
        className="card dialog stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (RECORD_ID.test(recordId.trim())) setReady(true);
        }}
      >
        <h2 id="new-title">Reverse a cash out or cash in</h2>
        <fieldset className="choices">
          <legend>Which</legend>
          <label className="check">
            <input type="radio" checked={kind === "cash_out"} onChange={() => setKind("cash_out")} /> Cash out
          </label>
          <label className="check">
            <input type="radio" checked={kind === "cash_in"} onChange={() => setKind("cash_in")} /> Cash in
          </label>
        </fieldset>
        <label>
          Record ID
          <input autoFocus value={recordId} onChange={(e) => setRecordId(e.target.value)} placeholder="24 letters and numbers" />
        </label>
        <span className="hint">From the cash out or cash in record. The Agents page will link here once it is built.</span>
        <div className="row-end">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit" disabled={!RECORD_ID.test(recordId.trim())}>
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
