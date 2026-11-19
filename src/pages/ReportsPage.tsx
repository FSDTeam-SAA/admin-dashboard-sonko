import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { reportedRequests, type ReportedRequest } from "../api/admin";
import { Badge, LoadState, PageHeader, Pager } from "../components/common";
import { AskReversalDialog, PlaceHoldDialog, SCOPE_LABEL } from "../components/dialogs";
import { moneyMajor, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

const STATUS_LABEL: Record<string, string> = {
  pending: "Not paid",
  paying: "Being paid",
  paid: "Paid",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

type Open = { action: "hold" | "refund"; row: ReportedRequest } | null;

const who = (p: { name?: string; username?: string; phone?: string } | null) =>
  personLabel(p ? { name: p.name || p.username, phone: p.phone } : null);

export function ReportsPage() {
  const t = useT();
  const { staff } = useAuth();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Open>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => reportedRequests(page), [page]);
  const rows = data?.requests ?? [];

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader title="Reported requests" intro="Payment requests a customer reported, newest first." />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>{t("Reported")}</th>
                <th>{t("Asked by")}</th>
                <th>{t("Reported by (payer)")}</th>
                <th>{t("Amount")}</th>
                <th>{t("Status")}</th>
                <th>{t("Why")}</th>
                <th aria-label={t("Actions")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hold = row.requester?.accountHold;
                const canHold = can(staff, "place_hold") && row.requester && !(hold?.active && hold.scope === "all");
                const canRefund = can(staff, "request_reversal") && row.status === "paid" && !row.refundedAt;
                return (
                  <tr key={row._id}>
                    <td>{when(row.reportedAt)}</td>
                    <td>
                      {who(row.requester)}
                      {hold?.active && hold.scope && (
                        <div>
                          <Badge tone="danger">{SCOPE_LABEL[hold.scope]}</Badge>
                        </div>
                      )}
                    </td>
                    <td>{who(row.payer)}</td>
                    <td className="num">{moneyMajor(row.amount, row.currency)}</td>
                    <td>
                      {row.refundedAt ? <Badge tone="ok">{t("Refunded")}</Badge> : <Badge tone={row.status === "paid" ? "warn" : "plain"}>{STATUS_LABEL[row.status] || row.status}</Badge>}
                    </td>
                    <td className="wrap">{row.reportReason || "—"}</td>
                    <td className="actions">
                      {canHold && (
                        <button onClick={() => setOpen({ action: "hold", row })}>{hold?.active ? t("Make full hold") : t("Put on hold")}</button>
                      )}
                      {canRefund && <button onClick={() => setOpen({ action: "refund", row })}>{t("Refund payer")}</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />

      {open?.action === "hold" && open.row.requester && (
        <PlaceHoldDialog
          customer={{ id: open.row.requester._id, label: who(open.row.requester) }}
          scopes={open.row.requester.accountHold?.active ? ["all"] : ["requests", "all"]}
          paymentRequestId={open.row._id}
          onClose={() => setOpen(null)}
          onDone={() => finish("Hold placed.")}
        />
      )}
      {open?.action === "refund" && (
        <AskReversalDialog
          kind="payment_request"
          targetId={open.row._id}
          title="Refund the payer"
          summary={t("Give {amount} back to {payer}, taken from {requester}.", { amount: moneyMajor(open.row.amount, open.row.currency), payer: who(open.row.payer), requester: who(open.row.requester) })}
          onClose={() => setOpen(null)}
          onDone={() => finish("Refund asked for. A different staff member must approve it on the Refunds and reversals page.")}
        />
      )}
    </section>
  );
}
