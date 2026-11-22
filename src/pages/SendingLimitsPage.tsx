import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  approveSendingLimit,
  cancelHigherLimitSettingsChange,
  changeHigherLimitSettings,
  higherLimitSettings,
  higherLimits,
  proposeSendingLimit,
  rejectSendingLimit,
  sendingLimits,
  type HigherLimitSettings,
  type HigherLimitSettingsView,
  type LimitLevels,
  type SendingLimitRow,
} from "../api/admin";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Tabs, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { HIGHER_STATUS } from "./HigherLimitSection";

type Level = keyof LimitLevels;
export const LEVELS: [Level, string][] = [
  ["unverified", "ID not checked (can't send in the live app)"],
  ["new", "ID checked, first 7 days"],
  ["verified", "ID checked"],
  ["full", "ID and address checked"],
];

const toPence = (raw: string) => {
  const s = raw.trim().replace(/[£,\s]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(Number(s) * 100) : NaN;
};

/** Typed pounds per level to pence, with the same checks as the server. */
export function readLevels(typed: Record<Level, { day: string; month: string }>): { value?: LimitLevels; error?: string } {
  const out = {} as LimitLevels;
  for (const [level] of LEVELS) {
    const dayMinor = toPence(typed[level].day);
    const monthMinor = toPence(typed[level].month);
    if (!Number.isSafeInteger(dayMinor) || !Number.isSafeInteger(monthMinor)) return { error: "Each limit must be an amount in pounds." };
    if (dayMinor > 100_000_000 || monthMinor > 100_000_000) return { error: "Each limit must be from £0 up to £1,000,000." };
    if (monthMinor < dayMinor) return { error: "The 30-day limit can't be lower than the 24-hour limit." };
    out[level] = { dayMinor, monthMinor };
  }
  return { value: out };
}

function LevelTable({ levels }: { levels: Partial<LimitLevels> }) {
  const t = useT();
  return (
    <table className="mini">
      <thead>
        <tr>
          <th>{t("Customer")}</th>
          <th>{t("In 24 hours")}</th>
          <th>{t("In 30 days")}</th>
        </tr>
      </thead>
      <tbody>
        {LEVELS.filter(([l]) => levels[l]).map(([l, label]) => (
          <tr key={l}>
            <td>{t(label)}</td>
            <td className="num">{money(levels[l]!.dayMinor, "GBP")}</td>
            <td className="num">{money(levels[l]!.monthMinor, "GBP")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function scopeText(row: SendingLimitRow, t: ReturnType<typeof useT>) {
  if (row.scope === "worldwide") return t("Everyone (worldwide)");
  if (row.scope === "country") return row.direction === "from" ? t("Customers sending from {c}", { c: row.country ?? "" }) : t("Money going to {c}", { c: row.country ?? "" });
  return t("One customer");
}

function StandardLimits() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(sendingLimits, []);
  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState<"worldwide" | "country">("worldwide");
  const [country, setCountry] = useState("");
  const [direction, setDirection] = useState<"from" | "to">("from");
  const [typed, setTyped] = useState<Record<Level, { day: string; month: string }> | null>(null);
  const [reason, setReason] = useState("");
  const [deciding, setDeciding] = useState<{ row: SendingLimitRow; approve: boolean } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const key = useMemo(newIdempotencyKey, [editing, deciding]);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const read = typed ? readLevels(typed) : { error: "" };
  const open = () => {
    const l = data.worldwide.levels;
    setTyped(Object.fromEntries(LEVELS.map(([k]) => [k, { day: String(l[k].dayMinor / 100), month: String(l[k].monthMinor / 100) }])) as Record<Level, { day: string; month: string }>);
    setReason("");
    setDone(null);
    setEditing(true);
  };
  const finish = (text: string) => {
    setEditing(false);
    setDeciding(null);
    setReason("");
    setDone(text);
    reload();
  };
  return (
    <>
      {done && <p role="status">{t(done)}</p>}
      <div className="card panel">
        <h2>{t("Standard limits for everyone")}</h2>
        <p className="hint">{t("Every payment is counted in pounds at that day's rate. Lowering a limit applies straight away; raising one waits for a second person.")}</p>
        <LevelTable levels={data.worldwide.levels} />
        <p className="muted small">{t("On a new phone, for the first 24 hours: {amount}", { amount: money(data.worldwide.newPhoneCapMinor, "GBP") })}</p>
        <button onClick={open}>{t("Change limits")}</button>
      </div>

      <div className="card panel">
        <h2>{t("Limits for a country")}</h2>
        {data.countries.length === 0 ? (
          <p className="muted">{t("None. Everyone gets the standard limits.")}</p>
        ) : (
          data.countries.map((c) => (
            <div key={c._id}>
              <h3>{scopeText(c, t)}</h3>
              <LevelTable levels={c.levels ?? {}} />
            </div>
          ))
        )}
      </div>

      <div className="card panel">
        <h2>{t("Waiting for a second person")}</h2>
        {data.waiting.length === 0 && <p className="muted">{t("Nothing waiting.")}</p>}
        {data.waiting.map((w) => (
          <article key={w._id}>
            <p>
              <strong>{scopeText(w, t)}</strong> <span className="muted small">{when(w.createdAt)}</span>
            </p>
            {w.levels && <LevelTable levels={w.levels} />}
            {w.scope === "customer" && (
              <p>
                {money(w.dayMinor ?? 0, "GBP")} / {money(w.monthMinor ?? 0, "GBP")}
              </p>
            )}
            <p className="muted small">{t("Why: {reason}", { reason: w.reason })}</p>
            {staff?._id !== String(w.proposedBy) ? <button onClick={() => setDeciding({ row: w, approve: true })}>{t("Approve")}</button> : <p className="muted small">{t("You asked for this, so a different staff member must approve.")}</p>}{" "}
            <button onClick={() => setDeciding({ row: w, approve: false })}>{t("Turn down")}</button>
          </article>
        ))}
      </div>

      {editing && typed && (
        <ConfirmWithPin
          title="Change limits"
          confirmLabel="Save"
          canConfirm={Boolean(read.value) && okLength(reason, 5, 300) && (scope === "worldwide" || /^[A-Za-z]{2}$/.test(country))}
          onClose={() => setEditing(false)}
          onConfirm={async (pin) => {
            const made = await proposeSendingLimit({ scope, levels: read.value!, reason: reason.trim(), pin, ...(scope === "country" ? { country: country.toUpperCase(), direction } : {}) }, key);
            finish(made.status === "active" ? "The new limits are in force now." : "This raises a limit, so it needs a second person to approve it before it applies.");
          }}
        >
          <label>
            {t("For")}{" "}
            <select value={scope} onChange={(e) => setScope(e.target.value === "country" ? "country" : "worldwide")}>
              <option value="worldwide">{t("Everyone (worldwide)")}</option>
              <option value="country">{t("One country")}</option>
            </select>
          </label>
          {scope === "country" && (
            <div className="row">
              <label>
                {t("Country code (2 letters)")} <input value={country} maxLength={2} onChange={(e) => setCountry(e.target.value)} />
              </label>
              <label>
                {t("Which money")}{" "}
                <select value={direction} onChange={(e) => setDirection(e.target.value === "to" ? "to" : "from")}>
                  <option value="from">{t("Sent from this country")}</option>
                  <option value="to">{t("Going to this country")}</option>
                </select>
              </label>
            </div>
          )}
          <table className="mini edit">
            <thead>
              <tr>
                <th>{t("Customer")}</th>
                <th>{t("In 24 hours (£)")}</th>
                <th>{t("In 30 days (£)")}</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map(([l, label]) => (
                <tr key={l}>
                  <td>{t(label)}</td>
                  <td>
                    <input inputMode="decimal" aria-label={`${t(label)} ${t("In 24 hours (£)")}`} value={typed[l].day} onChange={(e) => setTyped({ ...typed, [l]: { ...typed[l], day: e.target.value } })} />
                  </td>
                  <td>
                    <input inputMode="decimal" aria-label={`${t(label)} ${t("In 30 days (£)")}`} value={typed[l].month} onChange={(e) => setTyped({ ...typed, [l]: { ...typed[l], month: e.target.value } })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {read.error && <p className="error">{t(read.error)}</p>}
          <TextArea label="Reason" value={reason} onChange={setReason} min={5} max={300} />
        </ConfirmWithPin>
      )}
      {deciding && (
        <ConfirmWithPin
          title={deciding.approve ? "Approve limit change" : "Turn down limit change"}
          confirmLabel={deciding.approve ? "Approve" : "Turn down"}
          needsPin={deciding.approve}
          canConfirm={deciding.approve || okLength(reason, 5, 300)}
          onClose={() => setDeciding(null)}
          onConfirm={async (pin) => {
            if (deciding.approve) {
              await approveSendingLimit(deciding.row._id, pin, key);
              finish("The new limits are in force now.");
            } else {
              await rejectSendingLimit(deciding.row._id, reason.trim());
              finish("The change was turned down. Nothing was changed.");
            }
          }}
        >
          {!deciding.approve && <TextArea label="Reason" value={reason} onChange={setReason} min={5} max={300} />}
        </ConfirmWithPin>
      )}
    </>
  );
}

function HigherLimitList() {
  const t = useT();
  const [status, setStatus] = useState<"waiting" | "active" | "review">("waiting");
  const { data, error, loading } = useLoad(() => higherLimits(status), [status]);
  return (
    <div className="card panel">
      <Tabs
        value={status}
        options={[
          ["waiting", "Waiting for approval"],
          ["review", "Review due within 30 days"],
          ["active", "All in force"],
        ] as const}
        onChange={setStatus}
      />
      <LoadState loading={loading && !data} error={error} empty={Boolean(data && !data.rows.length)} />
      {data && data.rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Customer")}</th>
                <th>{t("In 24 hours")}</th>
                <th>{t("In 30 days")}</th>
                <th>{t("Status")}</th>
                <th>{status === "waiting" ? t("Checks recorded by") : t("Ends on (review date)")}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/customers?open=${encodeURIComponent(r.customerId)}`}>{r.customer || t("Customer")}</Link>
                  </td>
                  <td className="num">{money(r.dayMinor, "GBP")}</td>
                  <td className="num">{money(r.monthMinor, "GBP")}</td>
                  <td>
                    <Badge tone={r.status === "active" ? (r.reviewSoon ? "warn" : "ok") : "warn"}>{t(HIGHER_STATUS[r.status])}</Badge>
                  </td>
                  <td>{status === "waiting" ? `${r.proposedBy} · ${when(r.proposedAt)}` : when(r.reviewBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">{t("Open the customer to see the checks and approve. A waiting approval lapses after 7 days. A higher limit ends by itself on its review date; to keep it, record new checks and have them approved again.")}</p>
    </div>
  );
}

type SKey = keyof HigherLimitSettings;
const S_ORDER: SKey[] = ["maxDayMinor", "maxMonthMinor", "reviewMonths", "nudgePercent"];
const S_LABEL: Record<SKey, string> = {
  maxDayMinor: "Highest higher limit in 24 hours (£)",
  maxMonthMinor: "Highest higher limit in 30 days (£)",
  reviewMonths: "A higher limit ends after (months)",
  nudgePercent: "The app suggests asking for more once this percent of a limit is used",
};
const S_POUNDS: SKey[] = ["maxDayMinor", "maxMonthMinor"];
const sShown = (k: SKey, v: number | null | undefined) => (v === null || v === undefined ? "—" : S_POUNDS.includes(k) ? money(v, "GBP") : String(v));

/** Typed tier settings to stored values (pounds to pence), or the problem. */
export function readTier(typed: Record<SKey, string>, bounds: HigherLimitSettingsView["bounds"]): { value?: HigherLimitSettings; error?: string } {
  const out = {} as HigherLimitSettings;
  for (const k of S_ORDER) {
    const raw = typed[k].trim().replace(/[£,\s]/g, "");
    if (!/^\d+$/.test(raw)) return { error: "Each setting must be a whole number." };
    const v = S_POUNDS.includes(k) ? Number(raw) * 100 : Number(raw);
    const [min, max] = bounds[k];
    if (v < min || v > max) return { error: "One of the settings is outside the allowed range shown." };
    out[k] = v;
  }
  if (out.maxMonthMinor < out.maxDayMinor) return { error: "The 30-day limit can't be lower than the 24-hour limit." };
  return { value: out };
}

function TierSettings() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(higherLimitSettings, []);
  const [mode, setMode] = useState<"ask" | "approve" | null>(null);
  const [typed, setTyped] = useState<Record<SKey, string> | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const key = useMemo(newIdempotencyKey, [mode]);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const mine = data.pending && staff && data.pending.byId === staff._id;
  const begin = (m: "ask" | "approve") => {
    const from = m === "approve" && data.pending ? data.pending.settings : data.settings;
    setTyped(Object.fromEntries(S_ORDER.map((k) => [k, S_POUNDS.includes(k) ? String(from[k] / 100) : String(from[k])])) as Record<SKey, string>);
    setReason("");
    setDone(null);
    setMode(m);
  };
  const read = typed ? readTier(typed, data.bounds) : { error: "" };
  return (
    <div className="card panel">
      <h2>{t("Higher limit settings")}</h2>
      <p className="hint">{t("The most a customer can be given after the extra checks, how long a higher limit lasts, and when the app suggests asking for more. Changes need two people.")}</p>
      {done && <p role="status">{t(done)}</p>}
      <table className="mini">
        <tbody>
          {S_ORDER.map((k) => (
            <tr key={k}>
              <td>{t(S_LABEL[k])}</td>
              <td className="num">{sShown(k, data.settings[k])}</td>
              {data.pending && <td className="num">→ {sShown(k, data.pending.settings[k])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {data.pending && (
        <p className="notice">
          {t("{name} asked for a change {when}: {reason}", { name: data.pending.by, when: when(data.pending.at), reason: data.pending.reason })}
        </p>
      )}
      {!data.pending && <button onClick={() => begin("ask")}>{t("Ask for a change")}</button>}
      {data.pending && !mine && <button onClick={() => begin("approve")}>{t("Approve the change")}</button>}{" "}
      {data.pending && (
        <button
          onClick={async () => {
            await cancelHigherLimitSettingsChange();
            setDone("Request withdrawn. The settings stay as they are.");
            reload();
          }}
        >
          {t("Withdraw the request")}
        </button>
      )}
      {mode && typed && (
        <ConfirmWithPin
          title={mode === "ask" ? "Ask for a change" : "Approve the change"}
          confirmLabel={mode === "ask" ? "Ask" : "Approve"}
          canConfirm={Boolean(read.value) && okLength(reason, 10, 300)}
          onClose={() => setMode(null)}
          onConfirm={async (pin) => {
            const r = await changeHigherLimitSettings(read.value!, reason.trim(), pin, key);
            setMode(null);
            setDone(r.done ? "Settings changed." : "Asked. A different staff member must approve the same settings within 24 hours.");
            reload();
          }}
        >
          {S_ORDER.map((k) => (
            <label key={k}>
              {t(S_LABEL[k])} <span className="muted small">({sShown(k, data.bounds[k][0])} – {sShown(k, data.bounds[k][1])})</span>
              <input inputMode="numeric" value={typed[k]} readOnly={mode === "approve"} onChange={(e) => setTyped({ ...typed, [k]: e.target.value })} />
            </label>
          ))}
          {read.error && <p className="error">{t(read.error)}</p>}
          <TextArea label="Reason" value={reason} onChange={setReason} min={10} max={300} />
        </ConfirmWithPin>
      )}
      {data.changes.length > 0 && (
        <details>
          <summary>{t("Earlier changes")}</summary>
          <ul>
            {data.changes.map((c, i) => (
              <li key={i}>
                {when(c.at)}: {c.reason} · {t("asked by {a}, approved by {b}", { a: c.by, b: c.approvedBy })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Sending limits: standard limits, higher limits for customers who send large amounts, and the higher limit settings. */
export function SendingLimitsPage() {
  const [tab, setTab] = useState<"higher" | "standard" | "settings">("higher");
  return (
    <section>
      <PageHeader title="Sending limits" intro="How much customers can send. Higher limits are given one customer at a time, after extra checks and a second person's approval." />
      <Tabs
        value={tab}
        options={[
          ["higher", "Higher limits"],
          ["standard", "Standard limits"],
          ["settings", "Higher limit settings"],
        ] as const}
        onChange={setTab}
      />
      {tab === "higher" && <HigherLimitList />}
      {tab === "standard" && <StandardLimits />}
      {tab === "settings" && <TierSettings />}
    </section>
  );
}
