import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  lockCustomerSending,
  blockCustomerDevice,
  cancelCustomerPhoneChange,
  closeCustomerAccount,
  customer,
  reopenCustomerAccount,
  customers,
  type CustomerFilter,
  type CustomerRow,
  type BlockReason,
  type CustomerDevice,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { REASON_LABEL } from "./BlocklistPage";
import {
  CallerCheckDialog,
  ChangePhoneDialog,
  EditCustomerDialog,
} from "../components/customerCare";
import {
  Badge,
  LoadState,
  PageHeader,
  Pager,
  Tabs,
  TextArea,
  okLength,
} from "../components/common";
import { PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { CustomerStatusStrip } from "../components/CustomerStatusStrip";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { CustomerMessages } from "./CustomerMessages";
import { HigherLimitSection } from "./HigherLimitSection";
import { useT } from "../i18n/language";

export const TYPE_LABEL: Record<string, string> = {
  "send-money": "Money sent",
  bank: "Bank payment",
  "top-up": "Top-up",
  airtime: "Airtime",
  bill: "Bill",
  "cash-in": "Cash in",
  "cash-out": "Cash out",
  "wallet-top-up": "Added to wallet",
  convert: "Currency conversion",
  refund: "Refund",
};

const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  "address.street": "Street",
  "address.city": "Town or city",
  "address.state": "Region",
  "address.zipCode": "Postcode",
  "address.country": "Country",
};

function VerificationBadge({ row }: { row: CustomerRow }) {
  const level = row.verification ?? (row.idChecked ? "partial" : "none");
  if (level === "full") return <Badge tone="ok">Fully verified</Badge>;
  if (level === "partial") return <Badge tone="warn">Partially verified</Badge>;
  return <Badge tone="danger">Not verified</Badge>;
}

export function CustomersPage() {
  const t = useT();
  const [filter, setFilter] = useState<CustomerFilter | "all">("all");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  // ?open=<id> opens a customer straight away (links from Transactions and Cases).
  const [params] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => (/^[a-f0-9]{24}$/i.test(params.get("open") ?? "") ? params.get("open") : null));
  const { data, error, loading } = useLoad(
    () => customers(filter, search, page),
    [filter, search, page],
  );
  const rows = data?.customers ?? [];

  if (openId)
    return <CustomerView customerId={openId} onBack={() => setOpenId(null)} />;

  const find = (event: FormEvent) => {
    event.preventDefault();
    setSearch(typed);
    setPage(1);
  };

  return (
    <section>
      <PageHeader
        title="Customers"
        intro="Find a customer and open their file. Every time a file is opened, your name is saved against it."
      />
      <Tabs
        value={filter}
        options={
          [
            ["all", "All"],
            ["verified", "ID checked"],
            ["unverified", "ID not checked"],
            ["held", "On hold"],
          ] as const
        }
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
      />
      <form className="row-start search" onSubmit={find}>
        <input
          placeholder={t("Name, phone or email")}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <button type="submit">{t("Search")}</button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTyped("");
            }}
          >
            {t("Clear")}
          </button>
        )}
      </form>
      <LoadState
        loading={loading && !data}
        error={error}
        empty={!rows.length}
      />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>{t("Name")}</th>
                <th>{t("Phone")}</th>
                <th>{t("Verification")}</th>
                <th>{t("Last login")}</th>
                <th>{t("Joined")}</th>
                <th aria-label={t("Open file")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row: CustomerRow) => (
                <tr
                  key={row.id}
                  className="clickable"
                  onClick={() => setOpenId(row.id)}
                >
                  <td>
                    <strong>{row.name || "—"}</strong>
                    {row.role === "agent" && (
                      <div className="muted small">{t("Agent")}</div>
                    )}
                    {row.onHold && (
                      <div>
                        <Badge tone="danger">On hold</Badge>
                      </div>
                    )}
                    {row.closed && (
                      <div>
                        <Badge tone="plain">{row.deactivated ? "Deactivated" : "Closed"}</Badge>
                      </div>
                    )}
                  </td>
                  <td>{row.phone || "—"}</td>
                  <td>
                    <VerificationBadge row={row} />
                  </td>
                  <td>{when(row.lastLoginAt)}</td>
                  <td>{when(row.joinedAt)}</td>
                  <td className="actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(row.id);
                      }}
                    >
                      {t("Open file")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const t = useT();
  return (
    <>
      <dt>{t(label)}</dt>
      <dd>{value}</dd>
    </>
  );
}

function CustomerView({
  customerId,
  onBack,
}: {
  customerId: string;
  onBack: () => void;
}) {
  const { staff } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [holding, setHolding] = useState(false);
  const [locking, setLocking] = useState(false);
  const [closing, setClosing] = useState<"close" | "reopen" | null>(null);
  const [dialog, setDialog] = useState<"edit" | "phone" | "caller" | null>(
    null,
  );
  const [done, setDone] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<CustomerDevice | null>(null);
  const { data, error, loading, reload } = useLoad(
    () => customer(customerId),
    [customerId],
  );

  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← {t("All customers")}
        </button>
        <LoadState loading={loading} error={error} empty={false} />
      </section>
    );
  }
  const c = data.customer;
  const v = c.verification;
  const address = [
    c.address.street,
    c.address.city,
    c.address.state,
    c.address.zipCode,
    c.address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section>
      <button className="link" onClick={onBack}>
        ← {t("All customers")}
      </button>
      <PageHeader
        title={c.name || t("Customer")}
        intro={`${c.phone || t("No phone")}${c.role === "agent" ? ` · ${t("Agent")}` : ""}`}
        actions={
          <>
            {can(staff, "verify_callers") && (
              <button onClick={() => setDialog("caller")}>{t("Check caller")}</button>
            )}
            {can(staff, "edit_customers") && (
              <button onClick={() => setDialog("edit")}>{t("Edit details")}</button>
            )}
            {can(staff, "edit_customers") && (
              <button onClick={() => setDialog("phone")}>{t("Change phone")}</button>
            )}
            {can(staff, "manage_tickets") && (
              <button
                onClick={() =>
                  navigate(
                    `/tickets?customer=${encodeURIComponent(c.id)}&name=${encodeURIComponent(c.name)}`,
                  )
                }
              >
                {t("Open a ticket")}
              </button>
            )}
            {can(staff, "manage_tickets") && (
              <button onClick={() => navigate(`/complaints?customer=${encodeURIComponent(c.id)}&name=${encodeURIComponent(c.name)}&new=1`)}>{t("Log a complaint")}</button>
            )}
            {can(staff, "view_tickets") && data.status?.openComplaints?.open ? (
              <button onClick={() => navigate(`/complaints?customer=${encodeURIComponent(c.id)}&name=${encodeURIComponent(c.name)}`)}>{t("Complaints")}</button>
            ) : null}
            {can(staff, "edit_customers") && !c.closed && c.role !== "admin" && (
              <button className="danger" onClick={() => setClosing("close")}>
                {t("Close account")}
              </button>
            )}
            {can(staff, "edit_customers") && c.closed && (
              <button onClick={() => setClosing("reopen")}>{t("Open account again")}</button>
            )}
            {can(staff, "verify_callers") && c.role !== "admin" && !c.closed && !c.sendLock?.on && (
              <button className="danger" onClick={() => setLocking(true)}>
                {t("Lock sending (lost phone)")}
              </button>
            )}
            {can(staff, "place_hold") && c.hold?.scope !== "all" && (
              <button className="danger" onClick={() => setHolding(true)}>
                {t("Put on hold")}
              </button>
            )}
          </>
        }
      />
      <CustomerStatusStrip detail={data} />
      {done && <p className="notice">{t(done)}</p>}
      {data.callerChecks.verifiedUntil ? (
        <p className="notice">
          {data.callerChecks.verifiedBy === staff?._id
            ? t("You checked this caller. Counts until {time}.", { time: when(data.callerChecks.verifiedUntil) })
            : t("Caller checked by {name}, until {time}. Only they can change the phone or email. If you are on the call, check the caller yourself.", { name: data.callerChecks.verifiedByName || t("another staff member"), time: when(data.callerChecks.verifiedUntil) })}
        </p>
      ) : (
        <p className="muted small">
          {t("Caller not checked. Check who you are talking to before sharing details or making changes.")}
        </p>
      )}
      {data.pendingPhoneChange && (
        <p className="notice">
          {t("Phone change to")} <strong>{data.pendingPhoneChange.phone}</strong>{" "}
          {t("asked by {name}", { name: data.pendingPhoneChange.requestedByName || t("staff") })}{" "}
          {when(data.pendingPhoneChange.requestedAt)}:{" "}
          {data.pendingPhoneChange.reason}{" "}
          {can(staff, "edit_customers") &&
            data.pendingPhoneChange.requestedBy !== staff?._id && (
              <button className="link" onClick={() => setDialog("phone")}>
                {t("Review and approve")}
              </button>
            )}{" "}
          <span className="muted"> · </span>
          {can(staff, "edit_customers") && (
            <button
              className="link"
              onClick={async () => {
                await cancelCustomerPhoneChange(c.id).catch(() => undefined);
                setDone("Phone change request cancelled.");
                reload();
              }}
            >
              {t("Cancel it")}
            </button>
          )}
        </p>
      )}
      {c.closed?.kind === "deactivated" && (
        <p className="error">
          {t("Deactivated by the customer in the app {time}.", { time: when(c.closed.at) })} {c.closed.reason}{" "}
          {t("Nobody can find them or send them money, and they're signed out. Their money stays in the wallet. They reactivate it themselves by signing in with their PIN, so there's no need to open it for them.")}
        </p>
      )}
      {c.closed && c.closed.kind !== "deactivated" && (
        <p className="error">
          {t("Closed {time}, {how}.", {
            time: when(c.closed.at),
            how: c.closed.via === "app" ? t("by the customer in the app") : t("by Sunu Pay staff"),
          })}{" "}
          {c.closed.reason}{" "}
          {t("They can't sign in, be found or receive money. Their records are kept as the law requires.")}
        </p>
      )}
      {c.sendLock?.on && (
        <p className="error">
          {t("Sending is locked by the customer ({via}) since {time}. Only they can unlock it, in the app with their PIN.", {
            via: t(c.sendLock.via === "web" ? "website" : c.sendLock.via === "support" ? "support" : "app"),
            time: when(c.sendLock.at ?? null),
          })}
        </p>
      )}
      {c.hold && (
        <p className="error">
          {t("On hold: {scope}.", { scope: t(SCOPE_LABEL[c.hold.scope]) })} {c.hold.reason} ({t("since {time}", { time: when(c.hold.placedAt) })}).{" "}
          {t("Lift it on the Account holds page.")}
        </p>
      )}

      <div className="two-col">
        <div className="card panel">
          <h2>{t("Profile")}</h2>
          <div className="row-start">
            {c.profilePicture ? (
              <img
                className="avatar"
                src={c.profilePicture}
                alt=""
                width={56}
                height={56}
              />
            ) : (
              <div className="avatar empty-avatar" aria-hidden />
            )}
            <p className="muted small">
              {t("The profile picture is only a picture they chose. It does not show who they are.")}
            </p>
          </div>
          <dl className="facts">
            <Fact label="Phone" value={c.phone || "—"} />
            <Fact label="Email" value={c.email || "—"} />
            <Fact label="Address" value={address || "—"} />
            <Fact label="Joined" value={when(c.joinedAt)} />
            <Fact label="Last login" value={when(c.lastLoginAt)} />
            <Fact label="Receives in" value={c.receivingCurrency || "—"} />
          </dl>
        </div>
        <div className="card panel">
          <h2>{t("Verification")}</h2>
          <dl className="facts">
            <Fact
              label="ID check"
              value={
                v.identityVerifiedAt
                  ? t("Passed {time}", { time: when(v.identityVerifiedAt) })
                  : t("Not done")
              }
            />
            <Fact label="Name on the ID" value={v.nameOnId || "—"} />
            <Fact label="ID country" value={v.country || "—"} />
            <Fact
              label="Address check"
              value={
                v.addressVerifiedAt
                  ? t("Passed {time}", { time: when(v.addressVerifiedAt) })
                  : t("Not done")
              }
            />
          </dl>
          <p className="hint">
            {t("The ID photos and selfie stay with the ID check provider. The ID number is not shown here.")}
          </p>
        </div>
      </div>

      <div className="two-col">
        <div className="card panel">
          <h2>{t("Balance and spend")}</h2>
          <dl className="facts">
            {data.wallets.map((w) => (
              <Fact
                key={w.currency}
                label={t("Balance ({currency})", { currency: w.currency })}
                value={money(w.balanceMinor, w.currency)}
              />
            ))}
            {!data.wallets.length && (
              <Fact label="Balance" value={t("No wallet yet")} />
            )}
            {data.spend.map((s) => (
              <Fact
                key={s.currency}
                label={t("Spent ({currency})", { currency: s.currency })}
                value={t("{amount} in {count}", { amount: money(s.amountMinor, s.currency), count: s.count })}
              />
            ))}
            {!data.spend.length && <Fact label="Spent" value={t("Nothing yet")} />}
          </dl>
        </div>
        <div className="card panel">
          <h2>{t("Tickets")}</h2>
          {data.tickets.length ? (
            <ul className="hits">
              {data.tickets.map((tk) => (
                <li key={tk.id}>
                  <button
                    className="hit"
                    onClick={() =>
                      navigate(`/tickets?open=${encodeURIComponent(tk.id)}`)
                    }
                  >
                    <span>
                      #{tk.number} {tk.subject}
                    </span>
                    <span className="muted small">
                      {t(tk.status.replace("_", " "))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("No tickets.")}</p>
          )}
        </div>
      </div>

      <CustomerMessages customerId={customerId} />

      <HigherLimitSection customerId={customerId} />

      <div className="card panel">
        <h2>{t("Transaction history")}</h2>
        {data.transactions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("When")}</th>
                  <th>{t("What")}</th>
                  <th>{t("With")}</th>
                  <th>{t("Amount")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{when(tx.at)}</td>
                    <td>
                      {t(TYPE_LABEL[tx.type] ?? tx.type)}
                      {tx.txRef && <div className="muted small">{tx.txRef}</div>}
                    </td>
                    <td>{tx.otherParty ? personLabel(tx.otherParty) : "—"}</td>
                    <td className="num">
                      {tx.direction === "in" ? "+" : "−"}
                      {money(tx.amountMinor, tx.currency)}
                    </td>
                    <td>{t(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("No transactions yet.")}</p>
        )}
        <p className="hint">
          {t("Showing the latest {n}. To reverse a payment, use Refunds and reversals.", { n: data.transactions.length })}
        </p>
      </div>

      <div className="two-col">
        <div className="card panel">
          <h2>{t("Changes to their details")}</h2>
          {data.edits.length ? (
            <ul className="plain-list">
              {data.edits.map((e, i) => (
                <li key={i} className="small">
                  <strong>{t(FIELD_LABEL[e.field] ?? e.field)}</strong>:{" "}
                  {e.from || t("empty")} → {e.to || t("empty")}
                  <div className="muted">
                    {when(e.at)} ·{" "}
                    {e.requestedBy
                      ? t("asked by {asker}, approved by {approver}", { asker: e.requestedBy, approver: e.by })
                      : e.by}{" "}
                    · {e.reason}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("No changes by staff.")}</p>
          )}
        </div>
        <div className="card panel">
          <h2>{t("Caller checks")}</h2>
          <p className="small">
            {data.callerChecks.questionsSet
              ? t("Security questions set {time}.", { time: when(data.callerChecks.questionsSetAt) })
              : t("No security questions set yet.")}
          </p>
          {data.callerChecks.recent.length ? (
            <ul className="plain-list">
              {data.callerChecks.recent.map((r, i) => (
                <li key={i} className="small">
                  {r.passed ? (
                    <Badge tone="ok">Passed</Badge>
                  ) : (
                    <Badge tone="danger">Failed</Badge>
                  )}{" "}
                  {r.method === "code" ? t("Text code") : t("Questions")} · {r.by} ·{" "}
                  {when(r.at)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("No checks yet.")}</p>
          )}
        </div>
      </div>

      <div className="card panel">
        <h2>{t("Phones used")}</h2>
        {data.devices?.length ? (
          <ul className="plain-list">
            {data.devices.map((d) => (
              <li key={d.device} className="small">
                <strong>{d.masked}</strong>{" "}
                {d.blocked && <Badge tone="danger">Blocked</Badge>}{" "}
                <span className="muted">{t("last used {when}", { when: when(d.lastSeenAt) })}</span>{" "}
                {!d.blocked && can(staff, "add_to_blocklist") && (
                  <button className="link" onClick={() => setBlocking(d)}>
                    {t("Block this phone")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("No phones yet. A phone shows here after the customer signs in with an up-to-date app.")}</p>
        )}
      </div>
      {blocking && (
        <BlockDeviceDialog
          customerId={customerId}
          device={blocking}
          onClose={() => setBlocking(null)}
          onDone={(m) => {
            setBlocking(null);
            setDone(m);
            reload();
          }}
        />
      )}

      <div className="card panel">
        <h2>{t("Who has opened this file")}</h2>
        <ul className="plain-list">
          {data.recentlyOpenedBy.map((o, i) => (
            <li key={i}>
              {o.staff || t("Staff")}{" "}
              <span className="muted small">{when(o.at)}</span>
            </li>
          ))}
        </ul>
        <p className="hint">
          {t("Opening a file is recorded, including yours just now.")}
        </p>
      </div>

      {dialog === "edit" && (
        <EditCustomerDialog
          customer={c}
          onClose={() => setDialog(null)}
          onDone={(m) => {
            setDialog(null);
            setDone(m);
            reload();
          }}
        />
      )}
      {dialog === "phone" && (
        <ChangePhoneDialog
          customer={c}
          pending={data.pendingPhoneChange}
          myId={staff?._id ?? ""}
          onClose={() => setDialog(null)}
          onDone={(m) => {
            setDialog(null);
            setDone(m);
            reload();
          }}
        />
      )}
      {dialog === "caller" && (
        <CallerCheckDialog
          customer={c}
          questionsSet={data.callerChecks.questionsSet}
          onClose={() => {
            setDialog(null);
            reload();
          }}
          onDone={() => undefined}
        />
      )}
      {closing && (
        <CloseAccountDialog
          mode={closing}
          customerId={c.id}
          label={`${c.name} (${c.phone})`}
          onClose={() => setClosing(null)}
          onDone={(message) => {
            setClosing(null);
            setDone(message);
            reload();
          }}
        />
      )}
      {locking && (
        <ConfirmWithPin
          title="Lock sending (lost phone)"
          confirmLabel="Lock sending"
          danger
          needsPin={false}
          onClose={() => setLocking(false)}
          onConfirm={async () => {
            await lockCustomerSending(c.id);
            setLocking(false);
            setDone("Sending is locked and every phone is signed out. Only the customer can unlock it, with their PIN.");
            reload();
          }}
        >
          <p>{t("Only after checking the caller is the customer (security questions work when the phone is lost). Nothing can leave the account and every phone is signed out. Money can still come in.")}</p>
        </ConfirmWithPin>
      )}
      {holding && (
        <PlaceHoldDialog
          customer={{ id: c.id, label: `${c.name} (${c.phone})` }}
          scopes={c.hold ? ["all"] : ["all", "requests"]}
          onClose={() => setHolding(false)}
          onDone={() => {
            setHolding(false);
            setDone("Hold placed. Two people must agree to lift it.");
            reload();
          }}
        />
      )}
    </section>
  );
}

function BlockDeviceDialog({
  customerId,
  device,
  onClose,
  onDone,
}: {
  customerId: string;
  device: CustomerDevice;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const t = useT();
  const [reason, setReason] = useState<BlockReason>("CONFIRMED_FRAUD");
  const [note, setNote] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Block a phone"
      confirmLabel="Block now"
      danger
      canConfirm={okLength(note, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await blockCustomerDevice({ customerId, device: device.device, reason, note: note.trim() }, pin, key);
        onDone("Added. It blocks now for 72 hours. A different staff member must confirm it to keep it.");
      }}
    >
      <p>
        <strong>{device.masked}</strong>
      </p>
      <p>{t("This stops sign-up, sign-in, sending and cash out from this phone, for every account on it. A second-hand phone can carry an old block, so check the customer's story first.")}</p>
      <p className="hint">{t("Reinstalling the app on an iPhone, or resetting an Android phone, gives it a new ID. This stops casual repeat sign-ups, not a determined person.")}</p>
      <label>
        {t("Reason")}
        <select value={reason} onChange={(e) => setReason(e.target.value as BlockReason)}>
          {Object.entries(REASON_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <TextArea label="What happened (staff only)" value={note} onChange={setNote} min={10} max={300} />
    </ConfirmWithPin>
  );
}

function CloseAccountDialog({
  mode,
  customerId,
  label,
  onClose,
  onDone,
}: {
  mode: "close" | "reopen";
  customerId: string;
  label: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const closing = mode === "close";
  return (
    <ConfirmWithPin
      title={closing ? "Close this account" : "Open this account again"}
      confirmLabel={closing ? "Close account" : "Open account again"}
      danger={closing}
      canConfirm={okLength(reason, 3, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        if (closing) {
          await closeCustomerAccount(customerId, reason.trim(), pin);
          onDone("Account closed. The customer has been told.");
        } else {
          await reopenCustomerAccount(customerId, reason.trim(), pin);
          onDone("Account opened again. The customer has been told.");
        }
      }}
    >
      <p>
        <strong>{label}</strong>
      </p>
      {closing ? (
        <p>
          {t(
            "Only when the customer asked for it. The wallet must be empty and nothing in progress. They will be signed out, and won't be able to sign in, be found or receive money. Their records are kept for 5 years, as the law requires.",
          )}
        </p>
      ) : (
        <p>{t("Check the caller first: you must have checked them in the last 30 minutes. They will be able to sign in and use money again.")}</p>
      )}
      <TextArea label="Why" value={reason} onChange={setReason} min={3} max={300} />
    </ConfirmWithPin>
  );
}
