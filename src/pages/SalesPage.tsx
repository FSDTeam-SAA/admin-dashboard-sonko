import { useMemo, useState } from "react";
import {
  addSalesRep,
  changeSalesMinimum,
  mySales,
  salesReport,
  salesSettings,
  staffList,
  stopSalesRep,
  type SalesRow,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Tabs, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

export type PeriodKind = "this-month" | "last-month" | "last-90";

const day = (date: Date) => date.toISOString().slice(0, 10);

/** The dates to ask the server for. This month sends none (the server's default). */
export function periodFor(kind: PeriodKind, now = new Date()): { from: string; to: string } | undefined {
  if (kind === "this-month") return undefined;
  if (kind === "last-month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    return { from: day(from), to: day(to) };
  }
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to.getTime() - 89 * 24 * 60 * 60 * 1000);
  return { from: day(from), to: day(to) };
}

/** Share of the step before, as "40%", or "—" when there is nothing to divide. */
export function share(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

/** Sign-ups credited to each salesperson by the code typed at sign-up. */
export function SalesPage() {
  const { staff } = useAuth();
  const t = useT();
  const seesAll = can(staff, "view_sales");
  const manages = can(staff, "manage_sales");
  const [kind, setKind] = useState<PeriodKind>("this-month");
  const [done, setDone] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [stopping, setStopping] = useState<SalesRow | null>(null);
  const [changing, setChanging] = useState(false);
  const period = periodFor(kind);
  const report = useLoad(() => (seesAll ? salesReport(period) : mySales(period)), [kind, seesAll]);
  const settings = useLoad(() => (seesAll ? salesSettings() : Promise.resolve(null)), [seesAll]);
  const rows = report.data?.salespeople ?? [];
  const minimum = report.data ? money(report.data.minimumGmdMinor, "GMD") : "";

  const finish = (message: string) => {
    setDone(message);
    report.reload();
    settings.reload();
  };

  return (
    <section>
      <PageHeader
        title="Sales team"
        intro="Customers credited to each salesperson by the code they typed at sign-up. The code is saved once and can never be moved to someone else."
      />
      <Tabs
        value={kind}
        options={[
          ["this-month", "This month"],
          ["last-month", "Last month"],
          ["last-90", "Last 90 days"],
        ] as const}
        onChange={setKind}
      />
      {done && <p className="notice">{t(done)}</p>}
      {manages && (
        <p>
          <button onClick={() => setAdding(true)}>{t("Add a salesperson")}</button>
        </p>
      )}
      <LoadState loading={report.loading && !report.data} error={report.error} empty={false} />
      {report.data && !rows.length && (
        <p className="muted">{seesAll ? t("No salespeople yet.") : t("No salesperson is linked to your login. Ask a manager to link it.")}</p>
      )}
      {rows.length > 0 && (
        <div className="card panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Salesperson")}</th>
                  <th>{t("Code")}</th>
                  <th>{t("Signed up")}</th>
                  <th>{t("Passed the ID check")}</th>
                  <th>{t("Paid {minimum} or more", { minimum })}</th>
                  {manages && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name} {!r.active && <Badge tone="plain">{t("Stopped")}</Badge>}
                    </td>
                    <td>
                      <code>{r.code}</code>
                    </td>
                    <td className="num">{r.signedUp}</td>
                    <td className="num">
                      {r.idChecked} <span className="muted small">{share(r.idChecked, r.signedUp)}</span>
                    </td>
                    <td className="num">
                      <strong>{r.qualified}</strong> <span className="muted small">{share(r.qualified, r.idChecked)}</span>
                    </td>
                    {manages && <td>{r.active && <button onClick={() => setStopping(r)}>{t("Stop code")}</button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            {t(
              "Counted by sign-up date. A customer counts in the last column once they have passed the ID check and made one successful payment of at least {minimum}. Payments in other currencies are converted at today's Sunu Pay rates.",
              { minimum },
            )}
          </p>
        </div>
      )}

      {seesAll && settings.data && (
        <div className="card panel">
          <h2>{t("Minimum payment")}</h2>
          <p>
            <strong>{money(settings.data.minimumGmdMinor, "GMD")}</strong> <span className="muted">{t("(about 10 US dollars at the starting rates; check it against today's rates)")}</span>
          </p>
          {manages && <button onClick={() => setChanging(true)}>{t("Change the minimum")}</button>}
          {settings.data.changes.length > 0 && (
            <>
              <h3>{t("Changes")}</h3>
              <ul className="plain-list">
                {settings.data.changes.map((c) => (
                  <li key={c.at} className="small">
                    {when(c.at)}: {money(c.fromGmdMinor, "GMD")} → {money(c.toGmdMinor, "GMD")}. {c.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {adding && (
        <AddRepDialog
          onClose={() => setAdding(false)}
          onDone={(m) => {
            setAdding(false);
            finish(m);
          }}
        />
      )}
      {stopping && (
        <ConfirmWithPin
          title="Stop this code"
          confirmLabel="Stop code"
          danger
          onClose={() => setStopping(null)}
          onConfirm={async (pin) => {
            await stopSalesRep(stopping.id, pin);
            setStopping(null);
            finish("Stopped. The code no longer works for new sign-ups. Past sign-ups keep their credit.");
          }}
        >
          <p>{t("{name}'s code {code} will stop working for new sign-ups. Customers who already used it stay credited to them. A code is never reused.", { name: stopping.name, code: stopping.code })}</p>
        </ConfirmWithPin>
      )}
      {changing && settings.data && (
        <MinimumDialog
          currentGmd={settings.data.minimumGmdMinor / 100}
          onClose={() => setChanging(false)}
          onDone={(m) => {
            setChanging(false);
            finish(m);
          }}
        />
      )}
    </section>
  );
}

function AddRepDialog({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [staffUserId, setStaffUserId] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  // Linking a login needs the staff list; staff who can't see it just skip this.
  const staff = useLoad(() => staffList().catch(() => null), []);
  const cleanCode = code.replace(/[\s-]/g, "").toUpperCase();
  return (
    <ConfirmWithPin
      title="Add a salesperson"
      confirmLabel="Add"
      canConfirm={name.trim().length >= 2 && CODE_PATTERN.test(cleanCode)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await addSalesRep({ name: name.trim(), code: cleanCode, staffUserId: staffUserId || undefined }, pin, key);
        onDone("Salesperson added.");
      }}
    >
      <label>
        {t("Name")}
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t("Code")}
        <input value={code} maxLength={16} autoComplete="off" onChange={(e) => setCode(e.target.value)} />
        <span className="hint">{t("4 to 12 letters or numbers, for example AWA24. Customers type it when they sign up. It can't be changed or reused.")}</span>
      </label>
      {staff.data && (
        <label>
          {t("Staff login (optional)")}
          <select value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)}>
            <option value="">{t("None")}</option>
            {staff.data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="hint">{t("With the permission to see their own sales, this login sees only this salesperson's figures.")}</span>
        </label>
      )}
    </ConfirmWithPin>
  );
}

function MinimumDialog({ currentGmd, onClose, onDone }: { currentGmd: number; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [value, setValue] = useState(String(currentGmd));
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const amount = Number(value);
  const valid = Number.isFinite(amount) && amount >= 10 && amount <= 100000 && amount !== currentGmd;
  return (
    <ConfirmWithPin
      title="Change the minimum"
      confirmLabel="Change"
      canConfirm={valid && okLength(reason, 3, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await changeSalesMinimum(amount, reason.trim(), pin, key);
        onDone("Minimum changed.");
      }}
    >
      <p>{t("This changes who counts in every period, including past ones, because the report is worked out each time it is opened.")}</p>
      <label>
        {t("Minimum, in dalasi")}
        <input type="number" min={10} max={100000} step="1" value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <TextArea label="Why" value={reason} onChange={setReason} min={3} max={300} />
    </ConfirmWithPin>
  );
}
