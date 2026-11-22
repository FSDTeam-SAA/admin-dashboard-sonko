import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { agent, agents, decideApplication, saveAgentLocation, type AgentDetail, type AgentRow, type AgentStatus } from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { AskReversalDialog, PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

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
  const t = useT();
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
        <input placeholder={t("Business, name or phone")} value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit">{t("Search")}</button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTyped("");
            }}
          >
            {t("Clear")}
          </button>
        )}
      </form>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>{t("Business")}</th>
                <th>{t("Agent")}</th>
                <th>{t("Where")}</th>
                <th>{t("ID check")}</th>
                <th>{t("Status")}</th>
                <th>{t("Applied")}</th>
                <th aria-label={t("Open")} />
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
                  <td>{row.idChecked ? <Badge tone="ok">{t("Checked")}</Badge> : <Badge tone="danger">{t("Not checked")}</Badge>}</td>
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
                      {t("Open")}
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
  const t = useT();
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
          {t("← All agents")}
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
        {t("← All agents")}
      </button>
      <PageHeader
        title={a.businessName || a.name || "Agent"}
        intro={`${personLabel(a)} · ${STATUS_LABEL[a.status]}`}
        actions={
          <>
            {pending && can(staff, "review_agents") && <button onClick={() => setOpen({ action: "reject" })}>{t("Turn down")}</button>}
            {pending && can(staff, "review_agents") && (
              <button className="primary" onClick={() => setOpen({ action: "approve" })}>
                {t("Approve")}
              </button>
            )}
            {!pending && can(staff, "place_hold") && !(a.hold?.scope === "all") && (
              <button className="danger" onClick={() => setOpen({ action: "hold" })}>
                {t("Put on hold")}
              </button>
            )}
          </>
        }
      />
      {done && <p className="notice">{t(done)}</p>}
      {pending && !a.idChecked && (
        <p className="notice">{t("Their ID has not been checked yet. They can be approved, but can't do cash outs until the check passes.")}</p>
      )}
      {a.hold && (
        <p className="error">
          {t("On hold: {scope}. {reason} (since {when}). Lift it on the Account holds page.", { scope: t(SCOPE_LABEL[a.hold.scope]), reason: a.hold.reason, when: when(a.hold.placedAt) })}
        </p>
      )}

      {can(staff, "review_agents") && a.status !== "rejected" && (
        <LocationCard
          agentId={a.id}
          address={a.businessAddress}
          city={a.city}
          country={a.country}
          showOnMap={Boolean(a.showOnMap)}
          idChecked={a.idChecked}
          onSaved={() => finish("Location saved.")}
        />
      )}

      <div className="two-col">
        <div className="card panel">
          <h2>{t("Details")}</h2>
          <dl className="facts">
            <dt>{t("Full name")}</dt>
            <dd>{a.fullName || "—"}</dd>
            <dt>{t("Phone")}</dt>
            <dd>{a.phone || "—"}</dd>
            <dt>{t("Email")}</dt>
            <dd>{a.email || "—"}</dd>
            <dt>{t("Business address")}</dt>
            <dd>{a.businessAddress || "—"}</dd>
            <dt>{t("Town, country")}</dt>
            <dd>{[a.city, a.country].filter(Boolean).join(", ") || "—"}</dd>
            <dt>{t("ID number")}</dt>
            <dd>{a.nationalId || "—"}</dd>
            <dt>{t("ID check")}</dt>
            <dd>{a.idChecked ? t("Passed") : t("Not done")}</dd>
            <dt>{t("Applied")}</dt>
            <dd>{when(a.appliedAt)}</dd>
            {a.reviewedAt && (
              <>
                <dt>{t("Reviewed")}</dt>
                <dd>
                  {when(a.reviewedAt)}
                  {a.reviewedBy ? ` by ${a.reviewedBy}` : ""}
                </dd>
              </>
            )}
            {a.rejectionReason && (
              <>
                <dt>{t("Reason given")}</dt>
                <dd>{a.rejectionReason}</dd>
              </>
            )}
          </dl>
        </div>
        {working && (
          <div className="card panel">
            <h2>{t("Money")}</h2>
            <dl className="facts">
              {data.wallets.map((w) => (
                <Fact key={w.currency} label={`Balance (${w.currency})`} value={money(w.balanceMinor, w.currency)} />
              ))}
              {!data.wallets.length && <Fact label="Balance" value="No wallet yet" />}
              {data.lastSevenDays.map((w) => (
                <Fact key={w.currency} label="Cash outs, last 7 days" value={`${w.count} · ${money(w.amountMinor, w.currency)}`} />
              ))}
            </dl>
            <p className="hint">{t("Agents buy their own float. Sunu Pay never lends to agents.")}</p>
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
              <h2>{t("Daily pay, last 14 days")}</h2>
              {data.commissionDays.length ? (
                <table className="mini">
                  <thead>
                    <tr>
                      <th>{t("Day")}</th>
                      <th>{t("Volume counted")}</th>
                      <th>{t("Earned")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissionDays.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{money(d.countedVolumeMinor, d.currency)}</td>
                        <td>
                          {money(d.amountMinor - d.clawbackMinor, d.currency)}
                          {d.clawbackMinor > 0 && <span className="muted small"> ({t("{amount} taken back", { amount: money(d.clawbackMinor, d.currency) })})</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">{t("No closed days yet.")}</p>
              )}
            </div>
            <div className="card panel">
              <h2>{t("Weekly payouts")}</h2>
              {data.payouts.length ? (
                <table className="mini">
                  <thead>
                    <tr>
                      <th>{t("Week")}</th>
                      <th>{t("Pay")}</th>
                      <th>{t("Status")}</th>
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
                <p className="muted">{t("No payouts yet.")}</p>
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
            {t("{name} becomes a Sunu Pay agent. They buy their own float; Sunu Pay never lends to agents.", { name: a.businessName || a.name })}
          </p>
          {!a.idChecked && <p className="notice">{t("Their ID check has not passed yet, so cash outs stay blocked until it does.")}</p>}
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
  const t = useT();
  return (
    <div className="card panel">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("When")}</th>
                <th>{t("Reference")}</th>
                <th>{t("Customer")}</th>
                <th>{t("Amount")}</th>
                <th>{t("Status")}</th>
                <th aria-label={t("Actions")} />
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
                  <td>{t(row.status)}</td>
                  <td className="actions">{reverseAllowed && row.canReverse && <button onClick={() => onReverse(row)}>{t("Reverse")}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{t("None yet.")}</p>
      )}
    </div>
  );
}

function Reject({ agentId, onDone, onClose }: { agentId: string; onDone: () => void; onClose: () => void }) {
  const t = useT();
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
      <p className="notice">{t("The applicant sees this reason when they log in. Write it for them, politely.")}</p>
      <TextArea label="Reason for the applicant" value={reason} onChange={setReason} min={5} max={300} />
    </ConfirmWithPin>
  );
}

const mapLink = (address: string, city: string, country: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city, country].filter(Boolean).join(", "))}`;

/** Where customers can find this agent: business address only, never a home address. One person can change it. */
function LocationCard({ agentId, address, city, country, showOnMap, idChecked, onSaved }: { agentId: string; address: string; city: string; country: string; showOnMap: boolean; idChecked: boolean; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = useState({ address, city, show: showOnMap });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const changed = form.address !== address || form.city !== city || form.show !== showOnMap;
  const needsBoth = form.show && (!form.address.trim() || !form.city.trim());

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      await saveAgentLocation(agentId, { businessAddress: form.address.trim(), city: form.city.trim(), showOnMap: form.show });
      onSaved();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card panel" onSubmit={save}>
      <h2>{t("Where customers find this agent")}</h2>
      <p className="hint">{t("The business address only, never a home address. Customers see it in the app with a link that opens Google Maps.")}</p>
      <div className="form-grid">
        <label>
          {t("Business address")}
          <input value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <label>
          {t("Town or city")}
          <input value={form.city} maxLength={60} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={form.show} onChange={(e) => setForm({ ...form, show: e.target.checked })} /> {t("Show on map")}
      </label>
      {form.show && !idChecked && <p className="notice">{t("Their ID check has not passed yet, so they will not appear to customers until it does.")}</p>}
      {needsBoth && <p className="error">{t("To show an agent on the map, add the business address and the town or city.")}</p>}
      {problem && <p className="error">{t(problem)}</p>}
      <div className="row-end">
        {form.address.trim() && (
          <a href={mapLink(form.address, form.city, country)} target="_blank" rel="noreferrer noopener">
            {t("Check on Google Maps")}
          </a>
        )}
        <button className="primary" type="submit" disabled={!changed || busy || needsBoth}>
          {t("Save location")}
        </button>
      </div>
    </form>
  );
}
