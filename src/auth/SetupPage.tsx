import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { LanguagePicker } from "../components/LanguagePicker";
import { useT } from "../i18n/language";
import { Logo } from "../components/Logo";

/** The invite id from "?invite=" and the one-time code from after "#" (never sent to a server in the address). */
export function readSetupLink(search: string, hash: string): { invite: string; code: string } {
  const invite = new URLSearchParams(search).get("invite") ?? "";
  let code = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    code = decodeURIComponent(code);
  } catch {
    code = "";
  }
  return { invite, code };
}

/** Same rule as the server's first check: 6 digits. The server also refuses easy PINs. */
export const pinShapeOk = (pin: string) => /^\d{6}$/.test(pin);

/**
 * A new employee opens their one-time link and chooses their PIN. No login.
 * The code is removed from the address bar straight away, so it isn't left
 * in the browser history.
 */
export function SetupPage() {
  const t = useT();
  const [link] = useState(() => readSetupLink(window.location.search, window.location.hash));
  const [firstName, setFirstName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, "", "/setup");
    if (!link.invite || !link.code) {
      setError("This link is not valid. Ask your manager to send a new one.");
      return;
    }
    api<{ firstName: string }>("/auth/staff-invite/check", { method: "POST", body: { invite: link.invite, code: link.code }, noAuth: true })
      .then((d) => setFirstName(d.firstName))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "This link is not valid. Ask your manager to send a new one."));
  }, [link]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !pinShapeOk(pin) || pin !== again) return;
    setBusy(true);
    setError(null);
    try {
      await api("/auth/staff-invite/accept", { method: "POST", body: { invite: link.invite, code: link.code, pin }, noAuth: true });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="card login-card">
        <Logo className="login-logo" width={220} />
        <h1>{t("Set up your staff login")}</h1>
        <LanguagePicker />
        {error && <p className="error">{t(error)}</p>}
        {done ? (
          <>
            <p className="notice">{t("Your staff account is ready. Log in with your phone number and new PIN, then set up the authenticator app.")}</p>
            <a className="button primary" href="/">
              {t("Go to log in")}
            </a>
          </>
        ) : (
          firstName && (
            <form className="stack" onSubmit={submit}>
              <p>{t("Hello {name}. Choose a 6-digit PIN. Don't use your birthday or simple numbers like 123456, and never tell anyone your PIN.", { name: firstName })}</p>
              <label>
                {t("New PIN")}
                <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
              </label>
              <label>
                {t("Type it again")}
                <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={again} onChange={(e) => setAgain(e.target.value.replace(/\D/g, ""))} />
              </label>
              {again.length === 6 && pin !== again && <p className="error">{t("The two PINs are different.")}</p>}
              <button className="primary" type="submit" disabled={busy || !pinShapeOk(pin) || pin !== again}>
                {busy ? t("Saving…") : t("Save my PIN")}
              </button>
            </form>
          )
        )}
      </div>
    </main>
  );
}
