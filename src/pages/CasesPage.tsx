import { useState } from "react";
import { closeComplianceCase, complianceCases, type CaseType, type ComplianceCaseRow } from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

export const CASE_LABEL: Record<CaseType, string> = {
  agent_debt: "Agent couldn't pay back",
  customer_debt: "Customer couldn't pay back",
  reversal_alert: "Many reversals on one agent",
};

const WHAT_NEXT: Record<CaseType, string> = {
  agent_debt: "A reversal was refused because the agent's balance was too low. Sunu Pay never lends, so nothing was taken. Contact the agent, then close this with what was agreed.",
  customer_debt: "A reversal was refused because the customer's balance was too low. Sunu Pay never lends, so nothing was taken. Contact the customer, then close this with what was agreed.",
  reversal_alert: "Three or more reversals against this agent in 30 days. Look at their recent cash outs on the Agents page. Suspending them is your decision; nothing happens by itself.",
};

/** Debt and reversal-alert cases. Closing one only records what was done; no money moves. */
export function CasesPage() {
  const { staff } = useAuth();
  const t = useT();
  const [type, setType] = useState<CaseType | "all">("all");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [page, setPage] = useState(1);
  const [closing, setClosing] = useState<ComplianceCaseRow | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => complianceCases(type, status, page), [type, status, page]);
  const rows = data?.cases ?? [];
  const mayClose = can(staff, "close_cases");

  return (
    <section>
      <PageHeader title="Debt and alert cases" intro="Cases the system opened for staff to look into: reversals refused because a balance was too low, and agents with many reversals. Blocklist matches are on the Blocklist page." />
      <Tabs
        value={status}
        options={[
          ["open", "Open"],
          ["closed", "Closed"],
        ] as const}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      <Tabs
        value={type}
        options={[
          ["all", "All"],
          ["agent_debt", "Agent couldn't pay back"],
          ["customer_debt", "Customer couldn't pay back"],
          ["reversal_alert", "Many reversals on one agent"],
        ] as const}
        onChange={(v) => {
          setType(v);
          setPage(1);
        }}
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((c) => {
        const kind = c.type as CaseType;
        return (
          <article key={c.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p>
              <Badge tone={c.status === "open" ? "warn" : "plain"}>{t(CASE_LABEL[kind] ?? c.type)}</Badge> <span className="muted small">{when(c.createdAt)}</span>
            </p>
            <dl className="facts">
              {c.agent && (
                <>
                  <dt>{t("Agent")}</dt>
                  <dd>{personLabel(c.agent)}</dd>
                </>
              )}
              {c.customer && (
                <>
                  <dt>{t("Customer")}</dt>
                  <dd>{personLabel(c.customer)}</dd>
                </>
              )}
              {c.amountMinor !== null && c.currency && (
                <>
                  <dt>{t("Amount")}</dt>
                  <dd>{money(c.amountMinor, c.currency)}</dd>
                </>
              )}
              {c.note && (
                <>
                  <dt>{t("Note")}</dt>
                  <dd>{c.note}</dd>
                </>
              )}
            </dl>
            {c.status === "open" && WHAT_NEXT[kind] && <p className="hint" style={{ marginTop: 12 }}>{t(WHAT_NEXT[kind])}</p>}
            {c.status === "closed" && (
              <p className="muted small">{t("Closed by {name}, {when}: {note}", { name: personLabel(c.closedBy), when: when(c.closedAt), note: c.closeNote })}</p>
            )}
            {c.status === "open" && mayClose && <button onClick={() => setClosing(c)}>{t("Close case")}</button>}
          </article>
        );
      })}
      <Pager pagination={data?.pagination} onPage={setPage} />
      {closing && (
        <ConfirmWithPin
          title="Close this case"
          confirmLabel="Close case"
          needsPin={false}
          canConfirm={okLength(note, 10, 300)}
          onClose={() => {
            setClosing(null);
            setNote("");
          }}
          onConfirm={async () => {
            await closeComplianceCase(closing.id, note.trim());
            setClosing(null);
            setNote("");
            setDone("Case closed.");
            reload();
          }}
        >
          <p>{t("Closing only records what was done. No money moves, and the case stays in the Closed list.")}</p>
          <TextArea label="What was done" value={note} onChange={setNote} min={10} max={300} />
        </ConfirmWithPin>
      )}
    </section>
  );
}
