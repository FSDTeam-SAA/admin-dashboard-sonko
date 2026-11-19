import { useMemo, useState } from "react";
import {
  cancelRefundLimitRaise,
  refundLimits,
  setRefundLimit,
  type RefundLimit,
} from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { okLength, TextArea } from "./common";
import { ConfirmWithPin } from "./ConfirmWithPin";
import { decimalsOf as decimals, money, when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

/** The limit as words; -1 means the first limit is still waiting. */
export function limitLabel(
  row: Pick<RefundLimit, "limitMinor" | "currency">,
): string {
  return row.limitMinor < 0
    ? "Not set: every refund needs two people"
    : `Up to ${money(row.limitMinor, row.currency)} with one person`;
}

/**
 * Refund limits per country. A refund above the limit needs a second staff
 * member. A country with no limit needs two people for every refund.
 * Raising a limit needs two people; lowering it needs one.
 */
export function RefundLimits() {
  const t = useT();
  const { staff } = useAuth();
  const mayChange = can(staff, "manage_rates");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<{
    country: string;
    currency: string;
    amount: string;
  } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error } = useLoad(() => refundLimits(), [reload]);
  const rows = data ?? [];

  return (
    <section className="card" style={{ marginTop: 24, padding: 16 }}>
      <h2>{t("Refund limits")}</h2>
      <p className="muted">
        {t("A refund above a country's limit needs a second staff member to approve it. A country with no limit here needs two people for every refund. Raising a limit needs two people; lowering it needs one.")}
      </p>
      {error && <p className="error">{error}</p>}
      {done && <p className="notice">{t(done)}</p>}
      {rows.length === 0 && !error && (
        <p className="muted">
          {t("No limits set yet, so every refund needs two people.")}
        </p>
      )}
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{t("Country")}</th>
              <th>{t("Limit")}</th>
              <th>{t("Waiting")}</th>
              <th>{t("Last change")}</th>
              {mayChange && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.country}>
                <td>{row.country}</td>
                <td>{row.limitMinor < 0 ? t("Not set: every refund needs two people") : t("Up to {amount} with one person", { amount: money(row.limitMinor, row.currency) })}</td>
                <td className="small">
                  {row.pendingRaise ? (
                    <>
                      {t("{name} asked for {amount}: \"{reason}\"", { name: row.pendingRaise.requestedByName || t("Someone"), amount: money(row.pendingRaise.limitMinor, row.pendingRaise.currency), reason: row.pendingRaise.reason })}{" "}
                      {mayChange && (
                        <>
                          {row.pendingRaise.requestedBy !== staff?._id && (
                            <button
                              className="link"
                              onClick={() =>
                                setEditing({
                                  country: row.country,
                                  currency: row.pendingRaise!.currency,
                                  amount: String(
                                    row.pendingRaise!.limitMinor /
                                      10 **
                                        decimals(row.pendingRaise!.currency),
                                  ),
                                })
                              }
                            >
                              {t("Review and approve")}
                            </button>
                          )}{" "}
                          <button
                            className="link"
                            onClick={async () => {
                              await cancelRefundLimitRaise(row.country);
                              setDone(t("Request cancelled."));
                              setReload((n) => n + 1);
                            }}
                          >
                            {t("Cancel")}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="small">
                  {row.history[0]
                    ? `${row.history[0].by || "—"}, ${when(row.history[0].at)}`
                    : "—"}
                </td>
                {mayChange && (
                  <td>
                    <button
                      onClick={() =>
                        setEditing({
                          country: row.country,
                          currency: row.currency,
                          amount:
                            row.limitMinor < 0
                              ? ""
                              : String(
                                  row.limitMinor / 10 ** decimals(row.currency),
                                ),
                        })
                      }
                    >
                      {t("Change")}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {mayChange && (
        <p>
          <button
            onClick={() =>
              setEditing({ country: "", currency: "", amount: "" })
            }
          >
            {t("Add a country")}
          </button>
        </p>
      )}
      {editing && (
        <LimitDialog
          start={editing}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            setDone(message);
            setReload((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}


function LimitDialog({
  start,
  onClose,
  onDone,
}: {
  start: { country: string; currency: string; amount: string };
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const t = useT();
  const [country, setCountry] = useState(start.country);
  const [currency, setCurrency] = useState(start.currency);
  const [amount, setAmount] = useState(start.amount);
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const value = Number(amount);
  const ok =
    /^[A-Z]{2}$/.test(country) &&
    /^[A-Z]{3}$/.test(currency) &&
    amount.trim() !== "" &&
    Number.isFinite(value) &&
    value >= 0 &&
    okLength(reason, 5, 300);
  return (
    <ConfirmWithPin
      title={
        start.country
          ? `Refund limit for ${start.country}`
          : "Add a refund limit"
      }
      confirmLabel="Save"
      canConfirm={ok}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await setRefundLimit(
          country,
          { amount: value, currency, reason: reason.trim(), pin },
          key,
        );
        onDone(
          result.asked
            ? t("Asked. A higher limit needs a different staff member to approve it.")
            : t("Saved."),
        );
      }}
    >
      <label>
        {t("Country (two letters, for example GM)")}
        <input
          value={country}
          maxLength={2}
          disabled={Boolean(start.country)}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
        />
      </label>
      <label>
        {t("Currency refunds are paid in (for example GMD)")}
        <input
          value={currency}
          maxLength={3}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
        />
      </label>
      <label>
        {t("One person can refund up to")}
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <TextArea
        label="Why"
        value={reason}
        onChange={setReason}
        min={5}
        max={300}
      />
      <p className="hint">
        {t("Anything above this amount needs a second staff member. To approve someone else's request, enter the same amount.")}
      </p>
    </ConfirmWithPin>
  );
}
