import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { agent, agents, decideApplication, type AgentDetail, type AgentRow, type AgentStatus } from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { AskReversalDialog, PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";

const STATUS_LABEL: Record<AgentStatus, string> = {
  pending: "Waiting for review",
  approved: "Working",
  rejected: "Turned down",
  suspended: "Suspended",
};
const STATUS_TONE: Record<AgentStatus, "ok" | "warn" | "plain" | "danger"> = {
  pending: "warn",
  approved: "ok",
  rejected: "plain",
  suspended: "danger",
};

export function AgentsPage() {
  const [status, setStatus] = useState<AgentStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => agents(status, search, page), [status, search, page]);
  const rows = data?.agents ?? [];

  if (openId) {
    return (
      <AgentView
        agentId={openId}
        onBack={() => {
          setOpenId(null);
          reload();
        }}
      />
    );
  }

  const find = (event: FormEvent) => {
    event.preventDefault();
    setSearch(typed);
    setPage(1);
  };

  return (
    <section>
      <PageHeader title="Agents" intro="Applications, working agents, their cash outs, cash ins, pay and balances." />
      <Tabs
        value={status}
        options={[
          ["pending", "Waiting for review"],
          ["approved", "Working"],
          ["suspended", "Suspended"],
          ["rejected", "Turned down"],
          ["all", "All"],
        ] as const}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      <form className="row-start search" onSubmit={find}>
        <input placeholder="Business, name or phone" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit">Search</button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTyped("");
            }}
          >
            Clear
          </button>
        )}
      </form>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Agent</th>
                <th>Where</th>
                <th>ID check</th>
                <th>Status</th>
                <th>Applied</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row: AgentRow) => (
                <tr key={row.id} className="clickable" onClick={() => setOpenId(row.id)}>
                  <td>
                    <strong>{row.businessName || "—"}</strong>
                  </td>
                  <td>{personLabel(row)}</td>
                  <td>{[row.city, row.country].filter(Boolean).join(", ") || "—"}</td>
                  <td>{row.idChecked ? <Badge tone="ok">Checked</Badge> : <Badge tone="danger">Not checked</Badge>}</td>
                  <td>
                    <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    {row.onHold && row.holdScope && (
                      <div>
                        <Badge tone="danger">{SCOPE_LABEL[row.holdScope]}</Badge>
                      </div>
                    )}
                  </td>
                  <td>{when(row.appliedAt)}</td>
                  <td className="actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(row.id);
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />
    </section>
  );
}

type Open =
  | { action: "approve" | "reject" | "hold" }
  | { action: "reverseOut" | "reverseIn"; recordId: string; summary: string }
  | null;

function AgentView({ agentId, onBack }: { agentId: string; onBack: () => void }) {
  const { staff } = useAuth();
  const [open, setOpen] = useState<Open>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => agent(agentId), [agentId]);
  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← All agents
        </button>
        <LoadState loading={loading} error={error} empty={false} />
      </section>
    );
  }
  const a = data.agent;
  const pending = a.status === "pending";
  const working = a.status === "approved";

  return (
    <section>
      <button className="link" onClick={onBack}>
        ← All agents
      </button>
      <PageHeader
        title={a.businessName || a.name || "Agent"}
        intro={`${personLabel(a)} · ${STATUS_LABEL[a.status]}`}
        actions={
          <>
            {pending && can(staff, "review_agents") && <button onClick={() => setOpen({ action: "reject" })}>Turn down</button>}
            {pending && can(staff, "review_agents") && (
              <button className="primary" onClick={() => setOpen({ action: "approve" })}>
                Approve
              </button>
            )}
            {!pending && can(staff, "place_hold") && !(a.hold?.scope === "all") && (
              <button className="danger" onClick={() => setOpen({ action: "hold" })}>
                Put on hold
              </button>
            )}
          </>
        }
      />
      {done && <p className="notice">{done}</p>}
      {pending && !a.idChecked && (
        <p className="notice">Their ID has not been checked yet. They can be approved, but can't do cash outs until the check passes.</p>
      )}
      {a.hold && (
        <p className="error">
          On hold: {SCOPE_LABEL[a.hold.scope]}. {a.hold.reason} (since {when(a.hold.placedAt)}). Lift it on the Account holds page.
        </p>
      )}

      <div className="two-col">
        <div className="card panel">
          <h2>Details</h2>
          <dl className="facts">
            <dt>Full name</dt>
            <dd>{a.fullName || "—"}</dd>
            <dt>Phone</dt>
            <dd>{a.phone || "—"}</dd>
            <dt>Email</dt>
            <dd>{a.email || "—"}</dd>
            <dt>Business address</dt>
            <dd>{a.businessAddress || "—"}</dd>
            <dt>Town, country</dt>
            <dd>{[a.city, a.country].filter(Boolean).join(", ") || "—"}</dd>
            <dt>ID number</dt>
            <dd>{a.nationalId || "—"}</dd>
            <dt>ID check</dt>
            <dd>{a.idChecked ? "Passed" : "Not done"}</dd>
            <dt>Applied</dt>
            <dd>{when(a.appliedAt)}</dd>
            {a.reviewedAt && (
              <>
                <dt>Reviewed</dt>
                <dd>
                  {when(a.reviewedAt)}
                  {a.reviewedBy ? ` by ${a.reviewedBy}` : ""}
                </dd>
              </>
            )}
            {a.rejectionReason && (
              <>
                <dt>Reason given</dt>
                <dd>{a.rejectionReason}</dd>
              </>
            )}
          </dl>
        </div>
        {working && (
          <div className="card panel">
            <h2>Money</h2>
            <dl className="facts">
              {data.wallets.map((w) => (
                <Fact key={w.currency} label={`Balance (${w.currency})`} value={money(w.balanceMinor, w.currency)} />
              ))}
              {!data.wallets.length && <Fact label="Balance" value="No wallet yet" />}
              {data.lastSevenDays.map((w) => (
                <Fact key={w.currency} label="Cash outs, last 7 days" value={`${w.count} · ${money(w.amountMinor, w.currency)}`} />
              ))}
            </dl>
            <p className="hint">Agents buy their own float. Sunu Pay never lends to agents.</p>
          </div>
        )}
      </div>

      {working && (
        <>
          <Records
            title="Recent cash outs"
            rows={data.cashOuts.map((c) => ({ ...c, canReverse: c.status === "paid", extra: c.feeMinor ? `fee ${money(c.feeMinor, c.currency)}` : "" }))}
            reverseAllowed={can(staff, "request_reversal")}
            onReverse={(row) =>
              setOpen({ action: "reverseOut", recordId: row.id, summary: `Cash out ${row.txRef}: ${money(row.amountMinor, row.currency)} to ${personLabel(row.customer)}.` })
            }
          />
          <Records
            title="Recent cash ins"
            rows={data.cashIns.map((c) => ({ ...c, canReverse: c.status === "successful", extra: "" }))}
            reverseAllowed={can(staff, "request_reversal")}
            onReverse={(row) =>
              setOpen({ action: "reverseIn", recordId: row.id, summary: `Cash in ${row.txRef || ""}: ${money(row.amountMinor, row.currency)} for ${personLabel(row.customer)}.` })
            }
          />
          <div className="two-col">
            <div className="card panel">
              <h2>Daily pay, last 14 days</h2>
              {data.commissionDays.length ? (
                <table className="mini">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Volume counted</th>
                      <th>Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissionDays.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{money(d.countedVolumeMinor, d.currency)}</td>
                        <td>
                          {money(d.amountMinor - d.clawbackMinor, d.currency)}
                          {d.clawbackMinor > 0 && <span className="muted small"> ({money(d.clawbackMinor, d.currency)} taken back)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No closed days yet.</p>
              )}
            </div>
            <div className="card panel">
              <h2>Weekly payouts</h2>
              {data.payouts.length ? (
                <table className="mini">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Pay</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payouts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.periodStart} – {p.periodEnd}
                        </td>
                        <td>{money(p.netMinor, p.currency)}</td>
                        <td>{p.status.replace("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No payouts yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {open?.action === "approve" && (
        <ConfirmWithPin
          title="Approve this agent"
          confirmLabel="Approve"
          needsPin={false}
          onClose={() => setOpen(null)}
          onConfirm={async () => {
            await decideApplication(a.id, { status: "approved" });
            finish("Approved. They can work as an agent once their ID check has passed.");
          }}
        >
          <p>
            <strong>{a.businessName || a.name}</strong> becomes a Sunu Pay agent. They buy their own float; Sunu Pay never lends to agents.
          </p>
          {!a.idChecked && <p className="notice">Their ID check has not passed yet, so cash outs stay blocked until it does.</p>}
        </ConfirmWithPin>
      )}
      {open?.action === "reject" && <Reject agentId={a.id} onClose={() => setOpen(null)} onDone={() => finish("Turned down. They will see your reason when they log in.")} />}
      {open?.action === "hold" && (
        <PlaceHoldDialog
          customer={{ id: a.id, label: `${a.businessName || a.name} (${a.phone})` }}
          scopes={a.hold ? ["all"] : ["all", "requests"]}
          onClose={() => setOpen(null)}
          onDone={() => finish("Hold placed. Two people must agree to lift it.")}
        />
      )}
      {open?.action === "reverseOut" && (
        <AskReversalDialog kind="cash_out" targetId={open.recordId} title="Reverse this cash out" summary={open.summary} defaultReason="CASH_NOT_GIVEN" onClose={() => setOpen(null)} onDone={() => finish("Reversal asked for. A different staff member must approve it on the Refunds and reversals page.")} />
      )}
      {open?.action === "reverseIn" && (
        <AskReversalDialog kind="cash_in" targetId={open.recordId} title="Reverse this cash in" summary={open.summary} defaultReason="WRONG_AMOUNT" onClose={() => setOpen(null)} onDone={() => finish("Reversal asked for. A different staff member must approve it on the Refunds and reversals page.")} />
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

type RecordRow = AgentDetail["cashIns"][number] & { canReverse: boolean; extra: string };

function Records({ title, rows, reverseAllowed, onReverse }: { title: string; rows: RecordRow[]; reverseAllowed: boolean; onReverse: (row: RecordRow) => void }) {
  return (
    <div className="card panel">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Reference</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{when(row.at)}</td>
                  <td className="small">{row.txRef || "—"}</td>
                  <td>{personLabel(row.customer)}</td>
                  <td className="num">
                    {money(row.amountMinor, row.currency)}
                    {row.extra && <div className="muted small">{row.extra}</div>}
                  </td>
                  <td>{row.status}</td>
                  <td className="actions">{reverseAllowed && row.canReverse && <button onClick={() => onReverse(row)}>Reverse</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">None yet.</p>
      )}
    </div>
  );
}

function Reject({ agentId, onDone, onClose }: { agentId: string; onDone: () => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Turn down this application"
      confirmLabel="Turn down"
      danger
      needsPin={false}
      canConfirm={okLength(reason, 5, 300)}
      onClose={onClose}
      onConfirm={async () => {
        await decideApplication(agentId, { status: "rejected", rejectionReason: reason.trim() });
        onDone();
      }}
    >
      <p className="notice">The applicant sees this reason when they log in. Write it for them, politely.</p>
      <TextArea label="Reason for the applicant" value={reason} onChange={setReason} min={5} max={300} />
    </ConfirmWithPin>
  );
}
