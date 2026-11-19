import { useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  approveSettings,
  cancelSettings,
  cashOutSettings,
  proposeSettings,
  settingsHistory,
  type CashOutSettings,
  type EditableField,
  type Person,
  type SettingsChange,
  type SettingsSnapshot,
  type Tier,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Tabs, TextArea, okLength } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, personLabel, when } from "../lib/format";
import { changesFrom, FIELD_LABEL, fromForm, toForm, type SettingsForm } from "../lib/settingsForm";
import { useLoad } from "../lib/useLoad";
import { getLanguage, translate, useT } from "../i18n/language";

// Countries that can have Cash Out settings. The server says if one is not set up yet.
const COUNTRIES = [
  ["GM", "The Gambia"],
  ["SN", "Senegal"],
] as const;
type Country = (typeof COUNTRIES)[number][0];
const REASON_MIN = 10;
const REASON_MAX = 500;

/** One value shown the way staff read it. */
function show(field: EditableField, value: unknown, currency: string): ReactNode {
  if (value === undefined || value === null) return "—";
  switch (field) {
    case "enabled":
      return translate(value ? "On" : "Off", getLanguage());
    case "customerFeeBps":
      return `${Number(value) / 100}%`;
    case "maxPendingPerAgent":
      return String(value);
    case "codeTtlSeconds":
    case "pendingTtlSeconds":
      return translate("{n} seconds", getLanguage(), { n: String(value) });
    case "commissionTiers":
      return <TierTable tiers={value as Tier[]} currency={currency} />;
    default:
      return money(Number(value), currency);
  }
}

function TierTable({ tiers, currency }: { tiers: Tier[]; currency: string }) {
  const t = useT();
  return (
    <table className="mini">
      <thead>
        <tr>
          <th>{t("Tier")}</th>
          <th>{t("Day's volume from")}</th>
          <th>{t("Customers from")}</th>
          <th>{t("Agent earns")}</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{money(t.minVolumeMinor, currency)}</td>
            <td>{t.minCustomers}</td>
            <td>{money(t.amountMinor, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CashOutSettingsSection() {
  const t = useT();
  const { staff } = useAuth();
  const [country, setCountry] = useState<Country>("GM");
  const [view, setView] = useState<"now" | "history">("now");
  const [open, setOpen] = useState<"propose" | "approve" | "cancel" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const current = useLoad(() => cashOutSettings(country), [country]);
  const settings = current.data?.settings;
  const pending = current.data?.pendingChange ?? null;
  const people = current.data?.people ?? {};
  const mine = pending?.requestedBy === staff?._id;

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    current.reload();
  };

  return (
    <section>
      <PageHeader
        title="Agent cash out"
        intro="Cash out fees, agent daily pay and limits, by country."
        actions={
          <select aria-label={t("Country")} value={country} onChange={(e) => setCountry(e.target.value as Country)}>
            {COUNTRIES.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        }
      />
      <Tabs
        value={view}
        options={[
          ["now", "In force now"],
          ["history", "History"],
        ] as const}
        onChange={setView}
      />
      {done && <p className="notice">{t(done)}</p>}

      {view === "now" && (
        <>
          <LoadState loading={current.loading && !current.data} error={current.error} empty={false} />
          {settings && pending && (
            <div className="card panel">
              <div className="panel-head">
                <h2>{t("A change is waiting for approval")}</h2>
                <Badge tone="warn">{t("Expires {when}", { when: when(pending.expiresAt) })}</Badge>
              </div>
              <ChangeDiff change={pending} currency={settings.currency} />
              <p className="small">
                <strong>{t("Why:")}</strong> {pending.reason}
              </p>
              <p className="muted small">
                {t("Proposed by {name} on {when}", { name: mine ? t("you") : personLabel(people[pending.requestedBy ?? ""]), when: when(pending.createdAt) })}
              </p>
              <div className="row-end">
                {can(staff, "manage_rates") && <button onClick={() => setOpen("cancel")}>{t("Cancel change")}</button>}
                {can(staff, "manage_rates") && !mine && (
                  <button className="primary" onClick={() => setOpen("approve")}>
                    {t("Approve change")}
                  </button>
                )}
                {mine && <Badge tone="plain">{t("A different person must approve")}</Badge>}
              </div>
            </div>
          )}
          {settings && (
            <div className="card panel">
              <div className="panel-head">
                <h2>{t("In force (version {n})", { n: settings.version })}</h2>
                {can(staff, "manage_rates") && !pending && (
                  <button className="primary" onClick={() => setOpen("propose")}>
                    {t("Propose a change")}
                  </button>
                )}
              </div>
              {settings.commissionTiersFromDay && (
                <p className="notice">{t("New agent pay tiers start on {day}. Until then the earlier tiers apply.", { day: settings.commissionTiersFromDay })}</p>
              )}
              <dl className="facts wide">
                {(Object.keys(FIELD_LABEL) as EditableField[]).map((field) => (
                  <Row key={field} label={FIELD_LABEL[field]}>
                    {show(field, settings[field], settings.currency)}
                  </Row>
                ))}
              </dl>
            </div>
          )}
        </>
      )}
      {view === "history" && <History country={country} currency={settings?.currency ?? (country === "SN" ? "XOF" : "GMD")} />}

      {open === "propose" && settings && (
        <Propose settings={settings} onClose={() => setOpen(null)} onDone={() => finish("Change proposed. A different staff member must approve it within 24 hours.")} />
      )}
      {open === "approve" && pending && settings && (
        <Approve change={pending} currency={settings.currency} people={people} onClose={() => setOpen(null)} onDone={() => finish("Approved. The new settings are in force.")} />
      )}
      {open === "cancel" && pending && <Cancel change={pending} onClose={() => setOpen(null)} onDone={() => finish("Change cancelled. Nothing changed.")} />}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const t = useT();
  return (
    <>
      <dt>{t(label)}</dt>
      <dd>{children}</dd>
    </>
  );
}

function ChangeDiff({ change, currency }: { change: SettingsChange; currency: string }) {
  const t = useT();
  return (
    <table className="diff">
      <thead>
        <tr>
          <th>{t("Setting")}</th>
          <th>{t("Now")}</th>
          <th>{t("Proposed")}</th>
        </tr>
      </thead>
      <tbody>
        {change.changedFields.map((field) => (
          <tr key={field}>
            <td>{FIELD_LABEL[field] || field}</td>
            <td>{show(field, change.before?.[field], currency)}</td>
            <td className="changed">{show(field, change.after?.[field], currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Approve({ change, currency, people, onDone, onClose }: { change: SettingsChange; currency: string; people: Record<string, Person>; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve this change"
      confirmLabel="Approve"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveSettings(change.id, pin, key);
        onDone();
      }}
    >
      <ChangeDiff change={change} currency={currency} />
      <p className="small">
        <strong>{t("Why:")}</strong> {change.reason} — {personLabel(people[change.requestedBy ?? ""])}
      </p>
      <p className="hint">{t("It applies as soon as you approve. New pay tiers start from the next full day.")}</p>
    </ConfirmWithPin>
  );
}

function Cancel({ change, onDone, onClose }: { change: SettingsChange; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Cancel this change"
      confirmLabel="Cancel change"
      needsPin={false}
      canConfirm={okLength(reason, 5, 500)}
      onClose={onClose}
      onConfirm={async () => {
        await cancelSettings(change.id, reason.trim());
        onDone();
      }}
    >
      <p>{t("Nothing will change. Anyone can propose again afterwards.")}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={500} />
    </ConfirmWithPin>
  );
}

function Propose({ settings, onDone, onClose }: { settings: CashOutSettings; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState<SettingsForm>(() => toForm(settings));
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const c = settings.currency;
  const built = fromForm(form, c);
  const change: SettingsSnapshot = built.errors.length ? {} : changesFrom(settings, built.values);
  const changed = Object.keys(change) as EditableField[];
  const set = (patch: Partial<SettingsForm>) => setForm((f) => ({ ...f, ...patch }));
  const setTier = (i: number, patch: Partial<SettingsForm["tiers"][number]>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));

  const money_ = (label: string, value: string, onChange: (v: string) => void) => (
    <label>
      {t(label)} ({c})
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
  const whole = (label: string, value: string, onChange: (v: string) => void) => (
    <label>
      {t(label)}
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );

  return (
    <ConfirmWithPin
      title="Propose a change"
      confirmLabel={`Propose ${changed.length} change${changed.length === 1 ? "" : "s"}`}
      canConfirm={!built.errors.length && changed.length > 0 && okLength(reason, REASON_MIN, REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await proposeSettings(settings.country, { version: settings.version, change, reason: reason.trim(), pin }, key);
        onDone();
      }}
    >
      <p className="hint">{t("Change only what you need. A different staff member must approve within 24 hours.")}</p>
      <label className="check">
        <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        {t("Cash out switched on")}
      </label>
      <div className="form-grid">
        <label>
          {t("Customer fee (%)")}
          <input inputMode="decimal" value={form.feePercent} onChange={(e) => set({ feePercent: e.target.value })} />
        </label>
        {money_("Customer fee, fixed", form.feeFixed, (v) => set({ feeFixed: v }))}
        {money_("Most per cash out", form.maxPerCashOut, (v) => set({ maxPerCashOut: v }))}
        {money_("Most per customer per day", form.maxPerDayPerCustomer, (v) => set({ maxPerDayPerCustomer: v }))}
        {money_("Most per agent per day", form.agentDaily, (v) => set({ agentDaily: v }))}
        {whole("Waiting cash outs per agent", form.maxPending, (v) => set({ maxPending: v }))}
        {whole("Code life (seconds)", form.codeSeconds, (v) => set({ codeSeconds: v }))}
        {whole("Time to confirm (seconds)", form.pendingSeconds, (v) => set({ pendingSeconds: v }))}
      </div>
      <fieldset className="choices">
        <legend>{t("Agent daily pay tiers (the highest one reached pays)")}</legend>
        <table className="mini edit">
          <thead>
            <tr>
              <th>{t("Tier")}</th>
              <th>{t("Volume from ({c})", { c })}</th>
              <th>{t("Customers from")}</th>
              <th>{t("Pays ({c})", { c })}</th>
              <th aria-label={t("Remove")} />
            </tr>
          </thead>
          <tbody>
            {form.tiers.map((tier, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <input aria-label={`Tier ${i + 1} volume`} inputMode="decimal" value={tier.volume} onChange={(e) => setTier(i, { volume: e.target.value })} />
                </td>
                <td>
                  <input aria-label={`Tier ${i + 1} customers`} inputMode="numeric" value={tier.customers} onChange={(e) => setTier(i, { customers: e.target.value })} />
                </td>
                <td>
                  <input aria-label={`Tier ${i + 1} pay`} inputMode="decimal" value={tier.pay} onChange={(e) => setTier(i, { pay: e.target.value })} />
                </td>
                <td>
                  <button type="button" className="link" onClick={() => setForm((f) => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))}>
                    {t("Remove")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="link" onClick={() => setForm((f) => ({ ...f, tiers: [...f.tiers, { volume: "", customers: "", pay: "" }] }))}>
          {t("Add a tier")}
        </button>
      </fieldset>
      {built.errors.length > 0 && <p className="error">{t("Check: {list}.", { list: built.errors.map((e) => t(e)).join(", ") })}</p>}
      {!built.errors.length && changed.length > 0 && (
        <p className="small">
          <strong>{t("Changing:")}</strong> {changed.map((f) => t(FIELD_LABEL[f])).join(", ")}
        </p>
      )}
      <TextArea label="Why" value={reason} onChange={setReason} min={REASON_MIN} max={REASON_MAX} />
    </ConfirmWithPin>
  );
}

const STATUS_TONE: Record<SettingsChange["status"], "ok" | "warn" | "plain" | "danger"> = {
  approved: "ok",
  pending: "warn",
  cancelled: "plain",
  expired: "plain",
  stale: "plain",
};
const STATUS_LABEL: Record<SettingsChange["status"], string> = {
  approved: "Approved",
  pending: "Waiting",
  cancelled: "Cancelled",
  expired: "Expired",
  stale: "Out of date",
};

function History({ country, currency }: { country: string; currency: string }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(() => settingsHistory(country, page), [country, page]);
  const rows = data?.changes ?? [];
  const people = data?.people ?? {};
  const pages = data ? Math.ceil(data.total / data.limit) : 1;
  return (
    <>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((change) => (
        <div key={change.id} className="card panel">
          <div className="panel-head">
            <h2 className="small-title">{when(change.createdAt)}</h2>
            <Badge tone={STATUS_TONE[change.status]}>{t(STATUS_LABEL[change.status])}</Badge>
          </div>
          <ChangeDiff change={change} currency={currency} />
          <p className="small">
            <strong>{t("Why:")}</strong> {change.reason}
          </p>
          <p className="muted small">
            {t("Proposed by {name}", { name: personLabel(people[change.requestedBy ?? ""]) })}
            {change.approvedBy && ` · ${t("approved by {name} on {when}", { name: personLabel(people[change.approvedBy]), when: when(change.approvedAt) })}`}
            {change.cancelledBy && ` · ${t("cancelled by {name}", { name: personLabel(people[change.cancelledBy]) })}${change.cancelReason ? `: ${change.cancelReason}` : ""}`}
          </p>
        </div>
      ))}
      {pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("Previous")}
          </button>
          <span className="muted">
            {t("Page {page} of {pages}", { page, pages })}
          </span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {t("Next")}
          </button>
        </div>
      )}
    </>
  );
}
