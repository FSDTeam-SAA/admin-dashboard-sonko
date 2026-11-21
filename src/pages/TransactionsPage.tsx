import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { transaction, transactions, type TxFilters, type TxPerson, type TxRow } from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, Pager } from "../components/common";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { TYPE_LABEL } from "./CustomersPage";

export const TX_STATUS_LABEL: Record<string, string> = {
  successful: "Successful",
  failed: "Failed",
  pending: "Pending",
  processing: "Processing",
  needs_review: "Needs checking",
  reversed: "Reversed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};
export const TX_STATUS_TONE: Record<string, "ok" | "danger" | "warn" | "plain"> = { successful: "ok", failed: "danger", pending: "warn", processing: "warn", needs_review: "warn" };
const EMPTY: TxFilters = { type: "", status: "", currency: "", search: "", from: "", to: "" };

function Who({ person }: { person: TxPerson }) {
  const { staff } = useAuth();
  if (!person) return <>—</>;
  const label = [person.name, person.phone].filter(Boolean).join(" · ") || "—";
  return can(staff, "view_customers") ? <Link to={`/customers?open=${person.id}`}>{label}</Link> : <>{label}</>;
}

/** Search every payment. Read only: refunds and reversals stay on their own pages, which need two people. */
export function TransactionsPage() {
  const t = useT();
  const [typed, setTyped] = useState<TxFilters>(EMPTY);
  const [filters, setFilters] = useState<TxFilters>(EMPTY);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => transactions(filters, page), [filters, page]);
  const rows = data?.transactions ?? [];
  const apply = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ ...typed, search: typed.search.trim() });
    setPage(1);
  };
  if (openId) return <TxView txId={openId} onBack={() => setOpenId(null)} />;
  return (
    <section>
      <PageHeader title="Transactions" intro="Every payment, newest first. Search by reference, phone number or name. Read only: refunds and reversals are done on their own pages." />
      <form className="filters" onSubmit={apply}>
        <input aria-label={t("Search")} placeholder={t("Reference, phone or name")} value={typed.search} onChange={(e) => setTyped({ ...typed, search: e.target.value })} />
        <select aria-label={t("Type")} value={typed.type} onChange={(e) => setTyped({ ...typed, type: e.target.value })}>
          <option value="">{t("Any type")}</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {t(v)}
            </option>
          ))}
        </select>
        <select aria-label={t("Status")} value={typed.status} onChange={(e) => setTyped({ ...typed, status: e.target.value })}>
          <option value="">{t("Any status")}</option>
          {Object.entries(TX_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {t(v)}
            </option>
          ))}
        </select>
        <select aria-label={t("Currency")} value={typed.currency} onChange={(e) => setTyped({ ...typed, currency: e.target.value })}>
          <option value="">{t("Any currency")}</option>
          {["GBP", "EUR", "GMD", "XOF"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label>
          {t("From")} <input type="date" value={typed.from} onChange={(e) => setTyped({ ...typed, from: e.target.value })} />
        </label>
        <label>
          {t("To")} <input type="date" value={typed.to} onChange={(e) => setTyped({ ...typed, to: e.target.value })} />
        </label>
        <button className="primary" type="submit">
          {t("Search")}
        </button>
        <button
          type="button"
          onClick={() => {
            setTyped(EMPTY);
            setFilters(EMPTY);
            setPage(1);
          }}
        >
          {t("Clear")}
        </button>
      </form>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{t("When")}</th>
              <th>{t("What")}</th>
              <th>{t("Amount")}</th>
              <th>{t("Status")}</th>
              <th>{t("From")}</th>
              <th>{t("To")}</th>
              <th>{t("Reference")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: TxRow) => (
              <tr key={r.id} className="clickable" onClick={() => setOpenId(r.id)}>
                <td>{when(r.createdAt)}</td>
                <td>{t(TYPE_LABEL[r.type] ?? r.type)}</td>
                <td>{money(r.amountMinor, r.currency)}</td>
                <td>
                  <Badge tone={TX_STATUS_TONE[r.status] ?? "plain"}>{TX_STATUS_LABEL[r.status] ?? r.status}</Badge>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Who person={r.from} />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Who person={r.to} />
                </td>
                <td className="muted small">{r.txRef}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />
    </section>
  );
}

function TxView({ txId, onBack }: { txId: string; onBack: () => void }) {
  const t = useT();
  const { data, error, loading } = useLoad(() => transaction(txId), [txId]);
  return (
    <section>
      <button className="link" onClick={onBack}>
        ← {t("Back to transactions")}
      </button>
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && (
        <>
          <PageHeader title="Payment details" />
          <div className="card panel">
            <dl className="facts">
              <dt>{t("When")}</dt>
              <dd>{when(data.createdAt)}</dd>
              <dt>{t("What")}</dt>
              <dd>{t(TYPE_LABEL[data.type] ?? data.type)}</dd>
              <dt>{t("Amount")}</dt>
              <dd>{money(data.amountMinor, data.currency)}</dd>
              <dt>{t("Status")}</dt>
              <dd>
                <Badge tone={TX_STATUS_TONE[data.status] ?? "plain"}>{TX_STATUS_LABEL[data.status] ?? data.status}</Badge> <span className="muted small">{t("last changed {when}", { when: when(data.updatedAt) })}</span>
              </dd>
              <dt>{t("From")}</dt>
              <dd>
                <Who person={data.from} />
              </dd>
              <dt>{t("To")}</dt>
              <dd>
                <Who person={data.to} />
              </dd>
              <dt>{t("Reference")}</dt>
              <dd>{data.txRef || "—"}</dd>
              <dt>{t("Provider")}</dt>
              <dd>{[data.provider, data.providerReference].filter(Boolean).join(" · ") || "—"}</dd>
              <dt>{t("Countries")}</dt>
              <dd>{[data.senderCountry, data.country].filter(Boolean).join(" → ") || "—"}</dd>
              {data.description && (
                <>
                  <dt>{t("Description")}</dt>
                  <dd>{data.description}</dd>
                </>
              )}
            </dl>
          </div>
          <div className="card panel">
            <h2>{t("How the money moved")}</h2>
            <p className="hint">{t("The ledger lines for this payment. They always add up to zero in each currency: money taken from one place is put somewhere else.")}</p>
            {data.ledger.length ? (
              <table>
                <thead>
                  <tr>
                    <th>{t("Account")}</th>
                    <th>{t("Amount")}</th>
                    <th>{t("When")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((l, i) => (
                    <tr key={i}>
                      <td>{l.account}</td>
                      <td>{money(l.amountMinor, l.currency)}</td>
                      <td>{when(l.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">{t("No ledger lines yet. A pending or failed payment may not have moved any money.")}</p>
            )}
          </div>
          {data.tickets.length > 0 && (
            <div className="card panel">
              <h2>{t("Tickets about this payment")}</h2>
              <ul>
                {data.tickets.map((x) => (
                  <li key={x.id}>
                    <Link to={`/tickets?open=${x.id}`}>#{x.number}</Link> · {x.subject}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
