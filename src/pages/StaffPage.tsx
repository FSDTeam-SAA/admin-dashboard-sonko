import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  cancelPermissionsChange,
  cancelRoleChange,
  changePermissions,
  changeRole,
  findCustomers,
  resetTwoStep,
  staffList,
  type CustomerHit,
  type Person,
  type StaffRow,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { personLabel, when } from "../lib/format";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABEL } from "../lib/permissions";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

type Open =
  | { action: "permissions" | "approvePermissions" | "remove" | "approveRole" | "reset" | "cancelRole" | "cancelPermissions"; row: StaffRow }
  | { action: "add" }
  | { action: "addConfirm"; hit: CustomerHit }
  | null;

const ROLE_LABEL: Record<string, string> = { user: "customer", agent: "agent", admin: "staff" };

export function StaffPage() {
  const t = useT();
  const { staff } = useAuth();
  const [open, setOpen] = useState<Open>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => staffList(), []);
  const me = staff?._id;
  const people = data?.people ?? {};
  const members = (data?.staff ?? []).filter((s) => s.role === "admin");
  const waiting = (data?.staff ?? []).filter((s) => s.role !== "admin");
  const askedBy = (id: string) => (id === me ? "you" : personLabel(people[id]));

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader
        title="Staff"
        intro="Making someone staff, removing them and changing what they may do all need two different staff members. Nobody can change their own."
        actions={
          can(staff, "view_customers") ? (
            <button className="primary" onClick={() => setOpen({ action: "add" })}>
              {t("Make someone staff")}
            </button>
          ) : undefined
        }
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={false} />

      {waiting.length > 0 && (
        <div className="card panel">
          <h2>{t("Waiting to become staff")}</h2>
          {waiting.map((row) => (
            <div key={row.id} className="staff-line">
              <div>
                <strong>{personLabel(row)}</strong>
                <div className="muted small">
                  {t("Asked by {name} on {when}", { name: askedBy(row.pendingRoleChange!.requestedBy), when: when(row.pendingRoleChange!.requestedAt) })}
                </div>
              </div>
              <div className="row-end">
                <button onClick={() => setOpen({ action: "cancelRole", row })}>{t("Cancel")}</button>
                {row.pendingRoleChange!.requestedBy !== me && (
                  <button className="primary" onClick={() => setOpen({ action: "approveRole", row })}>
                    {t("Approve")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {members.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>{t("Staff member")}</th>
                <th>{t("Can do")}</th>
                <th>{t("Authenticator")}</th>
                <th>{t("Waiting changes")}</th>
                <th aria-label={t("Actions")} />
              </tr>
            </thead>
            <tbody>
              {members.map((row) => {
                const self = row.id === me;
                const perm = row.pendingPermissionsChange;
                const role = row.pendingRoleChange;
                return (
                  <tr key={row.id}>
                    <td>
                      {personLabel(row)}
                      {self && <div><Badge tone="plain">{t("You")}</Badge></div>}
                    </td>
                    <td className="wrap small">
                      {row.fullAdmin ? <Badge tone="warn">{t("Full admin: everything")}</Badge> : row.permissions.map((p) => t(PERMISSION_LABEL[p] || p)).join(", ")}
                    </td>
                    <td>{row.twoStepSetUp ? <Badge tone="ok">{t("Set up")}</Badge> : <Badge tone="danger">{t("Not set up")}</Badge>}</td>
                    <td className="wrap small">
                      {perm && (
                        <div>
                          {t("New permissions asked by {name}: {what}", { name: askedBy(perm.requestedBy), what: perm.full ? t("full admin") : t("{n} permissions", { n: perm.permissions.length }) })}
                        </div>
                      )}
                      {role && <div>{t("Removal from staff asked by {name}", { name: askedBy(role.requestedBy) })}</div>}
                      {!perm && !role && "—"}
                    </td>
                    <td className="actions">
                      {!self && !perm && <button onClick={() => setOpen({ action: "permissions", row })}>{t("Change permissions")}</button>}
                      {!self && perm && perm.requestedBy !== me && (
                        <button className="primary" onClick={() => setOpen({ action: "approvePermissions", row })}>
                          {t("Approve permissions")}
                        </button>
                      )}
                      {!self && perm && <button onClick={() => setOpen({ action: "cancelPermissions", row })}>{t("Cancel change")}</button>}
                      {!self && !role && <button onClick={() => setOpen({ action: "remove", row })}>{t("Remove from staff")}</button>}
                      {!self && role && role.requestedBy !== me && (
                        <button className="primary" onClick={() => setOpen({ action: "approveRole", row })}>
                          {t("Approve removal")}
                        </button>
                      )}
                      {!self && role && <button onClick={() => setOpen({ action: "cancelRole", row })}>{t("Keep as staff")}</button>}
                      {!self && row.twoStepSetUp && <button onClick={() => setOpen({ action: "reset", row })}>{t("Reset authenticator")}</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open?.action === "permissions" && <PermissionsDialog row={open.row} onClose={() => setOpen(null)} onDone={finish} />}
      {open?.action === "approvePermissions" && <PermissionsDialog row={open.row} approving people={people} onClose={() => setOpen(null)} onDone={finish} />}
      {open?.action === "remove" && (
        <RoleDialog
          title="Remove from staff"
          text={`${personLabel(open.row)} will become a customer and lose all staff access once a different staff member approves.`}
          label="Ask to remove"
          onConfirm={(pin) => changeRole(open.row.id, "user", pin)}
          onClose={() => setOpen(null)}
          onDone={() => finish("Asked. A different staff member must approve the removal.")}
        />
      )}
      {open?.action === "approveRole" && open.row.pendingRoleChange && (
        <RoleDialog
          title={open.row.pendingRoleChange.role === "admin" ? "Approve making this person staff" : "Approve removal from staff"}
          text={t("{name} becomes {role}. Asked by {by}.", { name: personLabel(open.row), role: t(ROLE_LABEL[open.row.pendingRoleChange.role] || open.row.pendingRoleChange.role), by: askedBy(open.row.pendingRoleChange.requestedBy) })}
          label="Approve"
          onConfirm={(pin) => changeRole(open.row.id, open.row.pendingRoleChange!.role as "user" | "agent" | "admin", pin)}
          onClose={() => setOpen(null)}
          onDone={() => finish("Done. The role has changed.")}
        />
      )}
      {open?.action === "cancelRole" && (
        <ConfirmWithPin
          title="Cancel the role change"
          confirmLabel="Cancel change"
          needsPin={false}
          onClose={() => setOpen(null)}
          onConfirm={async () => {
            await cancelRoleChange(open.row.id);
            finish("Role change cancelled. Nothing changed.");
          }}
        >
          <p>{t("{name} keeps their current role.", { name: personLabel(open.row) })}</p>
        </ConfirmWithPin>
      )}
      {open?.action === "cancelPermissions" && (
        <ConfirmWithPin
          title="Cancel the permissions change"
          confirmLabel="Cancel change"
          needsPin={false}
          onClose={() => setOpen(null)}
          onConfirm={async () => {
            await cancelPermissionsChange(open.row.id);
            finish("Permissions change cancelled. Nothing changed.");
          }}
        >
          <p>{t("{name} keeps their current permissions.", { name: personLabel(open.row) })}</p>
        </ConfirmWithPin>
      )}
      {open?.action === "reset" && (
        <ConfirmWithPin
          title="Reset their authenticator app"
          confirmLabel="Reset"
          danger
          onClose={() => setOpen(null)}
          onConfirm={async (pin) => {
            await resetTwoStep(open.row.id, pin);
            finish("Reset. They are logged out and will set up the app again at their next login.");
          }}
        >
          <p>
            {t("Only do this if {name} lost their phone, and you have checked it is really them (for example on a video call). They are logged out at once.", { name: personLabel(open.row) })}
          </p>
          <p className="hint">{t("Until they log in again, anyone with their PIN could set up the app in their place.")}</p>
        </ConfirmWithPin>
      )}
      {open?.action === "add" && <FindPerson onClose={() => setOpen(null)} onPick={(hit) => setOpen({ action: "addConfirm", hit })} />}
      {open?.action === "addConfirm" && (
        <RoleDialog
          title="Make this person staff"
          text={`${personLabel({ name: open.hit.name || open.hit.username, phone: open.hit.phone })} becomes staff once a different staff member approves. They start able to see the dashboard only; give them permissions here straight after (that also needs two people).`}
          label="Ask"
          onConfirm={(pin) => changeRole(open.hit._id, "admin", pin)}
          onClose={() => setOpen(null)}
          onDone={() => finish("Asked. A different staff member must approve it on this page.")}
        />
      )}
    </section>
  );
}

function RoleDialog({ title, text, label, onConfirm, onDone, onClose }: { title: string; text: string; label: string; onConfirm: (pin: string) => Promise<unknown>; onDone: () => void; onClose: () => void }) {
  return (
    <ConfirmWithPin
      title={title}
      confirmLabel={label}
      onClose={onClose}
      onConfirm={async (pin) => {
        await onConfirm(pin);
        onDone();
      }}
    >
      <p>{text}</p>
    </ConfirmWithPin>
  );
}

function PermissionsDialog({ row, approving, people = {}, onDone, onClose }: { row: StaffRow; approving?: boolean; people?: Record<string, Person>; onDone: (m: string) => void; onClose: () => void }) {
  const t = useT();
  const pending = row.pendingPermissionsChange;
  const start = approving && pending ? pending : { full: row.fullAdmin, permissions: row.permissions };
  const [full, setFull] = useState(start.full);
  const [picked, setPicked] = useState<Set<string>>(new Set(start.full ? [] : start.permissions));
  const key = useMemo(newIdempotencyKey, []);
  const toggle = (p: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  const list = ALL_PERMISSIONS.filter((p) => picked.has(p));

  return (
    <ConfirmWithPin
      title={approving ? "Approve new permissions" : `What ${row.name || "they"} may do`}
      confirmLabel={approving ? "Approve" : "Ask for approval"}
      canConfirm={full || list.length > 0}
      onClose={onClose}
      onConfirm={async (pin) => {
        await changePermissions(row.id, full ? { full: true } : { permissions: list }, pin, key);
        onDone(approving ? "Approved. Their permissions have changed." : "Asked. A different staff member must approve the same change.");
      }}
    >
      <p>
        <strong>{personLabel(row)}</strong>
        {approving && pending && <span className="muted"> {t("— asked by {name}", { name: personLabel(people[pending.requestedBy]) })}</span>}
      </p>
      {approving && <p className="hint">{t("Approving applies exactly this list. To change it, cancel and ask again.")}</p>}
      <label className="check">
        <input type="checkbox" checked={full} disabled={approving} onChange={(e) => setFull(e.target.checked)} />
        {t("Full admin: can do everything")}
      </label>
      {!full && (
        <div className="perm-groups">
          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.title} className="choices">
              <legend>{t(group.title)}</legend>
              {group.items.map(([p, label]) => (
                <label key={p} className="check small">
                  <input type="checkbox" checked={picked.has(p)} disabled={approving} onChange={() => toggle(p)} />
                  {t(label)}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      {!full && !list.length && <p className="hint warn-text">{t("Choose at least one.")}</p>}
    </ConfirmWithPin>
  );
}

function FindPerson({ onPick, onClose }: { onPick: (hit: CustomerHit) => void; onClose: () => void }) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<CustomerHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function find(event: FormEvent) {
    event.preventDefault();
    if (search.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      setHits((await findCustomers(search.trim())).users.filter((u) => u.role !== "admin"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not search.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" role="presentation">
      <div className="card dialog stack" role="dialog" aria-modal="true" aria-labelledby="find-staff-title">
        <h2 id="find-staff-title">{t("Find their Sunu Pay account")}</h2>
        <p className="hint">{t("They need their own Sunu Pay account first, with their own phone number.")}</p>
        <form className="row-start" onSubmit={find}>
          <input autoFocus placeholder={t("Phone number or name")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" disabled={busy || search.trim().length < 3}>
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
        {error && <p className="error">{t(error)}</p>}
        {hits && !hits.length && <p className="muted">{t("No account found.")}</p>}
        {hits && hits.length > 0 && (
          <ul className="hits">
            {hits.map((hit) => (
              <li key={hit._id}>
                <button className="hit" onClick={() => onPick(hit)}>
                  {personLabel({ name: hit.name || hit.username, phone: hit.phone })}
                  <span className="muted small">{hit.role === "agent" ? t("Agent") : t("Customer")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="row-end">
          <button onClick={onClose}>{t("Cancel")}</button>
        </div>
      </div>
    </div>
  );
}
