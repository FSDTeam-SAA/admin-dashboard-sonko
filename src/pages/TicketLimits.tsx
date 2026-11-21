import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { cancelTicketLimitsChange, changeTicketLimits, ticketSettings, type OverdueHours, type TicketPriority } from "../api/admin";
import { LoadState, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

const ORDER: TicketPriority[] = ["critical", "high", "medium", "low"];
const LABEL: Record<TicketPriority, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

/** What is wrong with typed limits, or null. The server checks again. */
export function limitsProblem(hours: Partial<Record<TicketPriority, number>>, max: OverdueHours): string | null {
  for (const p of ORDER) {
    const v = hours[p];
    if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > max[p]) return "Each limit must be a whole number of hours, from 1 up to the most shown.";
  }
  const h = hours as OverdueHours;
  if (!(h.critical <= h.high && h.high <= h.medium && h.medium <= h.low)) return "A more urgent priority can't have a longer limit than a less urgent one.";
  return null;
}

export function OverdueLimits() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => ticketSettings(), []);
  const [editing, setEditing] = useState<"ask" | "approve" | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mayChange = can(staff, "manage_ticket_limits");
  const finish = (text: string) => {
    setEditing(null);
    setWithdrawing(false);
    setMessage(text);
    reload();
  };
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const mine = data.pending && staff && data.pending.byId === staff._id;
  return (
    <div className="card panel">
      <h2>{t("Overdue limits")}</h2>
      <p className="hint">{t("An open ticket with no note or change for longer than this is marked Overdue and moves to the top. Clock hours, weekends included.")}</p>
      <table>
        <tbody>
          {ORDER.map((p) => (
            <tr key={p}>
              <td>{t(LABEL[p])}</td>
              <td>{t("{n} hours", { n: data.overdueHours[p] })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message && <p role="status">{t(message)}</p>}
      {data.pending && (
        <div className="notice">
          <p>
            {t("Waiting for a second person: {list}, asked by {name} on {when}. Reason: {reason}", {
              list: ORDER.map((p) => `${t(LABEL[p])} ${data.pending?.hours[p]}h`).join(", "),
              name: data.pending.by,
              when: when(data.pending.at),
              reason: data.pending.reason,
            })}
          </p>
          {mayChange && (
            <div className="row-start">
              {!mine && <button className="primary" onClick={() => setEditing("approve")}>{t("Approve")}</button>}
              <button onClick={() => setWithdrawing(true)}>{t("Withdraw the request")}</button>
            </div>
          )}
        </div>
      )}
      {mayChange && <button onClick={() => setEditing("ask")}>{t("Change the limits")}</button>}
      {data.changes.length > 0 && (
        <details>
          <summary>{t("Past changes")}</summary>
          <ul>
            {data.changes.map((c, i) => (
              <li key={i}>
                {when(c.at)}: {ORDER.map((p) => `${t(LABEL[p])} ${c.to[p]}h`).join(", ")} · {t("asked by {asker}, approved by {approver}", { asker: c.by, approver: c.approvedBy })} · {c.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      {editing && <LimitsDialog current={data.overdueHours} max={data.max} approve={editing === "approve" ? data.pending?.hours : undefined} onClose={() => setEditing(null)} onDone={finish} />}
      {withdrawing && (
        <ConfirmWithPin
          title="Withdraw the waiting change"
          confirmLabel="Withdraw"
          needsPin={false}
          onClose={() => setWithdrawing(false)}
          onConfirm={async () => {
            await cancelTicketLimitsChange();
            finish("Request withdrawn. The limits stay as they are.");
          }}
        >
          <p>{t("The limits stay as they are.")}</p>
        </ConfirmWithPin>
      )}
    </div>
  );
}

function LimitsDialog({ current, max, approve, onClose, onDone }: { current: OverdueHours; max: OverdueHours; approve?: OverdueHours; onClose: () => void; onDone: (message: string) => void }) {
  const t = useT();
  const approving = approve !== undefined;
  const [typed, setTyped] = useState<Record<TicketPriority, string>>(() => Object.fromEntries(ORDER.map((p) => [p, String((approve ?? current)[p])])) as Record<TicketPriority, string>);
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const hours = Object.fromEntries(ORDER.map((p) => [p, /^\d+$/.test(typed[p].trim()) ? Number(typed[p].trim()) : Number.NaN])) as OverdueHours;
  const problem = limitsProblem(hours, max);
  const same = ORDER.every((p) => hours[p] === current[p]);
  return (
    <ConfirmWithPin
      title={approving ? "Approve the new limits" : "Change the overdue limits"}
      confirmLabel={approving ? "Approve" : "Ask for the change"}
      canConfirm={!problem && !same && okLength(reason, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await changeTicketLimits(hours, reason.trim(), pin, key);
        onDone(result.asked ? "Asked. A different staff member must approve the same limits within 24 hours." : "Limits changed.");
      }}
    >
      {!approving && <p>{t("Two people: you ask, then a different staff member approves the same limits within 24 hours. Until then nothing changes.")}</p>}
      <div className="form-grid">
        {ORDER.map((p) => (
          <label key={p}>
            {t("{priority} (hours, up to {max})", { priority: t(LABEL[p]), max: max[p] })}
            <input type="number" min={1} max={max[p]} step={1} value={typed[p]} readOnly={approving} onChange={(e) => setTyped({ ...typed, [p]: e.target.value })} />
          </label>
        ))}
      </div>
      {problem && <p className="error">{t(problem)}</p>}
      {same && <p className="muted small">{t("Those are already the limits.")}</p>}
      <TextArea label="Why" value={reason} onChange={setReason} min={10} max={300} />
    </ConfirmWithPin>
  );
}
