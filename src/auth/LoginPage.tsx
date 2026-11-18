import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

const ENDED: Record<string, string> = {
  idle: "You were logged out after 15 minutes without activity.",
  expired: "Your session has ended. Please log in again.",
};

export function LoginPage() {
  const { login, endedBecause } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinOk = /^\d{4,8}$/.test(pin);
  const phoneOk = /^\+?\d{7,15}$/.test(phone.replace(/\s+/g, ""));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!phoneOk || !pinOk || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(phone, pin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not log in. Please try again.");
    } finally {
      // The PIN is never kept on screen after a try.
      setPin("");
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit} noValidate>
        <img className="login-mark" src="/sp-mark.png" alt="" width={64} height={32} />
        <h1>Sunu Pay Admin</h1>
        <p className="muted">For Sunu Pay staff only.</p>
        {endedBecause && ENDED[endedBecause] && !error && <p className="notice">{ENDED[endedBecause]}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Phone number
          <input
            type="tel"
            inputMode="tel"
            autoComplete="username"
            placeholder="+220 …"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </label>
        <span className="hint">Include the country code, for example +220 or +44.</span>
        <label>
          PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={8}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            required
          />
        </label>
        <button className="primary" type="submit" disabled={!phoneOk || !pinOk || busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
