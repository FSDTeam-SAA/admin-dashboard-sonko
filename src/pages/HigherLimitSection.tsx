import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  DOCUMENT_KINDS,
  approveHigherLimit,
  customerHigherLimit,
  endHigherLimit,
  proposeHigherLimit,
  rejectHigherLimit,
  type DocumentKind,
  type HigherLimit,
  type HigherLimitProposal,
  type HigherLimitSettings,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

export const DOC_LABEL: Record<string, string> = Object.fromEntries(DOCUMENT_KINDS);
export const HIGHER_STATUS: Record<HigherLimit["status"], string> = {
  awaiting_approval: "Waiting for a second person",
  active: "In force",
  rejected: "Turned down",
  lapsed: "Not approved in time",
  ended: "Ended early",
  expired: "Review date passed",
  replaced: "Replaced by a newer approval",
};

export type TypedDoc = { kind: DocumentKind | ""; note: string; seenOn: string };
export type TypedProposal = {
  day: string;
  month: string;
  sourceOfWealth: string;
  sourceOfFunds: string;
  documents: TypedDoc[];
  screenedClear: boolean;
  riskNotes: string;
  reason: string;
};

const pounds = (raw: string) => {
  const s = raw.trim().replace(/[£,\s]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(Number(s) * 100) : NaN;
};

/** The same checks as the server, so staff see the problem before sending. Amounts are typed in pounds. */
export function readProposal(typed: TypedProposal, tier: HigherLimitSettings, today = new Date()): { value?: HigherLimitProposal; error?: string } {
  const dayMinor = pounds(typed.day);
  const monthMinor = pounds(typed.month);
  if (!Number.isSafeInteger(dayMinor) || dayMinor < 1 || dayMinor > tier.maxDayMinor) return { error: "The 24-hour limit is above the highest allowed." };
  if (!Number.isSafeInteger(monthMinor) || monthMinor < dayMinor || monthMinor > tier.maxMonthMinor) return { error: "The 30-day limit must be at least the 24-hour limit and not above the highest allowed." };
  if (!okLength(typed.sourceOfWealth, 20, 1000)) return { error: "Describe how the customer built their wealth (20 to 1,000 characters)." };
  if (!okLength(typed.sourceOfFunds, 20, 1000)) return { error: "Describe where the money they will send comes from (20 to 1,000 characters)." };
  if (!typed.documents.length) return { error: "Record at least one document you checked." };
  const oldest = new Date(today.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  const todayKey = today.toISOString().slice(0, 10);
  for (const d of typed.documents) {
    if (!d.kind) return { error: "Choose what each document is." };
    if (!okLength(d.note, 3, 200)) return { error: "Say what each document shows (3 to 200 characters)." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.seenOn) || d.seenOn > todayKey) return { error: "Each document needs the date you checked it, not in the future." };
    if (d.seenOn < oldest) return { error: "Documents must have been checked in the last 90 days." };
  }
  if (!typed.screenedClear) return { error: "Screen the customer against sanctions and PEP lists first." };
  if (typed.riskNotes.trim().length > 1000) return { error: "Keep the risk notes to 1,000 characters." };
  if (!okLength(typed.reason, 10, 300)) return { error: "Write a reason of 10 to 300 characters." };
  return {
    value: {
      dayMinor,
      monthMinor,
      sourceOfWealth: typed.sourceOfWealth.trim(),
      sourceOfFunds: typed.sourceOfFunds.trim(),
      documents: typed.documents.map((d) => ({ kind: d.kind as DocumentKind, note: d.note.trim(), seenOn: d.seenOn })),
      screenedClear: true,
      riskNotes: typed.riskNotes.trim(),
      reason: typed.reason.trim(),
    },
  };
}

function Details({ h }: { h: HigherLimit }) {
  const t = useT();
  return (
    <>
      <table className="mini">
        <tbody>
          <tr>
            <td>{t("In 24 hours")}</td>
            <td className="num">{money(h.dayMinor, "GBP")}</td>
          </tr>
          <tr>
            <td>{t("In 30 days")}</td>
            <td className="num">{money(h.monthMinor, "GBP")}</td>
          </tr>
          {h.reviewBy && (
            <tr>
              <td>{t("Ends on (review date)")}</td>
              <td>{when(h.reviewBy)}</td>
            </tr>
          )}
          <tr>
            <td>{t("Checks recorded by")}</td>
            <td>{t("{name}, {when}", { name: h.proposedBy || "—", when: when(h.proposedAt) })}</td>
          </tr>
          {h.approvedBy && (
            <tr>
              <td>{t("Approved by")}</td>
              <td>{t("{name}, {when}", { name: h.approvedBy, when: when(h.approvedAt) })}</td>
            </tr>
          )}
        </tbody>
      </table>
      {h.private ? (
        <p className="muted small">{t("The checks behind this limit (source of wealth, source of funds, documents) are only shown to staff who handle sending limits.")}</p>
      ) : (
        <>
          <p>
            <strong>{t("Source of wealth")}:</strong> {h.sourceOfWealth}
          </p>
          <p>
            <strong>{t("Source of funds")}:</strong> {h.sourceOfFunds}
          </p>
          <h3>{t("Documents checked")}</h3>
          <ul>
            {(h.documents ?? []).map((d, i) => (
              <li key={i}>
                {t(DOC_LABEL[d.kind] ?? d.kind)}: {d.note} <span className="muted small">({when(d.seenOn)})</span>
              </li>
            ))}
          </ul>
          <p className="small">{h.screenedClear ? t("Screened against sanctions and PEP lists: no match.") : ""}</p>
          {h.riskNotes && (
            <p>
              <strong>{t("Risk notes")}:</strong> {h.riskNotes}
            </p>
          )}
          {h.proposeReason && <p className="muted small">{t("Why: {reason}", { reason: h.proposeReason })}</p>}
          {h.approveReason && <p className="muted small">{t("Approval note: {reason}", { reason: h.approveReason })}</p>}
        </>
      )}
    </>
  );
}

function ProposalForm({ tier, onTyped, typed }: { tier: HigherLimitSettings; typed: TypedProposal; onTyped: (t: TypedProposal) => void }) {
  const t = useT();
  const set = (patch: Partial<TypedProposal>) => onTyped({ ...typed, ...patch });
  const setDoc = (i: number, patch: Partial<TypedDoc>) => set({ documents: typed.documents.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  return (
    <>
      <p className="hint">{t("Record the extra checks. A different staff member approves with their PIN; only then does the higher limit start. It ends by itself after {n} months.", { n: tier.reviewMonths })}</p>
      <label>
        {t("Limit in 24 hours (£)")} <span className="muted small">{t("up to {amount}", { amount: money(tier.maxDayMinor, "GBP") })}</span>
        <input inputMode="decimal" value={typed.day} onChange={(e) => set({ day: e.target.value })} />
      </label>
      <label>
        {t("Limit in 30 days (£)")} <span className="muted small">{t("up to {amount}", { amount: money(tier.maxMonthMinor, "GBP") })}</span>
        <input inputMode="decimal" value={typed.month} onChange={(e) => set({ month: e.target.value })} />
      </label>
      <TextArea label="Source of wealth: how the customer built their wealth" value={typed.sourceOfWealth} onChange={(v) => set({ sourceOfWealth: v })} min={20} max={1000} />
      <TextArea label="Source of funds: where the money they will send comes from" value={typed.sourceOfFunds} onChange={(v) => set({ sourceOfFunds: v })} min={20} max={1000} />
      <h3>{t("Documents checked")}</h3>
      {typed.documents.map((d, i) => (
        <div className="row" key={i}>
          <select aria-label={t("Document")} value={d.kind} onChange={(e) => setDoc(i, { kind: e.target.value as DocumentKind })}>
            <option value="">{t("Choose…")}</option>
            {DOCUMENT_KINDS.map(([k, label]) => (
              <option key={k} value={k}>
                {t(label)}
              </option>
            ))}
          </select>
          <input aria-label={t("What it shows")} placeholder={t("What it shows")} value={d.note} maxLength={200} onChange={(e) => setDoc(i, { note: e.target.value })} />
          <input aria-label={t("Checked on")} type="date" value={d.seenOn} onChange={(e) => setDoc(i, { seenOn: e.target.value })} />
          <button type="button" className="link" onClick={() => set({ documents: typed.documents.filter((_, j) => j !== i) })}>
            {t("Remove")}
          </button>
        </div>
      ))}
      {typed.documents.length < 10 && (
        <button type="button" onClick={() => set({ documents: [...typed.documents, { kind: "", note: "", seenOn: new Date().toISOString().slice(0, 10) }] })}>
          {t("Add a document")}
        </button>
      )}
      <label className="check">
        <input type="checkbox" checked={typed.screenedClear} onChange={(e) => set({ screenedClear: e.target.checked })} /> {t("I screened the customer against sanctions and PEP lists and found no match. (If there is a possible match, stop and escalate it to a senior person.)")}
      </label>
      <TextArea label="Risk notes (optional)" value={typed.riskNotes} onChange={(v) => set({ riskNotes: v })} min={0} max={1000} />
      <TextArea label="Reason" value={typed.reason} onChange={(v) => set({ reason: v })} min={10} max={300} />
    </>
  );
}

type Action = { kind: "start" } | { kind: "approve"; h: HigherLimit } | { kind: "reject"; h: HigherLimit } | { kind: "end"; h: HigherLimit };

/** On the customer file: the customer's higher limit, the checks behind it, and the buttons to start, approve, turn down or end one. */
export function HigherLimitSection({ customerId }: { customerId: string }) {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => customerHigherLimit(customerId), [customerId]);
  const [action, setAction] = useState<Action | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState<TypedProposal>({ day: "", month: "", sourceOfWealth: "", sourceOfFunds: "", documents: [], screenedClear: false, riskNotes: "", reason: "" });
  const key = useMemo(newIdempotencyKey, [action]);
  const may = can(staff, "manage_limits");
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const finish = (text: string) => {
    setAction(null);
    setReason("");
    setDone(text);
    reload();
  };
  const read = readProposal(typed, data.settings);
  const start = () => {
    setTyped({ day: String(data.settings.maxDayMinor / 100), month: String(data.settings.maxMonthMinor / 100), sourceOfWealth: "", sourceOfFunds: "", documents: [], screenedClear: false, riskNotes: "", reason: "" });
    setDone(null);
    setAction({ kind: "start" });
  };
  return (
    <div className="card panel">
      <h2>{t("Higher sending limit")}</h2>
      {done && <p role="status">{t(done)}</p>}
      {data.request && (
        <p className="notice">
          {t("The customer asked in the app for a higher limit ({files} documents attached).", { files: data.request.files })} <Link to={`/tickets?open=${encodeURIComponent(data.request.ticketId)}`}>{t("Open ticket #{n}", { n: data.request.number })}</Link>
        </p>
      )}
      {!data.active && !data.waiting && <p className="muted">{t("Standard limits. No higher limit.")}</p>}
      {data.active && (
        <article>
          <h3>
            <Badge tone="ok">{t(HIGHER_STATUS.active)}</Badge>
          </h3>
          <Details h={data.active} />
          {may && (
            <button className="danger" onClick={() => setAction({ kind: "end", h: data.active! })}>
              {t("End early")}
            </button>
          )}
        </article>
      )}
      {data.waiting && (
        <article>
          <h3>
            <Badge tone="warn">{t(HIGHER_STATUS.awaiting_approval)}</Badge>
          </h3>
          <Details h={data.waiting} />
          {may && staff?._id !== data.waiting.proposedById && <button onClick={() => setAction({ kind: "approve", h: data.waiting! })}>{t("Approve")}</button>}{" "}
          {may && <button onClick={() => setAction({ kind: "reject", h: data.waiting! })}>{t("Turn down")}</button>}
          {staff?._id === data.waiting.proposedById && <p className="muted small">{t("You recorded these checks, so a different staff member must approve.")}</p>}
        </article>
      )}
      {may && !data.waiting && (
        <button onClick={start}>{data.active ? t("Renew: record new checks") : t("Start higher-limit checks")}</button>
      )}
      {data.history.length > 0 && (
        <details>
          <summary>{t("Earlier higher limits ({n})", { n: data.history.length })}</summary>
          <ul>
            {data.history.map((h) => (
              <li key={h.id}>
                {t(HIGHER_STATUS[h.status])}: {money(h.dayMinor, "GBP")} / {money(h.monthMinor, "GBP")} · {when(h.closedAt ?? h.proposedAt)}
                {h.closeReason ? ` · ${h.closeReason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      {action?.kind === "start" && (
        <ConfirmWithPin
          title="Higher limit checks"
          confirmLabel="Send for approval"
          canConfirm={Boolean(read.value)}
          onClose={() => setAction(null)}
          onConfirm={async (pin) => {
            await proposeHigherLimit(customerId, { ...read.value!, ...(data.request ? { ticketId: data.request.ticketId } : {}) }, pin, key);
            finish("Checks recorded. A different staff member must approve within 7 days.");
          }}
        >
          <ProposalForm tier={data.settings} typed={typed} onTyped={setTyped} />
          {read.error && <p className="error">{t(read.error)}</p>}
        </ConfirmWithPin>
      )}
      {action?.kind === "approve" && (
        <ConfirmWithPin
          title="Approve higher limit"
          confirmLabel="Approve"
          canConfirm={okLength(reason, 10, 300)}
          onClose={() => setAction(null)}
          onConfirm={async (pin) => {
            await approveHigherLimit(action.h.id, reason.trim(), pin, key);
            finish("Higher limit approved. It is in force now.");
          }}
        >
          <p>{t("Approve {day} in 24 hours and {month} in 30 days, for {n} months. Check the documents yourself first.", { day: money(action.h.dayMinor, "GBP"), month: money(action.h.monthMinor, "GBP"), n: action.h.reviewMonths })}</p>
          <TextArea label="Reason" value={reason} onChange={setReason} min={10} max={300} />
        </ConfirmWithPin>
      )}
      {action?.kind === "reject" && (
        <ConfirmWithPin
          title="Turn down higher limit"
          confirmLabel="Turn down"
          needsPin={false}
          canConfirm={okLength(reason, 10, 300)}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            await rejectHigherLimit(action.h.id, reason.trim());
            finish("Higher limit turned down. Nothing was changed.");
          }}
        >
          <TextArea label="Reason" value={reason} onChange={setReason} min={10} max={300} />
        </ConfirmWithPin>
      )}
      {action?.kind === "end" && (
        <ConfirmWithPin
          title="End higher limit"
          confirmLabel="End now"
          danger
          canConfirm={okLength(reason, 10, 300)}
          onClose={() => setAction(null)}
          onConfirm={async (pin) => {
            await endHigherLimit(action.h.id, reason.trim(), pin, key);
            finish("Higher limit ended. The customer is back on the standard limits.");
          }}
        >
          <p>{t("The customer goes back to the standard limits straight away.")}</p>
          <TextArea label="Reason" value={reason} onChange={setReason} min={10} max={300} />
        </ConfirmWithPin>
      )}
    </div>
  );
}
