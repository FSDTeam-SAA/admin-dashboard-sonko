import { useMemo, useState } from "react";
import {
  approveStaffInvite,
  cancelStaffInvite,
  createStaffInvite,
  resendStaffInvite,
  staffInvites,
  type InviteForm,
  type Person,
  type StaffInvite,
  type StaffRow,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { personLabel, when } from "../lib/format";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABEL } from "../lib/permissions";
import { FINE_TUNE_ONLY, LEVEL_SHORT, MODULES, PRESETS, applyPreset, levelOf, setLevel, type Level } from "../lib/permissionGrid";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

/**
 * The access grid: a preset to start from, then each area as None, See, or
 * See and change, and Fine-tune for single permissions. Used to change a
 * staff member's access and to add an employee.
 */
export function AccessGrid({ held, onChange, readOnly = false }: { held: Set<string>; onChange: (next: Set<string>) => void; readOnly?: boolean }) {
  const t = useT();
  return (
    <div className="stack">
      {!readOnly && (
        <label>
          {t("Start from")}{" "}
          <select
            defaultValue=""
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.key === e.target.value);
              if (preset) onChange(applyPreset(preset));
            }}
          >
            <option value="">{t("Choose a starting point…")}</option>
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {t(p.label)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="table-wrap">
        <table className="mini access-grid">
          <thead>
            <tr>
              <th>{t("Area")}</th>
              <th>{t("None")}</th>
              <th>{t("See")}</th>
              <th>{t("See and change")}</th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const level = levelOf(m, held);
              const choice = (value: "none" | "read" | "write", possible: boolean) => (
                <td key={value}>
                  {possible ? (
                    <input
                      type="radio"
                      name={`grid-${m.key}`}
                      aria-label={`${t(m.label)}: ${t(value === "none" ? "None" : value === "read" ? "See" : "See and change")}`}
                      checked={level === value}
                      disabled={readOnly}
                      onChange={() => onChange(setLevel(m, held, value))}
                    />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              );
              return (
                <tr key={m.key}>
                  <td>
                    {t(m.label)}
                    {level === "some" && <span className="muted small"> {t("(part: see Fine-tune)")}</span>}
                  </td>
                  {choice("none", true)}
                  {choice("read", m.read.length > 0)}
                  {choice("write", m.write.length > 0)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details>
        <summary>{t("Fine-tune: single permissions ({n} chosen)", { n: held.size })}</summary>
        <div className="perm-groups">
          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.title} className="choices">
              <legend>{t(group.title)}</legend>
              {group.items.map(([p, label]) => (
                <label key={p} className="check small">
                  <input
                    type="checkbox"
                    checked={held.has(p)}
                    disabled={readOnly}
                    onChange={() => {
                      const next = new Set(held);
                      if (next.has(p)) next.delete(p);
                      else next.add(p);
                      onChange(next);
                    }}
                  />
                  {t(label)}
                  {FINE_TUNE_ONLY.includes(p) && <span className="muted small"> {t("(only here)")}</span>}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Rows are areas, columns are people: who can see or change what, at a glance. */
export function WhoCanDoWhat({ members }: { members: StaffRow[] }) {
  const t = useT();
  const tone: Record<Level, "ok" | "warn" | "plain"> = { write: "ok", read: "plain", some: "warn", none: "plain" };
  return (
    <div className="table-wrap card">
      <table className="mini">
        <thead>
          <tr>
            <th>{t("Area")}</th>
            {members.map((m) => (
              <th key={m.id}>
                {m.name || m.phone}
                {m.profile?.jobTitle && <div className="muted small">{m.profile.jobTitle}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod) => (
            <tr key={mod.key}>
              <td>{t(mod.label)}</td>
              {members.map((m) => {
                const level: Level = m.fullAdmin ? (mod.write.length ? "write" : "read") : levelOf(mod, new Set(m.permissions));
                return <td key={m.id}>{level === "none" ? <span className="muted">—</span> : <Badge tone={tone[level]}>{t(LEVEL_SHORT[level])}</Badge>}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">{t("Full admins can see and change everything.")}</p>
    </div>
  );
}

const HOW: Record<string, string> = { made_staff: "Made staff", changed: "Access changed", invite: "Added as an employee" };

/** Who asked, who approved, when, and what was given. */
export function AccessHistory({ row, people }: { row: StaffRow; people: Record<string, Person> }) {
  const t = useT();
  const name = (id: string) => (id ? personLabel(people[id]) : "—");
  if (!row.history?.length) return <p className="muted small">{t("No changes recorded yet (changes before 22 Nov 2026 are in the audit trail).")}</p>;
  return (
    <ul className="plain-list small">
      {row.history.map((h, i) => (
        <li key={i}>
          <strong>{when(h.at)}</strong> · {t(HOW[h.how] ?? h.how)}: {h.full ? t("full admin") : t("{n} permissions", { n: h.permissions.length })} · {t("asked by {a}, approved by {b}", { a: name(h.requestedBy), b: name(h.approvedBy) })}
        </li>
      ))}
    </ul>
  );
}

export const COUNTRIES_FOR_STAFF: [string, string][] = [
  ["GM", "Gambia"],
  ["SN", "Senegal"],
  ["GB", "United Kingdom"],
  ["FR", "France"],
  ["US", "United States"],
];

/** The same checks as the server, so problems show before asking. */
export function inviteProblem(f: InviteForm): string | null {
  if (f.name.trim().length < 2 || f.name.trim().length > 80) return "Write the employee's full name (2 to 80 characters).";
  const digits = f.phone.replace(/[^\d]/g, "");
  if (!f.phone.trim().startsWith("+") || digits.length < 8 || digits.length > 15) return "Write the employee's mobile number with the country code, for example +220 7xx xxxx.";
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return "That email address doesn't look right.";
  if (!/^[A-Z]{2}$/.test(f.country)) return "Choose the country they work in.";
  if (f.employeeId.trim() && !/^[A-Za-z0-9-]{1,30}$/.test(f.employeeId.trim())) return "The employee ID can use letters, numbers and dashes only (up to 30).";
  if (f.jobTitle.trim().length > 60) return "Keep the job title to 60 characters.";
  if (!f.permissions.length) return "Choose at least one thing they may do.";
  return null;
}

/** Add employee: their details and access; a second person approves; they get a link to choose their own PIN. */
export function AddEmployee({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [f, setF] = useState<Omit<InviteForm, "permissions">>({ name: "", phone: "+220", email: "", country: "GM", employeeId: "", jobTitle: "" });
  const [held, setHeld] = useState<Set<string>>(new Set(["view_dashboard"]));
  const key = useMemo(newIdempotencyKey, []);
  const form: InviteForm = { ...f, permissions: ALL_PERMISSIONS.filter((p) => held.has(p)) };
  const problem = inviteProblem(form);
  const field = (k: keyof typeof f, label: string, extra: Record<string, unknown> = {}) => (
    <label>
      {t(label)}
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
    </label>
  );
  return (
    <ConfirmWithPin
      title="Add employee"
      confirmLabel="Ask for approval"
      canConfirm={!problem}
      onClose={onClose}
      onConfirm={async (pin) => {
        await createStaffInvite({ ...form, name: form.name.trim(), email: form.email.trim(), employeeId: form.employeeId.trim(), jobTitle: form.jobTitle.trim() }, pin, key);
        onDone("Invite saved. A different staff member must approve it before the employee gets their setup link.");
      }}
    >
      <p className="hint">{t("A different staff member approves. Then the employee gets a text (and email) with a one-time link to choose their own PIN; nobody else ever knows it. At their first login they set up the authenticator app.")}</p>
      <div className="grid two">
        {field("name", "Full name", { autoComplete: "off" })}
        {field("phone", "Mobile number (with country code)", { inputMode: "tel" })}
        {field("email", "Email (optional)", { type: "email" })}
        <label>
          {t("Country they work in")}
          <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
            {COUNTRIES_FOR_STAFF.map(([c, n]) => (
              <option key={c} value={c}>
                {t(n)}
              </option>
            ))}
          </select>
        </label>
        {field("employeeId", "Employee ID (optional)")}
        {field("jobTitle", "Job title (optional)")}
      </div>
      <h3>{t("What they may do")}</h3>
      <AccessGrid held={held} onChange={setHeld} />
      {problem && <p className="error">{t(problem)}</p>}
    </ConfirmWithPin>
  );
}

const INVITE_STATUS: Record<StaffInvite["status"], [string, "ok" | "warn" | "danger" | "plain"]> = {
  awaiting_approval: ["Waiting for a second person", "warn"],
  sent: ["Link sent", "ok"],
  link_expired: ["Link ran out", "danger"],
  accepted: ["Account set up", "ok"],
  cancelled: ["Cancelled", "plain"],
  expired: ["Not approved in time", "plain"],
};

/** Employees invited: approve, send the link again, or cancel. */
export function InvitesCard({ me, refreshKey, onDone }: { me?: string; refreshKey: number; onDone: (m: string) => void }) {
  const t = useT();
  const { data, error, loading, reload } = useLoad(staffInvites, [refreshKey]);
  const [act, setAct] = useState<{ kind: "approve" | "resend" | "cancel"; inv: StaffInvite } | null>(null);
  const key = useMemo(newIdempotencyKey, [act]);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const open = data.invites.filter((i) => ["awaiting_approval", "sent", "link_expired"].includes(i.status));
  const recent = data.invites.filter((i) => !open.includes(i)).slice(0, 10);
  if (!open.length && !recent.length) return null;
  const finish = (m: string) => {
    setAct(null);
    reload();
    onDone(m);
  };
  return (
    <div className="card panel">
      <h2>{t("Employees invited")}</h2>
      {open.map((inv) => (
        <div key={inv.id} className="staff-line">
          <div>
            <strong>{inv.name}</strong> <span className="muted small">{inv.phone}{inv.jobTitle ? ` · ${inv.jobTitle}` : ""}</span>
            <div className="muted small">
              <Badge tone={INVITE_STATUS[inv.status][1]}>{t(INVITE_STATUS[inv.status][0])}</Badge> {t("Added by {name} {when}", { name: inv.invitedBy || "—", when: when(inv.invitedAt) })}
              {inv.approvedBy && ` · ${t("approved by {name}", { name: inv.approvedBy })}`} · {t("{n} permissions", { n: inv.permissions.length })}
            </div>
          </div>
          <div className="row-end">
            {inv.status === "awaiting_approval" && inv.invitedById !== me && (
              <button className="primary" onClick={() => setAct({ kind: "approve", inv })}>
                {t("Approve")}
              </button>
            )}
            {(inv.status === "sent" || inv.status === "link_expired") && <button onClick={() => setAct({ kind: "resend", inv })}>{t("Send the link again")}</button>}
            <button onClick={() => setAct({ kind: "cancel", inv })}>{t("Cancel")}</button>
          </div>
        </div>
      ))}
      {recent.length > 0 && (
        <details>
          <summary>{t("Earlier invites")}</summary>
          <ul className="plain-list small">
            {recent.map((inv) => (
              <li key={inv.id}>
                {inv.name} · {t(INVITE_STATUS[inv.status][0])} · {when(inv.acceptedAt ?? inv.invitedAt)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {act?.kind === "approve" && (
        <ConfirmWithPin
          title="Approve this employee"
          confirmLabel="Approve and send link"
          onClose={() => setAct(null)}
          onConfirm={async (pin) => {
            await approveStaffInvite(act.inv.id, pin, key);
            finish("Approved. The employee has been sent their setup link (valid for 3 days).");
          }}
        >
          <p>{t("{name} ({phone}) gets a staff login with these permissions:", { name: act.inv.name, phone: act.inv.phone })}</p>
          <ul className="small">
            {act.inv.permissions.map((p) => (
              <li key={p}>{t(PERMISSION_LABEL[p] || p)}</li>
            ))}
          </ul>
          <p className="hint">{t("Check the phone number is really theirs: the setup link goes to it.")}</p>
        </ConfirmWithPin>
      )}
      {act?.kind === "resend" && (
        <ConfirmWithPin
          title="Send the link again"
          confirmLabel="Send"
          onClose={() => setAct(null)}
          onConfirm={async (pin) => {
            await resendStaffInvite(act.inv.id, pin, key);
            finish("A new setup link was sent. The old one no longer works.");
          }}
        >
          <p>{t("A new link goes to {phone}. The old link stops working.", { phone: act.inv.phone })}</p>
        </ConfirmWithPin>
      )}
      {act?.kind === "cancel" && (
        <ConfirmWithPin
          title="Cancel this invite"
          confirmLabel="Cancel invite"
          needsPin={false}
          danger
          onClose={() => setAct(null)}
          onConfirm={async () => {
            await cancelStaffInvite(act.inv.id);
            finish("Invite cancelled.");
          }}
        >
          <p>{t("Any link already sent stops working.")}</p>
        </ConfirmWithPin>
      )}
    </div>
  );
}
