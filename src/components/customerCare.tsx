import { useEffect, useState, type FormEvent } from "react";
import {
  askCallerQuestions,
  changeCustomerPhone,
  checkCallerAnswers,
  checkCallerCode,
  editCustomer,
  sendCallerCode,
  type CustomerDetail,
  type SecurityQuestion,
} from "../api/admin";
import { ConfirmWithPin } from "./ConfirmWithPin";
import { TextArea, okLength } from "./common";
import { useT } from "../i18n/language";

type Customer = CustomerDetail["customer"];

/** Name, email and address. One person, with their PIN and a reason. */
export function EditCustomerDialog({ customer, onClose, onDone }: { customer: Customer; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [address, setAddress] = useState({
    street: customer.address.street ?? "",
    city: customer.address.city ?? "",
    state: customer.address.state ?? "",
    zipCode: customer.address.zipCode ?? "",
    country: customer.address.country ?? "",
  });
  const [reason, setReason] = useState("");
  const body = {
    ...(name.trim() !== customer.name ? { name: name.trim() } : {}),
    ...(email.trim().toLowerCase() !== customer.email ? { email: email.trim() } : {}),
  } as { name?: string; email?: string; address?: typeof address };
  const changedAddress = Object.fromEntries(Object.entries(address).filter(([k, v]) => v.trim() !== ((customer.address as Record<string, string | undefined>)[k] ?? "")));
  if (Object.keys(changedAddress).length) body.address = changedAddress as typeof address;
  const anything = Object.keys(body).length > 0;
  const line = (key: keyof typeof address, label: string, max = 100) => (
    <label>
      {t(label)}
      <input value={address[key]} maxLength={max} onChange={(e) => setAddress({ ...address, [key]: key === "country" ? e.target.value.toUpperCase() : e.target.value })} />
    </label>
  );

  return (
    <ConfirmWithPin
      title={t("Edit {name}", { name: customer.name || t("customer") })}
      confirmLabel="Save changes"
      canConfirm={anything && okLength(reason, 5, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await editCustomer(customer.id, { ...body, reason: reason.trim(), pin });
        onDone(result.changed.length === 1 ? t("Saved 1 change.") : t("Saved {n} changes.", { n: result.changed.length }));
      }}
    >
      <label>
        {t("Name")}
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </label>
      {customer.verification.nameOnId && <p className="hint">{t("The name on their ID ({name}) doesn't change here. Only a new ID check changes it.", { name: customer.verification.nameOnId })}</p>}
      <label>
        {t("Email")}
        <input type="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <div className="form-grid">
        {line("street", "Street")}
        {line("city", "Town or city")}
        {line("state", "Region")}
        {line("zipCode", "Postcode")}
        {line("country", "Country code (GM, SN, GB)", 2)}
      </div>
      <p className="hint">{t("Changing the email needs you to have checked the caller in the last 30 minutes. The customer is told at their old email and phone.")}</p>
      <p className="hint">{t("To change the phone number, use Change phone. It needs a second person.")}</p>
      <TextArea label="Reason (kept with the change)" value={reason} onChange={setReason} min={5} max={300} />
    </ConfirmWithPin>
  );
}

/** Phone number. Two people: the first asks, a different one approves. */
export function ChangePhoneDialog({
  customer,
  pending,
  myId,
  onClose,
  onDone,
}: {
  customer: Customer;
  pending: CustomerDetail["pendingPhoneChange"];
  myId: string;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const t = useT();
  const approving = Boolean(pending && pending.requestedBy !== myId);
  const [phone, setPhone] = useState(approving ? pending!.phone : "");
  const [reason, setReason] = useState(approving ? pending!.reason : "");
  const looksOk = /^\+\d{8,15}$/.test(phone.replace(/[\s-]/g, ""));
  return (
    <ConfirmWithPin
      title={approving ? "Approve the new phone number" : "Change phone number"}
      confirmLabel={approving ? "Approve and change" : "Ask a second person"}
      danger
      canConfirm={looksOk && okLength(reason, 5, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await changeCustomerPhone(customer.id, { phone: phone.replace(/[\s-]/g, ""), reason: reason.trim(), pin });
        onDone(result.asked ? t("Asked. A different staff member must approve the new number on this customer's file.") : t("Phone number changed. The customer is signed out on every phone and logs in with the new number."));
      }}
    >
      <p>
        {t("Now:")} <strong>{customer.phone || t("none")}</strong>. {t("The phone number is how the customer logs in and gets codes. Changing it is the usual way accounts are stolen, so check who you are talking to first.")}
      </p>
      {approving ? (
        <p className="notice">
          {t("{name} asked to change it to", { name: pending!.requestedByName || t("A staff member") })} <strong>{pending!.phone}</strong>: {pending!.reason}
        </p>
      ) : (
        <>
          {pending && <p className="notice">{t("You already asked for {phone}. A different staff member must approve it.", { phone: pending.phone })}</p>}
          <label>
            {t("New number, with country code")}
            <input value={phone} inputMode="tel" maxLength={20} placeholder="+220…" onChange={(e) => setPhone(e.target.value)} />
          </label>
          <TextArea label="Reason, and how you checked who they are" value={reason} onChange={setReason} min={5} max={300} />
        </>
      )}
      <p className="hint">
        {t("To ask, you must have checked the caller in the last 30 minutes. Once changed, the customer is signed out on every phone, the old number and email are told, and no money can leave the account for 72 hours.")}
      </p>
    </ConfirmWithPin>
  );
}

type Mode = "code" | "questions";

/** Checks the caller is the customer. Text code first; questions as backup. */
export function CallerCheckDialog({ customer, questionsSet, onClose, onDone }: { customer: Customer; questionsSet: boolean; onClose: () => void; onDone: (passed: boolean) => void }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("code");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [check, setCheck] = useState<{ checkId: string; questions: SecurityQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<boolean | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("That did not work. Please try again."));
    } finally {
      setBusy(false);
    }
  };
  const finish = (passed: boolean) => {
    setResult(passed);
    onDone(passed);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "code" && sentTo) run(async () => finish((await checkCallerCode(customer.id, code)).passed));
    if (mode === "questions" && check) run(async () => finish((await checkCallerAnswers(customer.id, check.checkId, answers)).passed));
  };

  return (
    <div className="overlay" role="presentation">
      <form className="card dialog" role="dialog" aria-modal="true" aria-labelledby="caller-title" onSubmit={submit}>
        <h2 id="caller-title">{t("Check the caller is {name}", { name: customer.name || t("the customer") })}</h2>
        {result !== null ? (
          <p className={result ? "notice" : "error"} role="status">
            {result
              ? t("Passed. This caller is the customer.")
              : t("Not passed. Don't share account details or make changes. You can try the other check, or ask them to use the app.")}
          </p>
        ) : (
          <div className="dialog-body stack">
            <div className="row-start">
              <label className="check">
                <input type="radio" name="mode" checked={mode === "code"} onChange={() => setMode("code")} /> {t("Text code (best)")}
              </label>
              <label className="check">
                <input type="radio" name="mode" checked={mode === "questions"} disabled={!questionsSet} onChange={() => setMode("questions")} /> {t("Security questions")}
              </label>
            </div>
            {!questionsSet && <p className="hint">{t("This customer hasn't set security questions in the app yet.")}</p>}
            {mode === "code" &&
              (sentTo ? (
                <>
                  <p>{t("Code sent to {phone}. Ask the caller to read it out.", { phone: sentTo })}</p>
                  <label>
                    {t("Code")}
                    <input inputMode="numeric" autoComplete="off" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                  </label>
                </>
              ) : (
                <>
                  <p>{t("A code is texted to the customer's own phone. You never see it: the caller reads it to you.")}</p>
                  <button type="button" className="primary" disabled={busy} onClick={() => run(async () => setSentTo((await sendCallerCode(customer.id)).sentTo))}>
                    {t("Send code")}
                  </button>
                </>
              ))}
            {mode === "questions" &&
              (check ? (
                <>
                  <p className="hint">{t("Ask each question. Type what the caller says. You'll only be told if all three are right.")}</p>
                  {check.questions.map((q) => (
                    <label key={q.id}>
                      {t.language === "fr" ? q.fr : q.en}
                      <span className="muted small">{t.language === "fr" ? q.en : q.fr}</span>
                      <input autoComplete="off" maxLength={100} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                    </label>
                  ))}
                </>
              ) : (
                <button type="button" className="primary" disabled={busy || !questionsSet} onClick={() => run(async () => setCheck(await askCallerQuestions(customer.id)))}>
                  {t("Pick 3 questions")}
                </button>
              ))}
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="row-end">
          <button type="button" onClick={onClose} disabled={busy}>
            {result !== null ? t("Close") : t("Cancel")}
          </button>
          {result === null && ((mode === "code" && sentTo) || (mode === "questions" && check)) && (
            <button className="primary" type="submit" disabled={busy || (mode === "code" ? code.length < 4 : check!.questions.some((q) => !(answers[q.id] ?? "").trim()))}>
              {busy ? t("Checking…") : t("Check")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
