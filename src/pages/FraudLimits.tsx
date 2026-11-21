import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { cancelFraudLimitsChange, changeFraudLimits, fraudSettings, type FraudLimits } from "../api/admin";
import { LoadState, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

type Key = keyof FraudLimits;
const ORDER: Key[] = ["paymentsPerHour", "dayGbpMinor", "newAccountDays", "newAccountGbpMinor", "recipientsPerDay", "failuresPerHour"];
const LABEL: Record<Key, string> = {
  paymentsPerHour: "Payments out in one hour",
  dayGbpMinor: "Pounds sent out in 24 hours",
  newAccountDays: "An account counts as new for (days)",
  newAccountGbpMinor: "Pounds sent out in 24 hours by a new account",
  recipientsPerDay: "Different people paid in 24 hours",
  failuresPerHour: "Failed payments in one hour",
};
/** Amounts are typed and shown in whole pounds; the server keeps pence. */
const POUNDS: Key[] = ["dayGbpMinor", "newAccountGbpMinor"];
const shown = (k: Key, v: number) => (POUNDS.includes(k) ? `£${(v / 100).toLocaleString("en-GB")}` : String(v));

/** Typed values to limits (pounds to pence), or the problem. */
export function readFraudLimits(typed: Record<Key, string>, bounds: Record<Key, [number, number]>): { value?: FraudLimits; error?: string } {
  const out = {} as FraudLimits;
  for (const k of ORDER) {
    const raw = typed[k].trim().replace(/[£,\s]/g, "");
    if (!/^\d+$/.test(raw)) return { error: "Each limit must be a whole number." };
    const v = POUNDS.includes(k) ? Number(raw) * 100 : Number(raw);
    const [min, max] = bounds[k];
    if (v < min || v > max) return { error: "One of the limits is outside the allowed range shown." };
    out[k] = v;
  }
  if (out.newAccountGbpMinor > out.dayGbpMinor) return { error: "The new-account amount can't be higher than the daily amount." };
  return { value: out };
}

export function FraudLimitsBox() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => fraudSettings(), []);
  const [editing, setEditing] = useState<"ask" | "approve" | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mayChange = can(staff, "manage_fraud_rules");
  const finish = (text: string) => {
    setEditing(null);
    setWithdrawing(false);
    setMessage(text);
    reload();
  };
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const mine = data.pending && staff && data.pending.byId === staff._id;
  return (
    <div className="card panel" style={{ marginTop: 16 }}>
      <h2>{t("Fraud monitoring")}</h2>
      <p className="hint">{t("Every 10 minutes the system looks at the last 24 hours of payments. When a customer goes over one of these limits, a Fraud alert case opens here and staff who can see cases get a text. Nothing is blocked automatically: you decide.")}</p>
      <p className="muted small">{t("Last run: {when}", { when: when(data.lastRunAt) })}</p>
      <table>
        <tbody>
          {ORDER.map((k) => (
            <tr key={k}>
              <td>{t(LABEL[k])}</td>
              <td>{shown(k, data.limits[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message && <p role="status">{t(message)}</p>}
      {data.pending && (
        <div className="notice">
          <p>
            {t("Waiting for a second person: asked by {name} on {when}. Reason: {reason}", { name: data.pending.by, when: when(data.pending.at), reason: data.pending.reason })}
          </p>
          <ul>
            {ORDER.filter((k) => data.pending && data.pending.limits[k] !== data.limits[k]).map((k) => (
              <li key={k}>
                {t(LABEL[k])}: {shown(k, data.limits[k])} → {shown(k, data.pending!.limits[k])}
              </li>
            ))}
          </ul>
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
                {when(c.at)} · {t("asked by {asker}, approved by {approver}", { asker: c.by, approver: c.approvedBy })} · {c.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      {editing && <FraudDialog data={data.limits} bounds={data.bounds} approve={editing === "approve" ? data.pending?.limits : undefined} onClose={() => setEditing(null)} onDone={finish} />}
      {withdrawing && (
        <ConfirmWithPin
          title="Withdraw the waiting change"
          confirmLabel="Withdraw"
          needsPin={false}
          onClose={() => setWithdrawing(false)}
          onConfirm={async () => {
            await cancelFraudLimitsChange();
            finish("Request withdrawn. The limits stay as they are.");
          }}
        >
          <p>{t("The limits stay as they are.")}</p>
        </ConfirmWithPin>
      )}
    </div>
  );
}

function FraudDialog({ data, bounds, approve, onClose, onDone }: { data: FraudLimits; bounds: Record<Key, [number, number]>; approve?: FraudLimits; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const approving = approve !== undefined;
  const start = approve ?? data;
  const [typed, setTyped] = useState<Record<Key, string>>(() => Object.fromEntries(ORDER.map((k) => [k, POUNDS.includes(k) ? String(start[k] / 100) : String(start[k])])) as Record<Key, string>);
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const read = readFraudLimits(typed, bounds);
  const same = read.value ? ORDER.every((k) => read.value![k] === data[k]) : false;
  return (
    <ConfirmWithPin
      title={approving ? "Approve the new limits" : "Change the fraud limits"}
      confirmLabel={approving ? "Approve" : "Ask for the change"}
      canConfirm={Boolean(read.value) && !same && okLength(reason, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await changeFraudLimits(read.value!, reason.trim(), pin, key);
        onDone(result.asked ? "Asked. A different staff member must approve the same limits within 24 hours." : "Limits changed.");
      }}
    >
      {!approving && <p>{t("Two people: you ask, then a different staff member approves the same limits within 24 hours. Until then nothing changes.")}</p>}
      <div className="form-grid">
        {ORDER.map((k) => (
          <label key={k}>
            {t(LABEL[k])} <span className="muted small">({shown(k, bounds[k][0])} – {shown(k, bounds[k][1])})</span>
            <input inputMode="numeric" value={typed[k]} readOnly={approving} onChange={(e) => setTyped({ ...typed, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      {read.error && <p className="error">{t(read.error)}</p>}
      {same && <p className="muted small">{t("Those are already the limits.")}</p>}
      <TextArea label="Why" value={reason} onChange={setReason} min={10} max={300} />
    </ConfirmWithPin>
  );
}
