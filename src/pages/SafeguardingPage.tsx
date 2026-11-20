import { useMemo, useState } from "react";
import {
  confirmSafeguardingCheck,
  recordSafeguardingCheck,
  safeguardingStatus,
  withdrawSafeguardingCheck,
  type SafeguardingCurrency,
  type SafeguardingEntry,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { money, personLabel, when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

const LEVEL_LABEL = { ok: "All good", warning: "Needs a look", alert: "Act today" } as const;
const LEVEL_TONE = { ok: "ok", warning: "warn", alert: "danger" } as const;
const STATUS_LABEL: Record<SafeguardingEntry["status"], string> = {
  open: "Waiting for a second person",
  confirmed: "Confirmed",
  mismatch: "Figures didn't match",
  withdrawn: "Withdrawn",
};
const BALANCE = /^\d{1,13}([.,]\d{1,3})?$/;
const nowLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

type Dialog = { kind: "record"; currency: string } | { kind: "confirm"; entry: SafeguardingEntry } | { kind: "withdraw"; entry: SafeguardingEntry } | null;

/**
 * Daily safeguarding check. One person types the bank balance; a second
 * person types it again from the statement without seeing the first. Any
 * shortfall pauses money going out in that currency until a confirmed check
 * shows none. Nothing here can be edited or deleted.
 */
export function SafeguardingPage() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => safeguardingStatus(), []);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [done, setDone] = useState<string | null>(null);
  const mayRecord = can(staff, "record_safeguarding");

  const finish = (message: string) => {
    setDialog(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader
        title="Safeguarding"
        intro="Each day, one person types the safeguarding bank balance and a second person confirms it by typing it again from the statement. The system compares it with what customers and agents are owed. A shortfall pauses money going out in that currency until a confirmed check shows none."
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && (
        <>
          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p>
              <Badge tone={data.ledger.ok ? "ok" : "danger"}>{data.ledger.ok ? "Ledger adds up" : "Ledger problem"}</Badge>{" "}
              <span className="muted small">{t("Checked {when}", { when: when(data.ledger.checkedAt) })}</span>
            </p>
            <p>
              {data.ledger.ok
                ? t("Every wallet matches the ledger, every payment balances and no wallet is below zero.")
                : t("{a} wallets don't match the ledger, {b} payments don't balance, {c} wallets are below zero. Ask the developer to look at this today.", {
                    a: data.ledger.mismatches,
                    b: data.ledger.unbalancedPostings,
                    c: data.ledger.negativeWallets,
                  })}
            </p>
          </article>

          {data.currencies.map((c) => (
            <CurrencyCard key={c.currency} c={c} mayRecord={mayRecord} onDialog={setDialog} />
          ))}

          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3>{t("Recent checks")}</h3>
            {data.history.length ? (
              <table>
                <thead>
                  <tr>
                    <th>{t("Balance time")}</th>
                    <th>{t("In the bank")}</th>
                    <th>{t("Owed")}</th>
                    <th>{t("Difference")}</th>
                    <th>{t("Result")}</th>
                    <th>{t("Typed by")}</th>
                    <th>{t("Confirmed by")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((e) => (
                    <tr key={e.id}>
                      <td>{when(e.asAt)}</td>
                      <td>{e.bankMinor === null ? t("Hidden until confirmed") : money(e.bankMinor, e.currency)}</td>
                      <td>{money(e.owedMinor, e.currency)}</td>
                      <td>{e.differenceMinor === null ? "—" : money(e.differenceMinor, e.currency)}</td>
                      <td>
                        <Badge tone={e.status === "confirmed" ? (e.short ? "danger" : "ok") : e.status === "mismatch" ? "danger" : "plain"}>{STATUS_LABEL[e.status]}</Badge>
                      </td>
                      <td>{personLabel(e.enteredBy)}</td>
                      <td>{e.status === "confirmed" ? personLabel(e.decidedBy) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">{t("No checks yet.")}</p>
            )}
          </article>
        </>
      )}
      {dialog?.kind === "record" && <RecordDialog currency={dialog.currency} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog?.kind === "confirm" && <ConfirmDialog entry={dialog.entry} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog?.kind === "withdraw" && <WithdrawDialog entry={dialog.entry} onClose={() => setDialog(null)} onDone={finish} />}
    </section>
  );
}

function CurrencyCard({ c, mayRecord, onDialog }: { c: SafeguardingCurrency; mayRecord: boolean; onDialog: (d: Dialog) => void }) {
  const t = useT();
  const last = c.latestConfirmed;
  return (
    <article className="card" style={{ padding: 16, marginBottom: 12 }}>
      <h3>
        {c.currency} <Badge tone={LEVEL_TONE[c.level]}>{LEVEL_LABEL[c.level]}</Badge>
      </h3>
      {c.paused && (
        <p className="warn-text">
          {t(
            c.why === "open_shortfall"
              ? "Money going out in {currency} is PAUSED: a check waiting for confirmation shows a shortfall."
              : "Money going out in {currency} is PAUSED: the last confirmed check showed a shortfall. Top the account up, then record and confirm a new balance.",
            { currency: c.currency }
          )}
        </p>
      )}
      <dl className="facts">
        <dt>{t("Owed to customers and agents now")}</dt>
        <dd>{money(c.owedNowMinor, c.currency)}</dd>
        <dt>{t("Last confirmed check")}</dt>
        <dd>
          {last
            ? t("{when}: {bank} in the bank, {owed} owed, difference {diff}", {
                when: when(last.asAt),
                bank: money(last.bankMinor ?? 0, c.currency),
                owed: money(last.owedMinor, c.currency),
                diff: money(last.differenceMinor ?? 0, c.currency),
              })
            : t("None yet")}
        </dd>
        {last && (
          <>
            <dt>{t("Typed and confirmed by")}</dt>
            <dd>{`${personLabel(last.enteredBy)} · ${personLabel(last.decidedBy)}`}</dd>
          </>
        )}
      </dl>
      {!last && !c.open && <p className="hint">{t("No check recorded yet for {currency}.", { currency: c.currency })}</p>}
      {c.open && (
        <div className="hint" style={{ marginTop: 12 }}>
          <p>
            {t("{name} typed a balance for {when}. Waiting for a second person.", { name: personLabel(c.open.enteredBy), when: when(c.open.asAt) })}
            {c.open.confirmTries > 0 && ` ${t("Wrong tries so far: {n} of 3.", { n: c.open.confirmTries })}`}
          </p>
          {c.open.mine && c.open.bankMinor !== null && (
            <p>
              {t("You typed {bank}. Owed at that time: {owed}. Difference: {diff}.", {
                bank: money(c.open.bankMinor, c.currency),
                owed: money(c.open.owedMinor, c.currency),
                diff: money(c.open.differenceMinor ?? 0, c.currency),
              })}
            </p>
          )}
          {mayRecord && !c.open.mine && <button onClick={() => onDialog({ kind: "confirm", entry: c.open! })}>{t("Confirm this balance")}</button>}
          {mayRecord && c.open.mine && (
            <button className="secondary" onClick={() => onDialog({ kind: "withdraw", entry: c.open! })}>
              {t("Withdraw my check")}
            </button>
          )}
        </div>
      )}
      {mayRecord && !c.open && (
        <button style={{ marginTop: 12 }} onClick={() => onDialog({ kind: "record", currency: c.currency })}>
          {t("Record today's balance")}
        </button>
      )}
    </article>
  );
}

function RecordDialog({ currency, onClose, onDone }: { currency: string; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [asAt, setAsAt] = useState(nowLocal);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const ok = BALANCE.test(amount.trim().replace(/,(?=\d{3})/g, "")) && Boolean(asAt) && note.trim().length <= 300;
  return (
    <ConfirmWithPin
      title="Record today's balance"
      confirmLabel="Record"
      canConfirm={ok}
      onClose={onClose}
      onConfirm={async (pin) => {
        const r = await recordSafeguardingCheck({ currency, asAt: new Date(asAt).toISOString(), bankAmount: amount.trim().replace(/,(?=\d{3})/g, ""), note: note.trim(), pin }, key);
        onDone(r.short ? "Recorded. There is a shortfall, so money going out in this currency is now paused." : "Recorded. A second person now confirms it.");
      }}
    >
      <p>{t("Type the {currency} safeguarding account balance exactly as the bank statement shows it, and the time it is from.", { currency })}</p>
      <label>
        {t("Balance time")}
        <input type="datetime-local" value={asAt} onChange={(e) => setAsAt(e.target.value)} />
      </label>
      <label>
        {t("Balance in the bank ({currency})", { currency })}
        <input inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <TextArea label="Note (optional)" value={note} onChange={setNote} min={0} max={300} />
    </ConfirmWithPin>
  );
}

function ConfirmDialog({ entry, onClose, onDone }: { entry: SafeguardingEntry; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [amount, setAmount] = useState("");
  return (
    <ConfirmWithPin
      title="Confirm this balance"
      confirmLabel="Confirm"
      canConfirm={BALANCE.test(amount.trim().replace(/,(?=\d{3})/g, ""))}
      onClose={onClose}
      onConfirm={async (pin) => {
        const r = await confirmSafeguardingCheck(entry.id, { bankAmount: amount.trim().replace(/,(?=\d{3})/g, ""), pin }, key);
        onDone(r.short ? "Confirmed. The shortfall is now on record and money going out stays paused." : "Check confirmed.");
      }}
    >
      <p>
        {t("Open the bank statement yourself and type the {currency} balance for {when}. You can't see what the first person typed. After 3 wrong tries the check closes and a case opens.", {
          currency: entry.currency,
          when: when(entry.asAt),
        })}
      </p>
      <label>
        {t("Balance in the bank ({currency})", { currency: entry.currency })}
        <input inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}

function WithdrawDialog({ entry, onClose, onDone }: { entry: SafeguardingEntry; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Withdraw my check"
      confirmLabel="Withdraw"
      canConfirm={okLength(reason, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await withdrawSafeguardingCheck(entry.id, { reason: reason.trim(), pin }, key);
        onDone("Check withdrawn.");
      }}
    >
      <p>{t("Use this only if you typed the wrong figure. The check stays on record as withdrawn, and any shortfall case stays open for review.")}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={10} max={300} />
    </ConfirmWithPin>
  );
}
