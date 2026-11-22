import { useState } from "react";
import { Link } from "react-router";
import { closeComplianceCase, escalateFraudAlert, fraudAlerts, fraudSummary, type ComplianceCaseRow } from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { PlaceHoldDialog } from "../components/dialogs";
import { personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { RULE_LABEL } from "./CasesPage";
import { FraudLimitsBox } from "./FraudLimits";

// Fraud detection: what the automatic checks found (every 10 minutes, server
// utils/fraud.rules.js). Nothing is blocked by itself: staff look, then
// dismiss, escalate, or confirm fraud and hold the account.

/** What each rule means, in a sentence, for the alert's View box. */
export const RULE_HELP: Record<string, string> = {
  many_payments_hour: "Many payments out within one hour.",
  big_day: "A lot of money sent out within 24 hours.",
  new_account_big: "A new account sending a lot within 24 hours.",
  many_recipients: "Many different people paid within 24 hours.",
  many_failures: "Many failed payments within one hour. This can be someone testing stolen cards.",
  duplicate_attempts: "The same amount to the same person again and again within one hour.",
  big_single: "One payment far bigger than usual.",
  wrong_pins: "Many wrong PINs, or a lockout. Someone may be guessing the PIN.",
  many_invites: "Many friends signed up with one invite code in a day. Check for fake accounts made for the bonus.",
  shared_device: "One phone used by several accounts in a week.",
  unusual_amount: "Far more sent out in 24 hours than this customer's usual day. Ask what changed before deciding.",
  pass_through: "Money sent to this customer by other customers, then sent out again within 24 hours. Someone may be using the account to move other people's money.",
  dormant_big: "An account with no payments for months suddenly sending a lot. Check the account has not been taken over.",
};

type Action = { kind: "dismiss" | "escalate" | "fraud" | "resolved"; c: ComplianceCaseRow };

export function FraudPage() {
  const { staff } = useAuth();
  const t = useT();
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [rule, setRule] = useState("");
  const [onlyEscalated, setOnlyEscalated] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ComplianceCaseRow | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [holding, setHolding] = useState<ComplianceCaseRow | null>(null);
  const summary = useLoad(() => fraudSummary(), [done]);
  const list = useLoad(() => fraudAlerts(status, page, rule, onlyEscalated), [status, page, rule, onlyEscalated, done]);
  const mayClose = can(staff, "close_cases");
  const s = summary.data;

  const counter = (label: string, value: number | undefined, tone: "warn" | "plain" = "plain", onClick?: () => void) => {
    const inner = (
      <>
        <span>{t(label)}</span>
        <strong>{value ?? "—"}</strong>
      </>
    );
    return onClick ? (
      <button type="button" className={`fraud-count ${tone}`} onClick={onClick}>
        {inner}
      </button>
    ) : (
      <div className={`fraud-count ${tone}`}>{inner}</div>
    );
  };

  return (
    <section>
      <PageHeader
        title="Fraud detection"
        intro="Every 10 minutes the system checks recent activity against the limits below. A match opens an alert here and texts staff who can see cases. Nothing is blocked by itself: look at the customer, then dismiss, escalate, or confirm fraud and hold the account."
      />
      {done && <p className="notice">{t(done)}</p>}
      <div className="fraud-counts">
        {counter("Open alerts", s?.open, s?.open ? "warn" : "plain", () => { setStatus("open"); setOnlyEscalated(false); setRule(""); setPage(1); })}
        {counter("Escalated", s?.escalated, s?.escalated ? "warn" : "plain", () => { setStatus("open"); setOnlyEscalated(true); setPage(1); })}
        {counter("PIN lockouts (24 hours)", s?.pinLockouts24h)}
        {counter("Accounts on hold", s?.onHold)}
        {counter("Alerts this week", s?.opened7d)}
      </div>
      {s && (
        <p className="muted small">
          {s.lastRunAt ? t("Last check {when}.", { when: when(s.lastRunAt) }) : t("No check has run yet.")}{" "}
          {t("Closed this week: {no} no fraud, {yes} fraud, {other} resolved.", { no: s.closed7d.no_fraud ?? 0, yes: s.closed7d.fraud ?? 0, other: s.closed7d.resolved ?? 0 })}
        </p>
      )}

      <div className="row-start" style={{ flexWrap: "wrap", gap: 12, margin: "12px 0" }}>
        <Tabs value={status} options={[["open", "Open"], ["closed", "Closed"]] as const} onChange={(v) => { setStatus(v); setPage(1); }} />
        <label className="small">
          {t("Alert type")}{" "}
          <select value={rule} onChange={(e) => { setRule(e.target.value); setPage(1); }}>
            <option value="">{t("All")}</option>
            {Object.entries(RULE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {t(label)}
                {s?.openByRule[k] ? ` (${s.openByRule[k]})` : ""}
              </option>
            ))}
          </select>
        </label>
        {status === "open" && (
          <label className="check small">
            <input type="checkbox" checked={onlyEscalated} onChange={(e) => { setOnlyEscalated(e.target.checked); setPage(1); }} /> {t("Escalated only")}
          </label>
        )}
      </div>

      <LoadState loading={list.loading && !list.data} error={list.error} empty={!!list.data && !list.data.cases.length} />
      {list.data && list.data.cases.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>{t("Customer")}</th>
                <th>{t("Alert type")}</th>
                <th>{t("Time")}</th>
                <th>{t("Status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data.cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.customer ? (can(staff, "view_customers") ? <Link to={`/customers?open=${c.customer.id}`}>{c.customer.name || c.customer.id}</Link> : c.customer.name) : "—"}
                  </td>
                  <td>{t(RULE_LABEL[c.rule ?? ""] ?? c.rule ?? "")}</td>
                  <td className="small">{when(c.createdAt)}</td>
                  <td>
                    {c.status === "open" ? (
                      c.escalatedAt ? <Badge tone="warn">Escalated</Badge> : <Badge tone="plain">Open</Badge>
                    ) : (
                      <Badge tone={c.outcome === "fraud" ? "warn" : "ok"}>{c.outcome === "fraud" ? "Fraud" : c.outcome === "no_fraud" ? "No fraud" : "Resolved"}</Badge>
                    )}
                  </td>
                  <td>
                    <button onClick={() => setViewing(c)}>{t("View")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager pagination={list.data.pagination} onPage={setPage} />
        </div>
      )}

      <FraudLimitsBox />

      {viewing && !action && (
        <ConfirmWithPin title="Fraud alert" confirmLabel="Close" needsPin={false} hideConfirm onClose={() => setViewing(null)} onConfirm={async () => setViewing(null)}>
          <dl className="facts">
            <dt>{t("Alert type")}</dt>
            <dd>{t(RULE_LABEL[viewing.rule ?? ""] ?? viewing.rule ?? "")}</dd>
            <dt>{t("Rule")}</dt>
            <dd>{t(RULE_HELP[viewing.rule ?? ""] ?? "")}</dd>
            <dt>{t("What was found")}</dt>
            <dd>{viewing.note}</dd>
            <dt>{t("Customer")}</dt>
            <dd>{viewing.customer ? `${viewing.customer.name} · ${viewing.customer.phone}` : "—"}</dd>
            <dt>{t("Opened")}</dt>
            <dd>{when(viewing.createdAt)}</dd>
            {viewing.escalatedAt && (
              <>
                <dt>{t("Escalated")}</dt>
                <dd>{t("By {name}, {when}: {note}", { name: personLabel(viewing.escalatedBy), when: when(viewing.escalatedAt), note: viewing.escalateNote ?? "" })}</dd>
              </>
            )}
            {viewing.status === "closed" && (
              <>
                <dt>{t("Closed")}</dt>
                <dd>{t("By {name}, {when}: {note}", { name: personLabel(viewing.closedBy), when: when(viewing.closedAt), note: viewing.closeNote })}</dd>
              </>
            )}
          </dl>
          {viewing.status === "open" && (
            <>
              <p className="hint">{t("Open the customer's file and their recent payments, and call them if needed. Nothing has been blocked.")}</p>
              <div className="row-start" style={{ flexWrap: "wrap", gap: 8 }}>
                {mayClose && (
                  <button className="warn-outline" onClick={() => { setNote(""); setAction({ kind: "dismiss", c: viewing }); }}>
                    {t("Dismiss: no fraud")}
                  </button>
                )}
                {!viewing.escalatedAt && (
                  <button className="primary" onClick={() => { setNote(""); setAction({ kind: "escalate", c: viewing }); }}>
                    {t("Escalate")}
                  </button>
                )}
                {mayClose && (
                  <button className="danger" onClick={() => { setNote(""); setAction({ kind: "fraud", c: viewing }); }}>
                    {t("Confirm fraud")}
                  </button>
                )}
                {mayClose && (
                  <button onClick={() => { setNote(""); setAction({ kind: "resolved", c: viewing }); }}>
                    {t("Resolved another way")}
                  </button>
                )}
              </div>
            </>
          )}
        </ConfirmWithPin>
      )}

      {action && (
        <ConfirmWithPin
          title={action.kind === "escalate" ? "Escalate this alert" : action.kind === "dismiss" ? "Dismiss: no fraud" : action.kind === "fraud" ? "Confirm fraud" : "Close as resolved"}
          confirmLabel={action.kind === "escalate" ? "Escalate" : "Close the alert"}
          danger={action.kind === "fraud"}
          needsPin={false}
          canConfirm={okLength(note, 10, 300)}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            if (action.kind === "escalate") {
              await escalateFraudAlert(action.c.id, note.trim());
              setDone("Escalated. Staff who can hold accounts were told.");
            } else {
              await closeComplianceCase(action.c.id, note.trim(), action.kind === "dismiss" ? "no_fraud" : action.kind === "fraud" ? "fraud" : "resolved");
              setDone(action.kind === "fraud" ? "Closed as fraud. Hold the account on the Account holds page if you haven't." : "Alert closed.");
              // Fraud: offer to hold the account straight away.
              if (action.kind === "fraud" && action.c.customer && can(staff, "place_hold")) setHolding(action.c);
            }
            setAction(null);
            setViewing(null);
          }}
        >
          {action.kind === "escalate" && <p>{t("The alert stays open and goes to the top of the list. Staff who can hold accounts get a text and email (with no customer details).")}</p>}
          {action.kind === "dismiss" && <p>{t("You looked and it's fine (for example, the customer confirmed the payments). The alert closes as no fraud.")}</p>}
          {action.kind === "fraud" && (
            <p>
              {t("The alert closes as fraud. Next you can hold the account, so no money can leave it.")} <Link to="/holds">{t("Account holds")}</Link>
            </p>
          )}
          <TextArea label={action.kind === "escalate" ? "Why escalate?" : "What you found and did"} value={note} onChange={setNote} min={10} max={300} />
        </ConfirmWithPin>
      )}
      {holding?.customer && (
        <PlaceHoldDialog
          customer={{ id: holding.customer.id, label: holding.customer.name || holding.customer.phone }}
          onDone={() => {
            setHolding(null);
            setDone("Closed as fraud and the account is on hold.");
          }}
          onClose={() => setHolding(null)}
        />
      )}
    </section>
  );
}
