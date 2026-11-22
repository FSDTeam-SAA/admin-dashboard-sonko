import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  approveFaceId,
  cancelFaceId,
  faceIdHistory,
  faceIdSettings,
  proposeFaceId,
  type FaceIdChange,
  type FaceIdChangeBody,
  type FaceIdSettings,
  type Person,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, TextArea, okLength } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

const REASON_MIN = 10;
const REASON_MAX = 500;

export const usd = (minor: number) => `$${(minor / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** "100" or "99.50" dollars as cents, or null when it is not a clean amount. */
export function dollarsToMinor(text: string): number | null {
  const clean = text.trim().replace(/^\$/, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export type FaceIdForm = { max: string; day: string; rate: string };

export function toFaceIdForm(s: FaceIdSettings): FaceIdForm {
  return { max: String(s.maxUsdMinor / 100), day: String(s.dayUsdMinor / 100), rate: String(s.gbpPerUsd) };
}

/** Only what changed, plus the problems to fix before proposing. The server checks again. */
export function buildFaceIdChange(form: FaceIdForm, current: FaceIdSettings): { change: FaceIdChangeBody; errors: string[] } {
  const errors: string[] = [];
  const change: FaceIdChangeBody = {};
  const max = dollarsToMinor(form.max);
  const day = dollarsToMinor(form.day);
  const rate = Number(form.rate.trim());
  if (max === null || max < 1_000 || max > 30_000) errors.push("The limit per payment must be between 10 and 300 US dollars");
  else if (max !== current.maxUsdMinor) change.maxUsdMinor = max;
  if (day === null || day < 1_000 || day > 100_000) errors.push("The total per day must be between 10 and 1000 US dollars");
  else if (day !== current.dayUsdMinor) change.dayUsdMinor = day;
  if (max !== null && day !== null && day < max) errors.push("The total per day cannot be lower than the limit per payment");
  if (!Number.isFinite(rate) || rate < 0.4 || rate > 1.2) errors.push("Pounds per US dollar must be between 0.4 and 1.2");
  else if (Math.abs(rate - current.gbpPerUsd) / current.gbpPerUsd > 0.25) errors.push("Pounds per US dollar moves more than 25% in one go");
  else if (rate !== current.gbpPerUsd) change.gbpPerUsd = rate;
  return { change, errors };
}

function Diff({ change }: { change: FaceIdChange }) {
  const t = useT();
  const rows: [string, string, string][] = [];
  if (change.before.maxUsdMinor !== change.after.maxUsdMinor) rows.push(["Face ID up to (per payment)", usd(change.before.maxUsdMinor), usd(change.after.maxUsdMinor)]);
  if (change.before.dayUsdMinor !== change.after.dayUsdMinor) rows.push(["Face ID total per day", usd(change.before.dayUsdMinor), usd(change.after.dayUsdMinor)]);
  if (change.before.gbpPerUsd !== change.after.gbpPerUsd) rows.push(["Pounds per US dollar", String(change.before.gbpPerUsd), String(change.after.gbpPerUsd)]);
  return (
    <table className="diff">
      <thead>
        <tr>
          <th>{t("What")}</th>
          <th>{t("Now")}</th>
          <th>{t("Proposed")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([what, before, after]) => (
          <tr key={what}>
            <td>{t(what)}</td>
            <td>{before}</td>
            <td className="changed">{after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Face ID payment limits: below the limit Face ID is enough, at it or above the PIN is needed. */
export function FaceIdSection() {
  const t = useT();
  const { staff } = useAuth();
  const [open, setOpen] = useState<"propose" | "approve" | "cancel" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { data, error, loading, reload } = useLoad(() => faceIdSettings(), []);
  const settings = data?.settings;
  const pending = data?.pendingChange ?? null;
  const people = data?.people ?? {};
  const mine = pending?.requestedBy === staff?._id;
  const senior = can(staff, "manage_limits");
  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <p className="muted">
        {t("Below the limit, Face ID is enough to pay. At the limit or above, the customer types their PIN. The limit is in US dollars and is turned into each customer's currency. Bank transfers and security changes always need the PIN.")}
      </p>
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={false} />
      {settings && pending && (
        <div className="card panel">
          <div className="panel-head">
            <h2>{t("A change is waiting for approval")}</h2>
            <Badge tone="warn">{t("Expires {when}", { when: when(pending.expiresAt) })}</Badge>
          </div>
          <Diff change={pending} />
          <p className="small">
            <strong>{t("Why:")}</strong> {pending.reason}
          </p>
          <p className="muted small">
            {t("Proposed by {name} on {when}", { name: mine ? t("you") : personLabel(people[pending.requestedBy ?? ""]), when: when(pending.createdAt) })}
          </p>
          <div className="row-end">
            {senior && <button onClick={() => setOpen("cancel")}>{t("Cancel change")}</button>}
            {senior && !mine && (
              <button className="primary" onClick={() => setOpen("approve")}>
                {t("Approve change")}
              </button>
            )}
            {mine && <Badge tone="plain">{t("A different person must approve")}</Badge>}
          </div>
        </div>
      )}
      {settings && data && (
        <div className="card panel">
          <div className="panel-head">
            <h2>{t("In force (version {n})", { n: settings.version })}</h2>
            {senior && !pending && (
              <button className="primary" onClick={() => setOpen("propose")}>
                {t("Propose a change")}
              </button>
            )}
          </div>
          <dl className="facts wide">
            <dt>{t("Face ID up to (per payment)")}</dt>
            <dd>
              {t("under {amount}", { amount: usd(settings.maxUsdMinor) })} · {money(data.inPence.maxGbpMinor, "GBP")}
            </dd>
            <dt>{t("Face ID total per day")}</dt>
            <dd>
              {usd(settings.dayUsdMinor)} · {money(data.inPence.dayGbpMinor, "GBP")}
            </dd>
            <dt>{t("Pounds per US dollar")}</dt>
            <dd>{settings.gbpPerUsd}</dd>
          </dl>
          <p className="hint">{t("The pounds per dollar figure is used only to turn these limits into other currencies. Update it if the dollar moves a lot.")}</p>
        </div>
      )}
      <button onClick={() => setShowHistory((v) => !v)}>{t(showHistory ? "Hide history" : "Show history")}</button>
      {showHistory && <History />}
      {open === "propose" && settings && <Propose settings={settings} onClose={() => setOpen(null)} onDone={() => finish("Change proposed. A different senior staff member must approve it within 24 hours.")} />}
      {open === "approve" && pending && <Approve change={pending} people={people} onClose={() => setOpen(null)} onDone={() => finish("Approved. The new Face ID limits are in force now.")} />}
      {open === "cancel" && pending && <Cancel change={pending} onClose={() => setOpen(null)} onDone={() => finish("Change cancelled. Nothing changed.")} />}
    </section>
  );
}

function Propose({ settings, onDone, onClose }: { settings: FaceIdSettings; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState<FaceIdForm>(() => toFaceIdForm(settings));
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const built = buildFaceIdChange(form, settings);
  const changed = Object.keys(built.change).length > 0;
  return (
    <ConfirmWithPin
      title="Propose new Face ID limits"
      confirmLabel="Propose"
      canConfirm={changed && !built.errors.length && okLength(reason, REASON_MIN, REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await proposeFaceId({ version: settings.version, change: built.change, reason: reason.trim(), pin }, key);
        onDone();
      }}
    >
      <div className="form-grid">
        <label>
          {t("Face ID up to, per payment (US dollars)")}
          <input inputMode="decimal" value={form.max} onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))} />
        </label>
        <label>
          {t("Face ID total per day (US dollars)")}
          <input inputMode="decimal" value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} />
        </label>
        <label>
          {t("Pounds per US dollar")}
          <input inputMode="decimal" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
        </label>
      </div>
      {built.errors.length > 0 && <p className="error">{built.errors.map((e) => t(e)).join(". ")}.</p>}
      <TextArea label="Why" value={reason} onChange={setReason} min={REASON_MIN} max={REASON_MAX} />
    </ConfirmWithPin>
  );
}

function Approve({ change, people, onDone, onClose }: { change: FaceIdChange; people: Record<string, Person>; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve new Face ID limits"
      confirmLabel="Approve"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveFaceId(change.id, pin, key);
        onDone();
      }}
    >
      <Diff change={change} />
      <p className="small">
        <strong>{t("Why:")}</strong> {change.reason} — {personLabel(people[change.requestedBy ?? ""])}
      </p>
      <p className="hint">{t("Every payment uses the new limits the moment you approve.")}</p>
    </ConfirmWithPin>
  );
}

function Cancel({ change, onDone, onClose }: { change: FaceIdChange; onDone: () => void; onClose: () => void }) {
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
        await cancelFaceId(change.id, reason.trim());
        onDone();
      }}
    >
      <p>{t("Nothing will change.")}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={500} />
    </ConfirmWithPin>
  );
}

const STATUS_LABEL: Record<FaceIdChange["status"], string> = {
  approved: "Approved",
  pending: "Waiting",
  cancelled: "Cancelled",
  expired: "Expired",
  stale: "Out of date",
};

function History() {
  const t = useT();
  const { data, error, loading } = useLoad(() => faceIdHistory(1), []);
  const rows = data?.changes ?? [];
  const people = data?.people ?? {};
  return (
    <>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((change) => (
        <div key={change.id} className="card panel">
          <div className="panel-head">
            <h2 className="small-title">{when(change.createdAt)}</h2>
            <Badge tone={change.status === "approved" ? "ok" : change.status === "pending" ? "warn" : "plain"}>{t(STATUS_LABEL[change.status])}</Badge>
          </div>
          <Diff change={change} />
          <p className="small">
            <strong>{t("Why:")}</strong> {change.reason}
          </p>
          <p className="muted small">
            {t("Proposed by {name}", { name: personLabel(people[change.requestedBy ?? ""]) })}
            {change.approvedBy && ` · ${t("approved by {name} on {when}", { name: personLabel(people[change.approvedBy]), when: when(change.approvedAt) })}`}
          </p>
        </div>
      ))}
    </>
  );
}
