import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  cancelCustomerPhoneChange,
  customer,
  customers,
  type CustomerFilter,
  type CustomerRow,
} from "../api/admin";
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
} from "../components/common";
import { PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
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

export function CustomersPage() {
  const t = useT();
  const [filter, setFilter] = useState<CustomerFilter | "all">("all");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
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
                <th>{t("ID check")}</th>
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
                  </td>
                  <td>{row.phone || "—"}</td>
                  <td>
                    {row.idChecked ? (
                      <Badge tone="ok">Checked</Badge>
                    ) : (
                      <Badge tone="warn">Not checked</Badge>
                    )}
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
  const [dialog, setDialog] = useState<"edit" | "phone" | "caller" | null>(
    null,
  );
  const [done, setDone] = useState<string | null>(null);
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
            {can(staff, "place_hold") && c.hold?.scope !== "all" && (
              <button className="danger" onClick={() => setHolding(true)}>
                {t("Put on hold")}
              </button>
            )}
          </>
        }
      />
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
