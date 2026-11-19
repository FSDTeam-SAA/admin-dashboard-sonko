import { useMemo, useState } from "react";
import {
  decidePurchase,
  stuckPurchases,
  type StuckPurchase,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Pager } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { moneyMajor, when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";

export const REASON_MIN = 10;
export const REASON_MAX = 300;

/** How long ago, in hours, so the oldest stand out. */
export function hoursWaiting(createdAt: string, now = Date.now()): number {
  return Math.max(
    0,
    Math.floor((now - new Date(createdAt).getTime()) / 3_600_000),
  );
}

/**
 * Airtime and bill purchases the provider never answered for 24 hours. The
 * customer's money was taken; a person checks with the provider and decides:
 * it went through (no refund), or it failed (the customer gets it back once).
 */
export function BillsPage() {
  const { staff } = useAuth();
  const mayDecide = can(staff, "review_purchases");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<{
    row: StuckPurchase;
    outcome: "successful" | "failed";
  } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading } = useLoad(
    () => stuckPurchases(page),
    [page, reload],
  );
  const rows = data?.transactions ?? [];

  return (
    <section>
      <PageHeader
        title="Bills and top-ups"
        intro="Airtime and bill purchases with no answer from the provider after 24 hours. The customer has paid. Check each one with the provider using the references below, then decide."
      />
      {done && <p className="notice">{done}</p>}
      <LoadState
        loading={loading && !data}
        error={error}
        empty={!rows.length}
      />
      {rows.length > 0 && (
        <>
          <p className="muted">{data?.totalText}</p>
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Waiting</th>
                  <th>Customer</th>
                  <th>What</th>
                  <th>Amount</th>
                  <th>References</th>
                  <th>Why it stopped</th>
                  {mayDecide && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Badge
                        tone={
                          hoursWaiting(row.createdAt) >= 72 ? "danger" : "warn"
                        }
                      >
                        {hoursWaiting(row.createdAt)} h
                      </Badge>
                      <div className="muted small">{when(row.createdAt)}</div>
                    </td>
                    <td>
                      {row.customer?.name || "—"}
                      <div className="muted small">{row.customer?.phone}</div>
                    </td>
                    <td>
                      {row.type === "airtime" ? "Airtime" : "Bill"} ·{" "}
                      {row.biller || "—"}
                      <div className="muted small">
                        For {row.target || "—"}
                        {row.country ? ` · ${row.country}` : ""}
                      </div>
                    </td>
                    <td>
                      {moneyMajor(row.amount, row.currency)}
                      {row.fee ? (
                        <div className="muted small">
                          Fee {moneyMajor(row.fee, row.currency)}
                        </div>
                      ) : null}
                    </td>
                    <td className="small">
                      <div>Our ref: {row.txRef || "—"}</div>
                      <div>
                        Provider ref:{" "}
                        {row.providerReference ||
                          row.providerTransactionId ||
                          "—"}
                      </div>
                    </td>
                    <td className="small">{row.reviewReason || "—"}</td>
                    {mayDecide && (
                      <td>
                        <button
                          onClick={() =>
                            setOpen({ row, outcome: "successful" })
                          }
                        >
                          It went through
                        </button>{" "}
                        <button
                          className="danger"
                          onClick={() => setOpen({ row, outcome: "failed" })}
                        >
                          It failed: refund
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />
      {open && (
        <DecideDialog
          row={open.row}
          outcome={open.outcome}
          onClose={() => setOpen(null)}
          onDone={(message) => {
            setOpen(null);
            setDone(message);
            setReload((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

function DecideDialog({
  row,
  outcome,
  onClose,
  onDone,
}: {
  row: StuckPurchase;
  outcome: "successful" | "failed";
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const amount = moneyMajor(row.amount + (row.fee || 0), row.currency);
  const ok =
    reason.trim().length >= REASON_MIN && reason.trim().length <= REASON_MAX;
  return (
    <ConfirmWithPin
      title={
        outcome === "successful"
          ? "Mark as went through"
          : "Mark as failed and refund"
      }
      confirmLabel={
        outcome === "successful" ? "Mark as went through" : `Refund ${amount}`
      }
      danger={outcome === "failed"}
      canConfirm={ok}
      onClose={onClose}
      onConfirm={async (pin) => {
        await decidePurchase(
          row.id,
          { outcome, reason: reason.trim(), pin },
          key,
        );
        onDone(
          outcome === "successful"
            ? "Marked as went through. No refund."
            : `Refunded ${amount} to ${row.customer?.name || "the customer"}.`,
        );
      }}
    >
      <p>
        {outcome === "successful"
          ? "Only choose this if the provider confirms the customer received it. The customer gets no refund."
          : `Only choose this if the provider confirms it failed. ${amount} goes back to the customer's wallet, once. If the customer did receive it, this pays them twice.`}
      </p>
      <label>
        What the provider said
        <textarea
          value={reason}
          maxLength={REASON_MAX}
          placeholder="For example: Flutterwave status FAILED, ref FLW-12345, checked 19 Nov"
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <p className="hint">
        {REASON_MIN} to {REASON_MAX} characters. Kept with the decision.
      </p>
    </ConfirmWithPin>
  );
}
