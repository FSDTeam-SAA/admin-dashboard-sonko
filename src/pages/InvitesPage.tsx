import { useMemo, useState } from "react";
import {
  cancelReferralChange,
  changeReferralSettings,
  referralInvites,
  referralSettings,
  type ReferralInvite,
  type ReferralProgramme,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { decimalsOf, money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

// Invite a friend: both people get a small cash bonus once the friend has
// checked their ID and made a first payment. Server rules:
// utils/referral.rules.js. Changing the programme needs two people.

export const WALLET_CURRENCIES = ["GBP", "EUR", "SEK", "GMD", "XOF", "GHS", "NGN"] as const;

const toMinor = (major: string, currency: string) => Math.round(Number(major || 0) * 10 ** decimalsOf(currency));
const toMajor = (minor: number, currency: string) => String(minor / 10 ** decimalsOf(currency));
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** One line saying what the programme is, for the page and the change log. */
export function describe(p: ReferralProgramme): string {
  if (!p.on) return "Off";
  const amounts = Object.entries(p.amounts)
    .map(([c, a]) => money(a.bonusMinor, c))
    .join(", ");
  return `On · ${amounts} each · up to ${p.perPersonCap} friends`;
}

const STATUS_TONE: Record<ReferralInvite["status"], "ok" | "warn" | "plain"> = { paid: "ok", waiting: "warn", paying: "warn", expired: "plain" };

export function InvitesPage() {
  const { staff } = useAuth();
  const t = useT();
  const manages = can(staff, "manage_referrals");
  const settings = useLoad(() => referralSettings(), []);
  const invites = useLoad(() => referralInvites(), []);
  const [done, setDone] = useState<string | null>(null);
  const [editing, setEditing] = useState<"new" | "approve" | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const finish = (m: string) => {
    setDone(m);
    settings.reload();
    invites.reload();
  };
  const s = settings.data;

  return (
    <section>
      <PageHeader
        title="Invite a friend"
        intro="Both people get a small cash bonus once the friend has checked their ID and made a first payment. Sunu Pay pays it from its own money. The programme in force when the friend signs up is the one paid."
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={settings.loading && !s} error={settings.error} empty={false} />
      {s && (
        <div className="card panel">
          <h2>{t("The programme")}</h2>
          <p>
            <Badge tone={s.live.on ? "ok" : "plain"}>{s.live.on ? "On" : "Off"}</Badge>{" "}
            {s.live.startsAt || s.live.endsAt
              ? t("From {from} to {to}", { from: s.live.startsAt ? when(s.live.startsAt) : "—", to: s.live.endsAt ? when(s.live.endsAt) : "—" })
              : t("No dates set")}
          </p>
          {Object.keys(s.live.amounts).length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("Wallet currency")}</th>
                    <th>{t("Bonus for each person")}</th>
                    <th>{t("Smallest first payment")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(s.live.amounts).map(([c, a]) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td>{money(a.bonusMinor, c)}</td>
                      <td>{money(a.minSendMinor, c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            {t("One person is paid for at most {n} friends. The friend still gets theirs after that.", { n: s.live.perPersonCap })}{" "}
            {t("The friend has {days} days from sign-up to qualify.", { days: s.daysToQualify })}
          </p>
          <p className="muted small">{t("Paid so far: {paid}. Waiting: {waiting}.", { paid: s.counts.paid, waiting: s.counts.waiting })}</p>

          {s.pending && (
            <div className="notice">
              <p>
                {t("Waiting for a second person: {what}, asked {when}. Reason: {reason}", {
                  what: t(describe(s.pending.settings)),
                  when: when(s.pending.at),
                  reason: s.pending.reason,
                })}
              </p>
              {manages && (
                <p>
                  {s.pending.by !== staff?._id && <button onClick={() => setEditing("approve")}>{t("Review and approve")}</button>}{" "}
                  <button onClick={() => setWithdrawing(true)}>{t("Withdraw")}</button>
                </p>
              )}
              {manages && s.pending.by === staff?._id && <p className="muted small">{t("You asked for this, so a different staff member must approve it.")}</p>}
            </div>
          )}
          {manages && <button onClick={() => setEditing("new")}>{t("Change the programme")}</button>}
          {s.changes.length > 0 && (
            <>
              <h3>{t("Changes")}</h3>
              <ul className="plain-list">
                {s.changes.map((c) => (
                  <li key={c.at} className="small">
                    {when(c.at)}: {t(describe(c.from))} → {t(describe(c.to))}. {c.reason}
                    {c.approveReason ? ` · ${t("Approved")}: ${c.approveReason}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card panel">
        <h2>{t("Latest invites")}</h2>
        <LoadState loading={invites.loading && !invites.data} error={invites.error} empty={false} />
        {invites.data && !invites.data.length && <p className="muted">{t("No invites yet.")}</p>}
        {invites.data && invites.data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Invited by")}</th>
                  <th>{t("Friend")}</th>
                  <th>{t("Signed up")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Paid")}</th>
                </tr>
              </thead>
              <tbody>
                {invites.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.inviter.name}</td>
                    <td>{r.invitee.name}</td>
                    <td>{when(r.signedUpAt)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[r.status]}>{r.status === "paying" ? "Waiting" : r.status === "paid" ? "Paid" : r.status === "expired" ? "Ran out of time" : "Waiting"}</Badge>
                      {r.status === "waiting" && <span className="muted small"> {t("until {date}", { date: when(r.qualifyBy) })}</span>}
                    </td>
                    <td className="small">
                      {r.inviterPaid?.amountMinor ? money(r.inviterPaid.amountMinor, r.inviterPaid.currency) : r.status === "paid" ? t(r.capped ? "Inviter at the cap" : "Inviter: none") : "—"}
                      {r.inviteePaid?.amountMinor ? ` + ${money(r.inviteePaid.amountMinor, r.inviteePaid.currency)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && s && (
        <ProgrammeDialog
          start={editing === "approve" && s.pending ? s.pending.settings : s.live}
          approving={editing === "approve"}
          onClose={() => setEditing(null)}
          onDone={(m) => {
            setEditing(null);
            finish(m);
          }}
        />
      )}
      {withdrawing && (
        <ConfirmWithPin
          title="Withdraw the waiting change"
          confirmLabel="Withdraw"
          needsPin={false}
          onClose={() => setWithdrawing(false)}
          onConfirm={async () => {
            await cancelReferralChange();
            setWithdrawing(false);
            finish("Request withdrawn. The programme stays as it is.");
          }}
        >
          <p>{t("The programme stays as it is.")}</p>
        </ConfirmWithPin>
      )}
    </section>
  );
}

type Row = { bonus: string; min: string };

function ProgrammeDialog({
  start,
  approving,
  onClose,
  onDone,
}: {
  start: ReferralProgramme;
  approving: boolean;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [on, setOn] = useState(start.on);
  const [from, setFrom] = useState(day(start.startsAt));
  const [to, setTo] = useState(day(start.endsAt));
  const [cap, setCap] = useState(String(start.perPersonCap || 10));
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      WALLET_CURRENCIES.map((c) => [c, { bonus: start.amounts[c] ? toMajor(start.amounts[c].bonusMinor, c) : "", min: start.amounts[c] ? toMajor(start.amounts[c].minSendMinor, c) : "" }])
    )
  );
  const [reason, setReason] = useState("");
  const rowOf = (c: string): Row => rows[c] ?? { bonus: "", min: "" };
  const setRow = (c: string, change: Partial<Row>) => setRows({ ...rows, [c]: { ...rowOf(c), ...change } });

  const programme: ReferralProgramme = {
    on,
    startsAt: from ? new Date(`${from}T00:00:00Z`).toISOString() : null,
    endsAt: to ? new Date(`${to}T23:59:59Z`).toISOString() : null,
    perPersonCap: Number(cap),
    amounts: Object.fromEntries(
      Object.entries(rows)
        .filter(([, r]) => Number(r.bonus) > 0)
        .map(([c, r]) => [c, { bonusMinor: toMinor(r.bonus, c), minSendMinor: toMinor(r.min, c) }])
    ),
  };
  const capOk = Number.isInteger(programme.perPersonCap) && programme.perPersonCap >= 1 && programme.perPersonCap <= 50;
  const datesOk = !from || !to || from <= to;
  const amountsOk = !on || Object.keys(programme.amounts).length > 0;

  return (
    <ConfirmWithPin
      title={approving ? "Approve the programme change" : "Change the programme"}
      confirmLabel={approving ? "Approve" : "Ask for the change"}
      canConfirm={capOk && datesOk && amountsOk && okLength(reason, 5, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await changeReferralSettings(programme, reason.trim(), pin, key);
        onDone(result.asked ? "Asked. A different staff member must approve the same settings within 24 hours." : "Invite programme changed.");
      }}
    >
      {!approving && <p>{t("Two people: you ask, then a different staff member approves exactly the same settings within 24 hours. Until then nothing changes.")}</p>}
      {approving && <p>{t("Check every figure. Approving changes the programme for everyone who signs up from now on.")}</p>}
      <label className="row">
        <input type="checkbox" checked={on} disabled={approving} onChange={(e) => setOn(e.target.checked)} /> {t("Programme on")}
      </label>
      <div className="row">
        <label>
          {t("Starts (optional)")}
          <input type="date" value={from} readOnly={approving} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          {t("Ends (optional)")}
          <input type="date" value={to} readOnly={approving} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {!datesOk && <p className="error small">{t("The end date must be after the start date.")}</p>}
      <label>
        {t("Most friends one person is paid for")}
        <input type="number" min={1} max={50} step={1} value={cap} readOnly={approving} onChange={(e) => setCap(e.target.value)} />
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Wallet currency")}</th>
              <th>{t("Bonus for each person")}</th>
              <th>{t("Smallest first payment")}</th>
            </tr>
          </thead>
          <tbody>
            {WALLET_CURRENCIES.map((c) => (
              <tr key={c}>
                <td>{c}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={decimalsOf(c) ? "0.01" : "1"}
                    value={rowOf(c).bonus}
                    readOnly={approving}
                    aria-label={`${c} ${t("Bonus for each person")}`}
                    onChange={(e) => setRow(c, { bonus: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={decimalsOf(c) ? "0.01" : "1"}
                    value={rowOf(c).min}
                    readOnly={approving}
                    aria-label={`${c} ${t("Smallest first payment")}`}
                    onChange={(e) => setRow(c, { min: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">{t("Leave a currency empty for no bonus in that wallet. Each person is paid in their own wallet's currency.")}</p>
      {!amountsOk && <p className="error small">{t("Set a bonus for at least one currency, or switch the programme off.")}</p>}
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={300} />
    </ConfirmWithPin>
  );
}
