import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { customer, customers, type CustomerFilter, type CustomerRow } from "../api/admin";
import { Badge, LoadState, PageHeader, Pager, Tabs } from "../components/common";
import { PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";

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

export function CustomersPage() {
  const [filter, setFilter] = useState<CustomerFilter | "all">("all");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => customers(filter, search, page), [filter, search, page]);
  const rows = data?.customers ?? [];

  if (openId) return <CustomerView customerId={openId} onBack={() => setOpenId(null)} />;

  const find = (event: FormEvent) => {
    event.preventDefault();
    setSearch(typed);
    setPage(1);
  };

  return (
    <section>
      <PageHeader title="Customers" intro="Find a customer and open their file. Every time a file is opened, your name is saved against it." />
      <Tabs
        value={filter}
        options={[
          ["all", "All"],
          ["verified", "ID checked"],
          ["unverified", "ID not checked"],
          ["held", "On hold"],
        ] as const}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
      />
      <form className="row-start search" onSubmit={find}>
        <input placeholder="Name, phone or email" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit">Search</button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTyped("");
            }}
          >
            Clear
          </button>
        )}
      </form>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>ID check</th>
                <th>Last login</th>
                <th>Joined</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row: CustomerRow) => (
                <tr key={row.id} className="clickable" onClick={() => setOpenId(row.id)}>
                  <td>
                    <strong>{row.name || "—"}</strong>
                    {row.role === "agent" && <div className="muted small">Agent</div>}
                    {row.onHold && (
                      <div>
                        <Badge tone="danger">On hold</Badge>
                      </div>
                    )}
                  </td>
                  <td>{row.phone || "—"}</td>
                  <td>{row.idChecked ? <Badge tone="ok">Checked</Badge> : <Badge tone="warn">Not checked</Badge>}</td>
                  <td>{when(row.lastLoginAt)}</td>
                  <td>{when(row.joinedAt)}</td>
                  <td className="actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(row.id);
                      }}
                    >
                      Open
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
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function CustomerView({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const { staff } = useAuth();
  const navigate = useNavigate();
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => customer(customerId), [customerId]);

  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← All customers
        </button>
        <LoadState loading={loading} error={error} empty={false} />
      </section>
    );
  }
  const c = data.customer;
  const v = c.verification;
  const address = [c.address.street, c.address.city, c.address.state, c.address.zipCode, c.address.country].filter(Boolean).join(", ");

  return (
    <section>
      <button className="link" onClick={onBack}>
        ← All customers
      </button>
      <PageHeader
        title={c.name || "Customer"}
        intro={`${c.phone || "No phone"}${c.role === "agent" ? " · Agent" : ""}`}
        actions={
          <>
            {can(staff, "manage_tickets") && <button onClick={() => navigate(`/tickets?customer=${encodeURIComponent(c.id)}&name=${encodeURIComponent(c.name)}`)}>Open a ticket</button>}
            {can(staff, "place_hold") && c.hold?.scope !== "all" && (
              <button className="danger" onClick={() => setHolding(true)}>
                Put on hold
              </button>
            )}
          </>
        }
      />
      {done && <p className="notice">{done}</p>}
      {c.hold && (
        <p className="error">
          On hold: {SCOPE_LABEL[c.hold.scope]}. {c.hold.reason} (since {when(c.hold.placedAt)}). Lift it on the Account holds page.
        </p>
      )}

      <div className="two-col">
        <div className="card panel">
          <h2>Profile</h2>
          <div className="row-start">
            {c.profilePicture ? <img className="avatar" src={c.profilePicture} alt="" width={56} height={56} /> : <div className="avatar empty-avatar" aria-hidden />}
            <p className="muted small">The profile picture is only a picture they chose. It does not show who they are.</p>
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
          <h2>Verification</h2>
          <dl className="facts">
            <Fact label="ID check" value={v.identityVerifiedAt ? `Passed ${when(v.identityVerifiedAt)}` : "Not done"} />
            <Fact label="Name on the ID" value={v.nameOnId || "—"} />
            <Fact label="ID country" value={v.country || "—"} />
            <Fact label="Address check" value={v.addressVerifiedAt ? `Passed ${when(v.addressVerifiedAt)}` : "Not done"} />
          </dl>
          <p className="hint">The ID photos and selfie stay with the ID check provider. The ID number is not shown here.</p>
        </div>
      </div>

      <div className="two-col">
        <div className="card panel">
          <h2>Balance and spend</h2>
          <dl className="facts">
            {data.wallets.map((w) => (
              <Fact key={w.currency} label={`Balance (${w.currency})`} value={money(w.balanceMinor, w.currency)} />
            ))}
            {!data.wallets.length && <Fact label="Balance" value="No wallet yet" />}
            {data.spend.map((s) => (
              <Fact key={s.currency} label={`Spent (${s.currency})`} value={`${money(s.amountMinor, s.currency)} in ${s.count}`} />
            ))}
            {!data.spend.length && <Fact label="Spent" value="Nothing yet" />}
          </dl>
        </div>
        <div className="card panel">
          <h2>Tickets</h2>
          {data.tickets.length ? (
            <ul className="hits">
              {data.tickets.map((t) => (
                <li key={t.id}>
                  <button className="hit" onClick={() => navigate(`/tickets?open=${encodeURIComponent(t.id)}`)}>
                    <span>
                      #{t.number} {t.subject}
                    </span>
                    <span className="muted small">{t.status.replace("_", " ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No tickets.</p>
          )}
        </div>
      </div>

      <div className="card panel">
        <h2>Transaction history</h2>
        {data.transactions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>What</th>
                  <th>With</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{when(t.at)}</td>
                    <td>
                      {TYPE_LABEL[t.type] ?? t.type}
                      {t.txRef && <div className="muted small">{t.txRef}</div>}
                    </td>
                    <td>{t.otherParty ? personLabel(t.otherParty) : "—"}</td>
                    <td className="num">
                      {t.direction === "in" ? "+" : "−"}
                      {money(t.amountMinor, t.currency)}
                    </td>
                    <td>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No transactions yet.</p>
        )}
        <p className="hint">Showing the latest {data.transactions.length}. To reverse a payment, use Refunds and reversals.</p>
      </div>

      <div className="card panel">
        <h2>Who has opened this file</h2>
        <ul className="plain-list">
          {data.recentlyOpenedBy.map((o, i) => (
            <li key={i}>
              {o.staff || "Staff"} <span className="muted small">{when(o.at)}</span>
            </li>
          ))}
        </ul>
        <p className="hint">Opening a file is recorded, including yours just now.</p>
      </div>

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
