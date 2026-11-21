import { useMemo, useState } from "react";
import { customerMessages, sendCustomerMessage } from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { LoadState, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { newIdempotencyKey } from "../lib/idempotency";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

export const MESSAGE_MAX = 400;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|co|uk|io|app|me|ly|info|biz|xyz|link|site|online|gm|sn)\b)/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LONG_NUMBER = /\d[\d\s-]{6,}\d/;

/** The same checks as the server, so staff see the problem before sending. */
export function messageProblem(text: string): string | null {
  const s = text.trim();
  if (s.length < 10 || s.length > MESSAGE_MAX) return null; // the length counter shows this
  if (EMAIL.test(s)) return "Messages can't contain email addresses.";
  if (LINK.test(s)) return "Messages can't contain links or web addresses. Ask the customer to open the app instead.";
  if (LONG_NUMBER.test(s)) return "Messages can't contain phone, account or card numbers. Ask the customer to call the number in the app.";
  return null;
}

/** Messages staff sent this customer, and (with message_customers) a box to send one. */
export function CustomerMessages({ customerId }: { customerId: string }) {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => customerMessages(customerId), [customerId]);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [lang, setLang] = useState<"en" | "fr">("en");
  const [done, setDone] = useState<string | null>(null);
  const key = useMemo(newIdempotencyKey, [writing]);
  const problem = messageProblem(text);
  const may = can(staff, "message_customers");
  return (
    <div className="card panel">
      <h2>{t("Messages sent to this customer")}</h2>
      <LoadState loading={loading && !data} error={error} empty={false} />
      {done && <p role="status">{t(done)}</p>}
      {data && !data.messages.length && <p className="muted">{t("No messages yet.")}</p>}
      {data?.messages.map((m) => (
        <p key={m.id}>
          <span className="muted small">{t("{when}, by {name}", { when: when(m.at), name: m.by })}</span>
          <br />
          {m.text}
        </p>
      ))}
      {may && <button onClick={() => { setWriting(true); setDone(null); }}>{t("Send a message")}</button>}
      {writing && (
        <ConfirmWithPin
          title="Send a message"
          confirmLabel="Send"
          needsPin={false}
          canConfirm={okLength(text, 10, MESSAGE_MAX) && !problem}
          onClose={() => setWriting(false)}
          onConfirm={async () => {
            await sendCustomerMessage(customerId, { text: text.trim(), lang }, key);
            setWriting(false);
            setText("");
            setDone("Message sent.");
            reload();
          }}
        >
          <p>{t("It goes by text message, and by email if we have one. Links, email addresses and long numbers are not allowed, so nobody can copy our messages to scam customers. Every message ends with a line saying Sunu Pay never asks for PINs or codes.")}</p>
          <label>
            {t("Language of the message")}{" "}
            <select value={lang} onChange={(e) => setLang(e.target.value === "fr" ? "fr" : "en")}>
              <option value="en">{t("English")}</option>
              <option value="fr">{t("French")}</option>
            </select>
          </label>
          <TextArea label="Message" value={text} onChange={setText} min={10} max={MESSAGE_MAX} />
          {problem && <p className="error">{t(problem)}</p>}
        </ConfirmWithPin>
      )}
    </div>
  );
}
