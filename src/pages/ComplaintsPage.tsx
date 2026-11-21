import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  acknowledgeComplaint,
  closeComplaint,
  complaints,
  holdingResponse,
  logComplaint,
  type Complaint,
  type ComplaintCategory,
  type ComplaintChannel,
  type ComplaintCountry,
  type ComplaintFilter,
  type ComplaintOutcome,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { ComplaintReturnView } from "./ComplaintReturn";
import { useT } from "../i18n/language";

export const CHANNEL_LABEL: Record<ComplaintChannel, string> = {
  app: "In the app",
  email: "Email",
  phone: "Phone call",
  in_person: "In person",
  post: "Post",
  other: "Other",
};
export const CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  payment: "A payment or transfer",
  emoney: "Money in the wallet",
  fees: "Fees or rates",
  service: "Service or staff",
  fraud: "Fraud or scam",
  other: "Something else",
};
export const COUNTRY_LABEL: Record<ComplaintCountry, string> = { GB: "United Kingdom", GM: "The Gambia", SN: "Senegal", OTHER: "Other country" };
export const OUTCOME_LABEL: Record<ComplaintOutcome, string> = {
  upheld: "Upheld (the customer was right)",
  partly_upheld: "Partly upheld",
  not_upheld: "Not upheld",
  withdrawn: "Withdrawn by the customer",
};
export const HISTORY_LABEL: Record<Complaint["history"][number]["kind"], string> = {
  logged: "Logged",
  acknowledged: "Acknowledged in writing",
  holding: "Holding response sent",
  closed: "Closed with a final response",
};

/** What to tell staff about the clock on one complaint, as a label and a tone. */
export function clockBadge(c: Complaint): { text: string; tone: "danger" | "warn" | "ok" | "plain" } | null {
  if (c.status === "closed") return null;
  if (c.clock.finalLate) return { text: "Final response is late", tone: "danger" };
  if (c.clock.ackLate) return { text: "Acknowledgement is late", tone: "danger" };
  if (c.clock.dueSoon) return { text: "Final response due soon", tone: "warn" };
  return { text: "Within time", tone: "ok" };
}

export function ComplaintsPage() {
  const { staff } = useAuth();
  const t = useT();
  const [filter, setFilter] = useState<ComplaintFilter>("open");
  const [page, setPage] = useState(1);
  const [done, setDone] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  // Opened from a customer's file: only that customer's complaints, and the log form is ready for them.
  const customer = params.get("customer") ? { id: params.get("customer") as string, name: params.get("name") ?? "" } : null;
  const [dialog, setDialog] = useState<{ kind: "log" } | { kind: "ack" | "holding" | "close"; c: Complaint } | null>(params.get("new") === "1" ? { kind: "log" } : null);
  const { data, error, loading, reload } = useLoad(() => complaints(filter, page, customer?.id ?? ""), [filter, page, customer?.id]);
  const rows = data?.complaints ?? [];
  const mayLog = can(staff, "manage_tickets");
  const mayClose = can(staff, "close_complaints") && mayLog;
  const mayReturn = can(staff, "view_complaint_return");
  const [showReturn, setShowReturn] = useState(false);
  const finish = (message: string) => {
    setDialog(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader
        title="Complaints"
        intro="Every complaint, from any country, with the clock the FCA sets. Send a written acknowledgement within 3 business days and a final response within 15 business days (35 only in exceptional cases, with a holding response by day 15). Weekends are skipped; bank holidays are not, so a date shown can be a day early but never late."
        actions={
          <>
            {mayReturn && <button onClick={() => setShowReturn((v) => !v)}>{showReturn ? t("Back to complaints") : t("FCA return")}</button>}
            {mayLog && <button onClick={() => setDialog({ kind: "log" })}>{t("Log a complaint")}</button>}
          </>
        }
      />
      {showReturn && <ComplaintReturnView />}
      {customer && (
        <p className="notice">
          {t("Showing complaints from {name} only.", { name: customer.name || t("this customer") })}{" "}
          <button className="link" onClick={() => setParams({})}>{t("Show all")}</button>
        </p>
      )}
      {data && (
        <p className="muted small">
          {t("{open} open, {late} late, {soon} due within 3 days", { open: data.counts.open, late: data.counts.late, soon: data.counts.dueSoon })}
        </p>
      )}
      <Tabs
        value={filter}
        options={[
          ["open", "Open"],
          ["late", "Late"],
          ["closed", "Closed"],
        ] as const}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((c) => {
        const badge = clockBadge(c);
        return (
          <article key={c.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p>
              <strong>#{c.number}</strong> <Badge tone="plain">{t(COUNTRY_LABEL[c.country])}</Badge> <Badge tone="plain">{t(CATEGORY_LABEL[c.category])}</Badge>{" "}
              {badge && <Badge tone={badge.tone}>{t(badge.text)}</Badge>}
            </p>
            <dl className="facts">
              <dt>{t("From")}</dt>
              <dd>{c.customer?.name || c.complainantName}{c.contact ? ` · ${c.contact}` : ""}</dd>
              <dt>{t("Came in")}</dt>
              <dd>{when(c.receivedAt)} · {t(CHANNEL_LABEL[c.channel])}</dd>
              {c.status === "open" && (
                <>
                  <dt>{t("Acknowledge by")}</dt>
                  <dd>{c.acknowledgedAt ? t("Done {when}", { when: when(c.acknowledgedAt) }) : when(c.clock.ackDue)}</dd>
                  <dt>{t("Final response by")}</dt>
                  <dd>{when(c.clock.finalDue)}{c.holdingAt ? ` (${t("holding response sent")})` : ""}</dd>
                </>
              )}
              {c.status === "closed" && c.outcome && (
                <>
                  <dt>{t("Outcome")}</dt>
                  <dd>{t(OUTCOME_LABEL[c.outcome])}, {when(c.closedAt)}</dd>
                </>
              )}
            </dl>
            <p>{c.summary}</p>
            {c.retainUntil && <p className="muted small">{t("Keep this record until at least {date}.", { date: when(c.retainUntil) })}</p>}
            <ul className="plain-list">
              {c.history.map((h, i) => (
                <li key={i} className="small muted">
                  {t(HISTORY_LABEL[h.kind])} · {h.by} · {when(h.at)}{h.note ? `: ${h.note}` : ""}
                </li>
              ))}
            </ul>
            {c.status === "open" && (
              <p>
                {mayLog && !c.acknowledgedAt && <button onClick={() => setDialog({ kind: "ack", c })}>{t("Record acknowledgement")}</button>}{" "}
                {mayLog && !c.holdingAt && !c.clock.finalLate && <button onClick={() => setDialog({ kind: "holding", c })}>{t("Record holding response")}</button>}{" "}
                {mayClose && <button onClick={() => setDialog({ kind: "close", c })}>{t("Close with final response")}</button>}
              </p>
            )}
          </article>
        );
      })}
      <Pager pagination={data?.pagination} onPage={setPage} />
      {dialog?.kind === "log" && <LogDialog customer={customer} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog?.kind === "ack" && <AckDialog c={dialog.c} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog?.kind === "holding" && <HoldingDialog c={dialog.c} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog?.kind === "close" && <CloseDialog c={dialog.c} onClose={() => setDialog(null)} onDone={finish} />}
    </section>
  );
}

type DialogProps = { onClose: () => void; onDone: (message: string) => void };

function LogDialog({ customer, onClose, onDone }: DialogProps & { customer: { id: string; name: string } | null }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [name, setName] = useState(customer?.name ?? "");
  const [contact, setContact] = useState("");
  const [channel, setChannel] = useState<ComplaintChannel>("phone");
  const [category, setCategory] = useState<ComplaintCategory>("payment");
  const [country, setCountry] = useState<ComplaintCountry>("GM");
  const [summary, setSummary] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  return (
    <ConfirmWithPin
      title="Log a complaint"
      confirmLabel="Log it"
      needsPin={false}
      canConfirm={(customer !== null || name.trim().length > 1) && okLength(summary, 10, 2000)}
      onClose={onClose}
      onConfirm={async () => {
        await logComplaint({ summary: summary.trim(), channel, category, country, complainantName: name.trim(), contact: contact.trim(), receivedAt: receivedAt ? new Date(receivedAt).toISOString() : undefined, customerId: customer?.id }, key);
        onDone("Complaint logged. The clock started when it came in.");
      }}
    >
      <p>{t("Log it the moment it comes in, whatever way it arrives. The clock starts then.")}</p>
      {customer && <p className="hint">{t("This complaint will be linked to {name}'s file.", { name: customer.name || t("this customer") })}</p>}
      <label>{t("Who is complaining")}<input type="text" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
      <label>{t("Phone or email to reply to (optional)")}<input type="text" value={contact} maxLength={160} onChange={(e) => setContact(e.target.value)} /></label>
      <label>{t("How it came in")}
        <select value={channel} onChange={(e) => setChannel(e.target.value as ComplaintChannel)}>
          {(Object.keys(CHANNEL_LABEL) as ComplaintChannel[]).map((k) => <option key={k} value={k}>{t(CHANNEL_LABEL[k])}</option>)}
        </select>
      </label>
      <label>{t("What it is about")}
        <select value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
          {(Object.keys(CATEGORY_LABEL) as ComplaintCategory[]).map((k) => <option key={k} value={k}>{t(CATEGORY_LABEL[k])}</option>)}
        </select>
      </label>
      <label>{t("Country")}
        <select value={country} onChange={(e) => setCountry(e.target.value as ComplaintCountry)}>
          {(Object.keys(COUNTRY_LABEL) as ComplaintCountry[]).map((k) => <option key={k} value={k}>{t(COUNTRY_LABEL[k])}</option>)}
        </select>
      </label>
      <label>{t("When it came in (leave empty for now; at most 90 days ago)")}<input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} /></label>
      <TextArea label="What the complaint says" value={summary} onChange={setSummary} min={10} max={2000} />
    </ConfirmWithPin>
  );
}

function AckDialog({ c, onClose, onDone }: DialogProps & { c: Complaint }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [note, setNote] = useState("");
  return (
    <ConfirmWithPin
      title="Record acknowledgement"
      confirmLabel="Record it"
      needsPin={false}
      canConfirm={okLength(note, 10, 1000)}
      onClose={onClose}
      onConfirm={async () => {
        await acknowledgeComplaint(c.id, note.trim(), key);
        onDone("Acknowledgement recorded.");
      }}
    >
      <p>{t("Only record this after you have told the customer, in writing, that you received the complaint.")}</p>
      <TextArea label="How and when you told them" value={note} onChange={setNote} min={10} max={1000} />
    </ConfirmWithPin>
  );
}

function HoldingDialog({ c, onClose, onDone }: DialogProps & { c: Complaint }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  return (
    <ConfirmWithPin
      title="Record holding response"
      confirmLabel="Record it"
      needsPin={false}
      canConfirm={okLength(reason, 10, 1000) && date !== ""}
      onClose={onClose}
      onConfirm={async () => {
        await holdingResponse(c.id, reason.trim(), new Date(`${date}T12:00:00Z`).toISOString(), key);
        onDone("Holding response recorded.");
      }}
    >
      <p>{t("Only in exceptional circumstances, and by day 15. Tell the customer why the answer is delayed and the date of the final response. That date can be day 35 at the latest.")}</p>
      <TextArea label="Why it is delayed" value={reason} onChange={setReason} min={10} max={1000} />
      <label>{t("Date the final response will be sent")}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
    </ConfirmWithPin>
  );
}

function CloseDialog({ c, onClose, onDone }: DialogProps & { c: Complaint }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [outcome, setOutcome] = useState<ComplaintOutcome>("not_upheld");
  const [informed, setInformed] = useState(false);
  const [note, setNote] = useState("");
  const [redress, setRedress] = useState("");
  const [redressCurrency, setRedressCurrency] = useState("GBP");
  const redressMinor = parseRedress(redress);
  return (
    <ConfirmWithPin
      title="Close with final response"
      confirmLabel="Close complaint"
      canConfirm={informed && okLength(note, 10, 1000) && redressMinor !== null}
      onClose={onClose}
      onConfirm={async (pin) => {
        await closeComplaint(c.id, { outcome, note: note.trim(), ombudsmanInformed: true, pin, ...(redressMinor ? { redressMinor, redressCurrency } : {}) }, key);
        onDone("Complaint closed.");
      }}
    >
      <p>{t("Close it only after the final response has been sent to the customer. A closed complaint cannot be reopened.")}</p>
      <label>{t("Outcome")}
        <select value={outcome} onChange={(e) => setOutcome(e.target.value as ComplaintOutcome)}>
          {(Object.keys(OUTCOME_LABEL) as ComplaintOutcome[]).map((k) => <option key={k} value={k}>{t(OUTCOME_LABEL[k])}</option>)}
        </select>
      </label>
      <label>
        <input type="checkbox" checked={informed} onChange={(e) => setInformed(e.target.checked)} /> {t("The final response tells the customer they can take the complaint to the Financial Ombudsman Service.")}
      </label>
      <TextArea label="What the final response said and how it was sent" value={note} onChange={setNote} min={10} max={1000} />
      <label>
        {t("Money paid or credited to put it right (leave empty if none)")}
        <span className="row-start">
          <input inputMode="decimal" value={redress} onChange={(e) => setRedress(e.target.value)} placeholder="0.00" />
          <select value={redressCurrency} onChange={(e) => setRedressCurrency(e.target.value)}>
            {/* Currencies with pence-style cents only, so the amount reads the same. */}
            {["GBP", "EUR", "GMD"].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </span>
      </label>
      {redressMinor === null && <p className="error">{t("Enter the amount like 25 or 25.50.")}</p>}
    </ConfirmWithPin>
  );
}

/** "25.50" -> 2550; empty -> 0; anything else -> null. Two decimals at most. */
export function parseRedress(text: string): number | null {
  const s = text.trim();
  if (!s) return 0;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
