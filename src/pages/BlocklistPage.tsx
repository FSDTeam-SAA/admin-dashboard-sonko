import { useMemo, useState } from "react";
import {
  addBlock,
  blocklist,
  blocklistMatches,
  cancelBlockRemoveAsk,
  closeBlockMatch,
  confirmBlock,
  lookUpBlock,
  removeBlock,
  type BlockEntry,
  type BlockReason,
  type BlockState,
  type BlockType,
} from "../api/admin";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Pager, Tabs, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";

export const TYPE_LABEL: Record<BlockType, string> = {
  phone: "Phone number",
  email: "Email",
  id_document: "ID document number",
  bank_account: "Bank account number",
};
export const REASON_LABEL: Record<BlockReason, string> = {
  CONFIRMED_FRAUD: "Confirmed fraud",
  MONEY_MULE: "Money mule",
  STOLEN_IDENTITY: "Stolen identity",
  IMPERSONATION: "Pretending to be someone else",
  OTHER: "Other",
};
export const STATE_LABEL: Record<BlockState, { label: string; tone: "ok" | "warn" | "danger" | "plain" }> = {
  unconfirmed: { label: "Blocked, needs a second person", tone: "warn" },
  blocked: { label: "Blocked", tone: "danger" },
  expired: { label: "Stopped: nobody confirmed", tone: "plain" },
  removed: { label: "Removed", tone: "plain" },
};
export const PLACE_LABEL: Record<string, string> = {
  sign_up_code: "sign-up code",
  sign_up: "sign-up",
  sign_in: "sign-in",
  add_recipient: "adding a recipient",
  send_money: "sending money",
  bank_transfer: "bank transfer",
  cash_out: "cash out",
  agent_approval: "agent approval",
};

/** Hours left, rounded down, for "needs a second person within …". */
export function hoursLeft(until: string | null, now = Date.now()) {
  if (!until) return 0;
  return Math.max(0, Math.floor((new Date(until).getTime() - now) / 3_600_000));
}

/**
 * People removed for fraud, so they can't simply sign up again. Values are
 * never shown in full. Adding blocks at once for 72 hours; a different staff
 * member must confirm to keep it. Removing needs two people.
 */
export function BlocklistPage() {
  const { staff } = useAuth();
  const can = (permission: string) => (staff?.permissions ?? []).includes(permission);
  const [reload, setReload] = useState(0);
  const [all, setAll] = useState<"in_use" | "all">("in_use");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<BlockEntry | null>(null);
  const [removing, setRemoving] = useState<BlockEntry | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const list = useLoad(() => blocklist(all === "all", page), [all, page, reload]);
  const matches = useLoad(() => blocklistMatches(), [reload]);
  const finish = (message: string) => {
    setAdding(false);
    setConfirming(null);
    setRemoving(null);
    setDone(message);
    setReload((n) => n + 1);
  };
  const canAdd = can("add_to_blocklist");
  const canManage = can("manage_blocklist");
  const rows = list.data?.entries ?? [];

  return (
    <section>
      <PageHeader
        title="Blocklist"
        intro="Stops people removed for fraud from signing up again. It is checked at sign-up, sign-in, adding a recipient, sending money, bank transfers, cash out and agent approval. The person only sees “We can't do this right now”, never why. Numbers are stored scrambled and never shown in full."
        actions={
          canAdd && (
            <button className="primary" onClick={() => setAdding(true)}>
              Add to blocklist
            </button>
          )
        }
      />
      {done && <p className="notice">{done}</p>}

      <LookUp />

      {(matches.data?.length ?? 0) > 0 && (
        <article className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3>Recent matches</h3>
          <p className="muted small">Someone on the list tried to use SunuPay. Look into each one, then close it.</p>
          {matches.data!.map((m) => (
            <MatchRow key={m.id} m={m} canClose={canManage} onDone={finish} />
          ))}
        </article>
      )}

      <Tabs
        value={all}
        options={[
          ["in_use", "Blocking now"],
          ["all", "Everything, including removed"],
        ]}
        onChange={(v) => {
          setAll(v);
          setPage(1);
        }}
      />
      <LoadState loading={list.loading && !list.data} error={list.error} empty={!rows.length} />
      {rows.map((e) => (
        <article key={e.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <p>
            <Badge tone={STATE_LABEL[e.state].tone}>{STATE_LABEL[e.state].label}</Badge>{" "}
            <strong>{e.masked}</strong> <span className="muted small">{TYPE_LABEL[e.type]}</span>
          </p>
          <p>
            {REASON_LABEL[e.reason]}: {e.note}
          </p>
          <p className="muted small">
            Added by {e.addedByName || "—"}, {when(e.addedAt)}
            {e.confirmedAt ? ` · Confirmed by ${e.confirmedByName || "—"}, ${when(e.confirmedAt)}` : ""}
            {e.removedAt ? ` · Removed by ${e.removedByName || "—"}, ${when(e.removedAt)}: ${e.removeReason}` : ""}
            {e.matches ? ` · ${e.matches} match${e.matches === 1 ? "" : "es"}, last ${when(e.lastMatchAt)} at ${PLACE_LABEL[e.lastMatchPlace] ?? e.lastMatchPlace}` : ""}
          </p>
          {e.state === "unconfirmed" && (
            <p className="muted small">
              Stops by itself in {hoursLeft(e.unconfirmedUntil)} hours unless a different staff member confirms it.
            </p>
          )}
          {e.removeAsk && (
            <p className="notice">
              {e.removeAsk.requestedByName || "A staff member"} asked to remove this, {when(e.removeAsk.requestedAt)}: {e.removeAsk.reason}
            </p>
          )}
          <div className="row-start">
            {e.state === "unconfirmed" && canManage && e.addedBy !== staff?._id && (
              <button onClick={() => setConfirming(e)}>Review and confirm</button>
            )}
            {(e.state === "unconfirmed" || e.state === "blocked") && (canManage || (e.state === "unconfirmed" && e.addedBy === staff?._id)) && (
              <RemoveButton e={e} me={staff?._id} onOpen={() => setRemoving(e)} />
            )}
            {e.removeAsk && canManage && (
              <button
                onClick={async () => {
                  try {
                    await cancelBlockRemoveAsk(e.id);
                    finish("Request to remove withdrawn. The entry stays.");
                  } catch (err) {
                    setDone(err instanceof Error ? err.message : "Could not withdraw.");
                  }
                }}
              >
                Withdraw request to remove
              </button>
            )}
          </div>
        </article>
      ))}
      <Pager pagination={list.data?.pagination} onPage={setPage} />

      {adding && <AddDialog onClose={() => setAdding(false)} onDone={finish} />}
      {confirming && <ConfirmDialog e={confirming} onClose={() => setConfirming(null)} onDone={finish} />}
      {removing && <RemoveDialog e={removing} me={staff?._id} onClose={() => setRemoving(null)} onDone={finish} />}
    </section>
  );
}

/** What pressing "Remove" will do for this staff member. */
export function removeAction(e: BlockEntry, me: string | undefined): "take_back" | "ask" | "approve" | "mine" {
  if (e.state === "unconfirmed" && e.addedBy === me) return "take_back";
  if (!e.removeAsk) return "ask";
  return e.removeAsk.requestedBy === me ? "mine" : "approve";
}

function RemoveButton({ e, me, onOpen }: { e: BlockEntry; me?: string; onOpen: () => void }) {
  const action = removeAction(e, me);
  if (action === "mine") return <span className="hint">You asked to remove this. A different staff member must approve.</span>;
  const label = action === "take_back" ? "Take back (you added it)" : action === "approve" ? "Approve removing" : "Ask to remove";
  return (
    <button className="danger" onClick={onOpen}>
      {label}
    </button>
  );
}

function LookUp() {
  const [type, setType] = useState<BlockType>("phone");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  return (
    <article className="card" style={{ padding: 16, marginBottom: 16 }}>
      <h3>Look up</h3>
      <form
        className="row-start"
        onSubmit={async (ev) => {
          ev.preventDefault();
          setBusy(true);
          setResult(null);
          try {
            const found = await lookUpBlock(type, value);
            const live = found.entries.filter((x) => x.state === "blocked" || x.state === "unconfirmed");
            setResult(
              live.length
                ? `${found.masked} is on the blocklist (${STATE_LABEL[live[0]!.state].label.toLowerCase()}).`
                : found.entries.length
                  ? `${found.masked} is not blocked now. It was on the list before.`
                  : `${found.masked} is not on the blocklist.`,
            );
            setValue("");
          } catch (err) {
            setResult(err instanceof Error ? err.message : "Could not look up.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <select aria-label="Type" value={type} onChange={(ev) => setType(ev.target.value as BlockType)}>
          {Object.entries(TYPE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <input aria-label="Value to look up" value={value} maxLength={200} autoComplete="off" onChange={(ev) => setValue(ev.target.value)} />
        <button type="submit" disabled={busy || value.trim().length < 4}>
          Look up
        </button>
      </form>
      {result && <p className="notice">{result}</p>}
    </article>
  );
}

function MatchRow({ m, canClose, onDone }: { m: import("../api/admin").BlockMatch; canClose: boolean; onDone: (s: string) => void }) {
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 8 }}>
      <p>
        <strong>{m.masked}</strong> <span className="muted small">{m.type ? TYPE_LABEL[m.type] : ""}</span> · {m.matches} tr{m.matches === 1 ? "y" : "ies"} at{" "}
        {m.places.map((p) => PLACE_LABEL[p] ?? p).join(", ")} · last {when(m.lastAt)}
      </p>
      {canClose && !closing && <button onClick={() => setClosing(true)}>Close</button>}
      {closing && (
        <ConfirmWithPin
          title="Close this match"
          confirmLabel="Close"
          needsPin={false}
          canConfirm={okLength(note, 10, 300)}
          onClose={() => setClosing(false)}
          onConfirm={async () => {
            await closeBlockMatch(m.id, note.trim());
            onDone("Match closed.");
          }}
        >
          <TextArea label="What you found or did" value={note} onChange={setNote} min={10} max={300} />
        </ConfirmWithPin>
      )}
    </div>
  );
}

function AddDialog({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const [type, setType] = useState<BlockType>("phone");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState<BlockReason>("CONFIRMED_FRAUD");
  const [note, setNote] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Add to blocklist"
      confirmLabel="Block now"
      danger
      canConfirm={value.trim().length >= 4 && okLength(note, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await addBlock({ type, value: value.trim(), reason, note: note.trim() }, pin, key);
        onDone("Added. It blocks now for 72 hours. A different staff member must confirm it to keep it.");
      }}
    >
      <p>This blocks straight away. Unless a different staff member confirms within 72 hours, it stops by itself.</p>
      <label>
        What to block
        <select value={type} onChange={(e) => setType(e.target.value as BlockType)}>
          {Object.entries(TYPE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {TYPE_LABEL[type]}
        <input value={value} maxLength={200} autoComplete="off" onChange={(e) => setValue(e.target.value)} />
        <span className="hint">Stored scrambled. Nobody can read it back, so check it now.</span>
      </label>
      <label>
        Reason
        <select value={reason} onChange={(e) => setReason(e.target.value as BlockReason)}>
          {Object.entries(REASON_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <TextArea label="What happened (staff only)" value={note} onChange={setNote} min={10} max={300} />
    </ConfirmWithPin>
  );
}

function ConfirmDialog({ e, onClose, onDone }: { e: BlockEntry; onClose: () => void; onDone: (m: string) => void }) {
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Confirm this block"
      confirmLabel="Confirm"
      onClose={onClose}
      onConfirm={async (pin) => {
        await confirmBlock(e.id, pin, key);
        onDone("Confirmed. It stays on the blocklist until two people remove it.");
      }}
    >
      <p>
        <strong>{e.masked}</strong> ({TYPE_LABEL[e.type]}), added by {e.addedByName || "—"}.
      </p>
      <p>
        {REASON_LABEL[e.reason]}: {e.note}
      </p>
      <p>You are the second check. Only confirm if you have seen the evidence.</p>
    </ConfirmWithPin>
  );
}

function RemoveDialog({ e, me, onClose, onDone }: { e: BlockEntry; me?: string; onClose: () => void; onDone: (m: string) => void }) {
  const action = removeAction(e, me);
  const [reason, setReason] = useState(action === "approve" ? (e.removeAsk?.reason ?? "") : "");
  const key = useMemo(newIdempotencyKey, []);
  const title = action === "take_back" ? "Take back this entry" : action === "approve" ? "Approve removing" : "Ask to remove";
  return (
    <ConfirmWithPin
      title={title}
      confirmLabel={action === "ask" ? "Ask" : "Remove"}
      danger
      canConfirm={okLength(reason, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await removeBlock(e.id, reason.trim(), pin, key);
        onDone(result.asked ? "Asked. A different staff member must approve removing it." : "Removed from the blocklist.");
      }}
    >
      <p>
        <strong>{e.masked}</strong> ({TYPE_LABEL[e.type]}).{" "}
        {action === "take_back"
          ? "You added this and nobody has confirmed it yet, so you can take it back alone."
          : action === "approve"
            ? `${e.removeAsk?.requestedByName || "A staff member"} asked to remove it. Removing lets this person use SunuPay again.`
            : "A different staff member must approve before it is removed. It keeps blocking until then."}
      </p>
      <TextArea label="Why" value={reason} onChange={setReason} min={10} max={300} />
    </ConfirmWithPin>
  );
}
