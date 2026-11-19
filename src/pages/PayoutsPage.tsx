import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  APPROVALS_NEEDED,
  approvePayout,
  approvePayoutBatch,
  holdPayout,
  payouts,
  releasePayout,
  type BatchResult,
  type Payout,
  type PayoutStatus,
  type Person,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, personLabel } from "../lib/format";
import { useLoad } from "../lib/useLoad";

// What each fraud check flag means, for the person deciding.
export const FLAG_LABEL: Record<string, string> = {
  reversal_rate_high: "Several reversals against this agent this week",
  cross_agent_round_trips: "Money going back and forth with another agent",
  gross_far_above_counted: "Most of the volume cancelled itself out",
  just_over_tier: "Often only just over a pay tier",
  volume_jump: "Volume far above this agent's usual week",
  funded_by_agent: "Customers cashed out money this agent sent them",
  new_customers_spike: "Sudden jump in first-time customers",
};

const week = (p: Payout) => {
  const fmt = (v: string) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(p.period_start)} – ${fmt(p.period_end)}`;
};

type Open = { action: "approve" | "hold" | "release"; row: Payout } | { action: "batch"; rows: Payout[] } | null;

export function PayoutsPage() {
  const { staff } = useAuth();
  const [status, setStatus] = useState<PayoutStatus>("in_review");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Open>(null);
  const [done, setDone] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data, error, loading, reload } = useLoad(() => payouts(status, page), [status, page]);
  const rows = data?.payouts ?? [];
  const people = data?.people ?? {};
  const me = staff?._id ?? "";
  const approvedByMe = (p: Payout) => p.approved_by.some((a) => a.id === me);
  // Batch approval: only clean payouts (no fraud flags) the staff member has not approved yet.
  const batchable = (p: Payout) => p.status === "in_review" && !p.fraud_check.flags.length && !approvedByMe(p);

  const finish = (message: string) => {
    setOpen(null);
    setPicked(new Set());
    setDone(message);
    reload();
  };

  const toggle = (payoutId: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(payoutId)) next.delete(payoutId);
      else next.add(payoutId);
      return next;
    });

  const canApprove = can(staff, "approve_commission");
  const pickedRows = rows.filter((r) => picked.has(r.id));

  return (
    <section>
      <PageHeader
        title="Agent payouts"
        intro="Each week's commission is paid to the agent's Sunu Pay balance once two different staff members approve it."
        actions={
          canApprove && status === "in_review" && pickedRows.length > 0 ? (
            <button className="primary" onClick={() => setOpen({ action: "batch", rows: pickedRows })}>
              Approve {pickedRows.length} selected
            </button>
          ) : undefined
        }
      />
      <Tabs
        value={status}
        options={[
          ["in_review", "In review"],
          ["held", "Held"],
          ["approved", "Approved, not paid"],
          ["paid", "Paid"],
          ["cancelled", "Cancelled"],
        ] as const}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
          setPicked(new Set());
        }}
      />
      {done && <p className="notice">{done}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                {canApprove && status === "in_review" && <th aria-label="Select" />}
                <th>Agent</th>
                <th>Week</th>
                <th>Activity</th>
                <th>Pay</th>
                <th>Checks</th>
                <th>Approvals</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {canApprove && status === "in_review" && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.agent.business_name}`}
                        disabled={!batchable(row)}
                        checked={picked.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    </td>
                  )}
                  <td>
                    {row.agent.business_name || "Agent"}
                    <div className="muted small">{row.country}</div>
                  </td>
                  <td>{week(row)}</td>
                  <td className="small">
                    {row.days_earned} days earned
                    <div className="muted">
                      {row.cashout_count} cash outs, {row.cashin_count} cash ins
                    </div>
                  </td>
                  <td className="num">
                    <strong>{money(row.net.amount, row.net.currency)}</strong>
                    {row.clawbacks.amount > 0 && (
                      <div className="muted small">
                        {money(row.gross.amount, row.gross.currency)} less {money(row.clawbacks.amount, row.clawbacks.currency)} taken back
                      </div>
                    )}
                  </td>
                  <td className="wrap">
                    {row.fraud_check.flags.length ? (
                      row.fraud_check.flags.map((f) => (
                        <div key={f}>
                          <Badge tone="danger">{FLAG_LABEL[f] || f}</Badge>
                        </div>
                      ))
                    ) : (
                      <Badge tone="ok">No flags</Badge>
                    )}
                  </td>
                  <td className="small">
                    {row.approved_by.length} of {APPROVALS_NEEDED}
                    {row.approved_by.map((a) => (
                      <div key={a.id} className="muted">
                        {a.id === me ? "You" : personLabel(people[a.id])}
                      </div>
                    ))}
                  </td>
                  <td className="actions">
                    {row.status === "in_review" && canApprove && !approvedByMe(row) && (
                      <button className="primary" onClick={() => setOpen({ action: "approve", row })}>
                        Approve
                      </button>
                    )}
                    {row.status === "approved" && canApprove && (
                      <button className="primary" onClick={() => setOpen({ action: "approve", row })}>
                        Try payment again
                      </button>
                    )}
                    {row.status === "in_review" && can(staff, "hold_commission") && (
                      <button onClick={() => setOpen({ action: "hold", row })}>Hold</button>
                    )}
                    {row.status === "held" && can(staff, "release_commission") && (
                      <button onClick={() => setOpen({ action: "release", row })}>Release</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />

      {open?.action === "approve" && <Approve row={open.row} people={people} onClose={() => setOpen(null)} onDone={finish} />}
      {(open?.action === "hold" || open?.action === "release") && (
        <HoldOrRelease row={open.row} release={open.action === "release"} onClose={() => setOpen(null)} onDone={finish} />
      )}
      {open?.action === "batch" && <Batch rows={open.rows} onClose={() => setOpen(null)} onDone={finish} />}
    </section>
  );
}

function Approve({ row, people, onDone, onClose }: { row: Payout; people: Record<string, Person>; onDone: (m: string) => void; onClose: () => void }) {
  const key = useMemo(newIdempotencyKey, []);
  const second = row.approved_by.length >= APPROVALS_NEEDED - 1 || row.status === "approved";
  return (
    <ConfirmWithPin
      title={row.status === "approved" ? "Try the payment again" : second ? "Approve and pay" : "Approve (first of two)"}
      confirmLabel={second ? `Pay ${money(row.net.amount, row.net.currency)}` : "Approve"}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await approvePayout(row.id, pin, key);
        onDone(result.status === "paid" ? "Paid to the agent's balance." : "Approved. A different staff member must approve it before it is paid.");
      }}
    >
      <dl className="facts">
        <dt>Agent</dt>
        <dd>{row.agent.business_name || "Agent"}</dd>
        <dt>Week</dt>
        <dd>{week(row)}</dd>
        <dt>Pay</dt>
        <dd>{money(row.net.amount, row.net.currency)}</dd>
        {row.approved_by.length > 0 && (
          <>
            <dt>Already approved by</dt>
            <dd>{row.approved_by.map((a) => personLabel(people[a.id])).join(", ")}</dd>
          </>
        )}
      </dl>
      {row.fraud_check.flags.length > 0 && (
        <div className="notice">
          <strong>Check these before approving:</strong>
          <ul className="flat">
            {row.fraud_check.flags.map((f) => (
              <li key={f}>{FLAG_LABEL[f] || f}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="hint">{second ? "This pays the agent now." : "Nothing is paid until a second person approves."}</p>
    </ConfirmWithPin>
  );
}

function HoldOrRelease({ row, release, onDone, onClose }: { row: Payout; release: boolean; onDone: (m: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title={release ? "Release this payout" : "Hold this payout"}
      confirmLabel={release ? "Release" : "Hold"}
      needsPin={false}
      canConfirm={okLength(reason, 5, 500)}
      onClose={onClose}
      onConfirm={async () => {
        if (release) await releasePayout(row.id, reason.trim());
        else await holdPayout(row.id, reason.trim());
        onDone(release ? "Released. It needs two approvals again." : "Held. It will not be paid until released.");
      }}
    >
      <p>
        {row.agent.business_name || "Agent"}, {week(row)}: {money(row.net.amount, row.net.currency)}.
      </p>
      <p className="hint">{release ? "Any earlier approvals are cleared; two people must approve again." : "Any approvals so far are cleared."}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={500} />
    </ConfirmWithPin>
  );
}

function Batch({ rows, onDone, onClose }: { rows: Payout[]; onDone: (m: string) => void; onClose: () => void }) {
  const key = useMemo(newIdempotencyKey, []);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const total = rows.reduce((sum, r) => sum + r.net.amount, 0);
  const currencies = [...new Set(rows.map((r) => r.net.currency))];
  if (results) {
    const count = (kind: BatchResult["result"]) => results.filter((r) => r.result === kind).length;
    return (
      <div className="overlay" role="presentation">
        <div className="card dialog stack" role="dialog" aria-modal="true">
          <h2>Batch approval done</h2>
          <p>
            Paid: {count("paid")}. Approved once (a second person must approve): {count("approved_once")}. Refused: {count("refused")}.
          </p>
          {results
            .filter((r) => r.result === "refused")
            .map((r) => (
              <p key={r.id} className="small warn-text">
                {rows.find((row) => row.id === r.id)?.agent.business_name || r.id}: {r.message}
              </p>
            ))}
          <div className="row-end">
            <button className="primary" onClick={() => onDone("Batch approval done.")}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <ConfirmWithPin
      title={`Approve ${rows.length} payouts`}
      confirmLabel="Approve all"
      onClose={onClose}
      onConfirm={async (pin) => setResults((await approvePayoutBatch(rows.map((r) => r.id), pin, key)).results)}
    >
      <p>
        {rows.length} payouts with no fraud flags
        {currencies.length === 1 ? `, ${money(total, currencies[0]!)} in total` : ""}. Each still needs two different
        people; the ones you are the second person for are paid now.
      </p>
    </ConfirmWithPin>
  );
}
