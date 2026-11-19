import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { approveLift, askToLift, cancelLift, findCustomers, holds, type CustomerHit, type HoldRow } from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { HOLD_REASON_MAX, HOLD_REASON_MIN, PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { newIdempotencyKey } from "../lib/idempotency";
import { personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";

type View = "all" | "asked";
type Open =
  | { action: "ask" | "approve" | "cancel" | "widen"; row: HoldRow }
  | { action: "place"; customer: { id: string; label: string } }
  | { action: "find" }
  | null;

export function HoldsPage() {
  const { staff } = useAuth();
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Open>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => holds(view === "asked", page), [view, page]);
  const rows = data?.holds ?? [];
  const me = staff?._id;

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader
        title="Account holds"
        intro="Placing a hold takes one staff member. Lifting one takes two: one asks, a different one approves."
        actions={
          can(staff, "place_hold") && can(staff, "view_customers") ? (
            <button className="primary" onClick={() => setOpen({ action: "find" })}>
              Place a hold
            </button>
          ) : undefined
        }
      />
      <Tabs
        value={view}
        options={[
          ["all", "All holds"],
          ["asked", "Waiting for approval"],
        ] as const}
        onChange={(v) => {
          setView(v);
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
                <th>Customer</th>
                <th>Hold</th>
                <th>Reason</th>
                <th>Placed</th>
                <th>Lifting</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const asked = Boolean(row.liftRequestedBy);
                const askedByMe = asked && row.liftRequestedBy === me;
                return (
                  <tr key={row.user.id}>
                    <td>{personLabel(row.user)}</td>
                    <td>
                      <Badge tone={row.scope === "all" ? "danger" : "warn"}>{SCOPE_LABEL[row.scope]}</Badge>
                    </td>
                    <td className="wrap">{row.reason}</td>
                    <td>
                      {when(row.placedAt)}
                      <div className="muted small">by {row.placedByName || "staff"}</div>
                    </td>
                    <td className="wrap">
                      {asked ? (
                        <>
                          <Badge tone="warn">Asked by {askedByMe ? "you" : row.liftRequestedByName || "staff"}</Badge>
                          <div className="small">{row.liftReason}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="actions">
                      {can(staff, "lift_hold") && !asked && <button onClick={() => setOpen({ action: "ask", row })}>Ask to lift</button>}
                      {can(staff, "lift_hold") && asked && !askedByMe && (
                        <button className="primary" onClick={() => setOpen({ action: "approve", row })}>
                          Approve lift
                        </button>
                      )}
                      {can(staff, "lift_hold") && asked && <button onClick={() => setOpen({ action: "cancel", row })}>Keep hold</button>}
                      {can(staff, "place_hold") && row.scope === "requests" && (
                        <button onClick={() => setOpen({ action: "widen", row })}>Make full hold</button>
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

      {open?.action === "find" && (
        <FindCustomer
          onClose={() => setOpen(null)}
          onPick={(hit) => setOpen({ action: "place", customer: { id: hit._id, label: personLabel({ name: hit.name || hit.username, phone: hit.phone }) } })}
        />
      )}
      {open?.action === "place" && (
        <PlaceHoldDialog customer={open.customer} onClose={() => setOpen(null)} onDone={() => finish("Hold placed.")} />
      )}
      {open?.action === "widen" && (
        <PlaceHoldDialog
          customer={{ id: open.row.user.id, label: personLabel(open.row.user) }}
          scopes={["all"]}
          onClose={() => setOpen(null)}
          onDone={() => finish("Changed to a full hold.")}
        />
      )}
      {open?.action === "ask" && <AskLift row={open.row} onClose={() => setOpen(null)} onDone={() => finish("Asked to lift. A different staff member must approve it.")} />}
      {open?.action === "approve" && <ApproveLift row={open.row} onClose={() => setOpen(null)} onDone={() => finish("Hold lifted. The customer has been told.")} />}
      {open?.action === "cancel" && (
        <ConfirmWithPin
          title="Keep the hold"
          confirmLabel="Keep hold"
          needsPin={false}
          onClose={() => setOpen(null)}
          onConfirm={async () => {
            await cancelLift(open.row.user.id);
            finish("The request to lift was cancelled. The hold stays.");
          }}
        >
          <p>
            Cancel the request to lift the hold on <strong>{personLabel(open.row.user)}</strong>. The hold stays as it is.
          </p>
        </ConfirmWithPin>
      )}
    </section>
  );
}

function AskLift({ row, onDone, onClose }: { row: HoldRow; onDone: () => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Ask to lift the hold"
      confirmLabel="Ask"
      canConfirm={okLength(reason, HOLD_REASON_MIN, HOLD_REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await askToLift(row.user.id, { reason: reason.trim(), pin }, key);
        onDone();
      }}
    >
      <p>
        <strong>{personLabel(row.user)}</strong> — {SCOPE_LABEL[row.scope]}
      </p>
      <p className="hint">The hold stays until a different staff member approves.</p>
      <TextArea label="Why it can be lifted" value={reason} onChange={setReason} min={HOLD_REASON_MIN} max={HOLD_REASON_MAX} />
    </ConfirmWithPin>
  );
}

function ApproveLift({ row, onDone, onClose }: { row: HoldRow; onDone: () => void; onClose: () => void }) {
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve lifting the hold"
      confirmLabel="Lift hold"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveLift(row.user.id, pin, key);
        onDone();
      }}
    >
      <p>
        <strong>{personLabel(row.user)}</strong> — {SCOPE_LABEL[row.scope]}
      </p>
      <dl className="facts">
        <dt>Why it was placed</dt>
        <dd>{row.reason}</dd>
        <dt>Why {row.liftRequestedByName || "staff"} wants it lifted</dt>
        <dd>{row.liftReason}</dd>
      </dl>
      <p className="hint">Once lifted, the customer can use their account normally again.</p>
    </ConfirmWithPin>
  );
}

function FindCustomer({ onPick, onClose }: { onPick: (hit: CustomerHit) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<CustomerHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function find(event: FormEvent) {
    event.preventDefault();
    if (search.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await findCustomers(search.trim());
      // Staff accounts can't be held here.
      setHits(result.users.filter((u) => u.role !== "admin"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not search.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" role="presentation">
      <div className="card dialog" role="dialog" aria-modal="true" aria-labelledby="find-title">
        <h2 id="find-title">Find the account</h2>
        <form className="row-start" onSubmit={find}>
          <input autoFocus placeholder="Phone number or name" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" disabled={busy || search.trim().length < 3}>
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {hits && !hits.length && <p className="muted">No customer or agent found.</p>}
        {hits && hits.length > 0 && (
          <ul className="hits">
            {hits.map((hit) => (
              <li key={hit._id}>
                <button className="hit" onClick={() => onPick(hit)}>
                  {personLabel({ name: hit.name || hit.username, phone: hit.phone })}
                  <span className="muted small">{hit.role === "agent" ? "Agent" : "Customer"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="row-end">
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
