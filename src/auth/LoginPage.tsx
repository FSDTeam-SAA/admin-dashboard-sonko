import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { useAuth } from "./AuthContext";
import { ApiError } from "../api/client";
import { finishLogin, startLogin, startSetup, type LoggedIn, type Staff } from "../api/staff";
import { LanguagePicker } from "../components/LanguagePicker";
import { translate, getLanguage, useT } from "../i18n/language";

const ENDED: Record<string, string> = {
  idle: "You were logged out after 15 minutes without activity.",
  expired: "Your session has ended. Please log in again.",
};

const TICKET_EXPIRED = "This sign-in has expired. Please enter your PIN again.";
const FEW_CODES_LEFT = 3;

type Step =
  | { name: "pin" }
  | { name: "setup"; ticket: string }
  | { name: "code"; ticket: string }
  | { name: "recovery"; staff: Staff; codes: string[] };

const messageOf = (caught: unknown) =>
  caught instanceof Error && caught.message ? caught.message : translate("Could not log in. Please try again.", getLanguage());

const isTicketExpired = (caught: unknown) => caught instanceof ApiError && caught.message === TICKET_EXPIRED;

export function LoginPage() {
  const { enter, endedBecause } = useAuth();
  const t = useT();
  const [step, setStep] = useState<Step>({ name: "pin" });
  const [error, setError] = useState<string | null>(null);

  const backToPin = (message: string) => {
    setStep({ name: "pin" });
    setError(message);
  };

  const loggedIn = (result: LoggedIn) => {
    if (result.recoveryCodes?.length) {
      setError(null);
      setStep({ name: "recovery", staff: result.staff, codes: result.recoveryCodes });
      return;
    }
    const left = result.recoveryCodesLeft;
    const note =
      left !== undefined && left <= FEW_CODES_LEFT
        ? translate(left === 1 ? "You have 1 recovery code left. Ask another staff member to reset your authenticator app to get new ones." : "You have {n} recovery codes left. Ask another staff member to reset your authenticator app to get new ones.", getLanguage(), { n: left })
        : undefined;
    enter(result.staff, note);
  };

  return (
    <main className="login">
      <div className="card login-card">
        <img className="login-mark" src="/sp-mark.png" alt="" width={64} height={32} />
        <h1>Sunu Pay Admin</h1>
        <LanguagePicker />
        {step.name === "pin" && endedBecause && ENDED[endedBecause] && !error && <p className="notice">{t(ENDED[endedBecause])}</p>}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {step.name === "pin" && (
          <PinStep
            onError={setError}
            onDone={(next) => {
              setError(null);
              setStep(next.enrolled ? { name: "code", ticket: next.ticket } : { name: "setup", ticket: next.ticket });
            }}
          />
        )}
        {step.name === "setup" && (
          <SetupStep ticket={step.ticket} onError={setError} onExpired={backToPin} onDone={loggedIn} />
        )}
        {step.name === "code" && (
          <CodeStep ticket={step.ticket} onError={setError} onExpired={backToPin} onDone={loggedIn} />
        )}
        {step.name === "recovery" && <RecoveryCodes codes={step.codes} onDone={() => enter(step.staff)} />}
      </div>
    </main>
  );
}

function PinStep({ onDone, onError }: { onDone: (next: { ticket: string; enrolled: boolean }) => void; onError: (m: string) => void }) {
  const t = useT();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const pinOk = /^\d{4,8}$/.test(pin);
  const phoneOk = /^\+?\d{7,15}$/.test(phone.replace(/\s+/g, ""));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!phoneOk || !pinOk || busy) return;
    setBusy(true);
    try {
      onDone(await startLogin(phone, pin));
    } catch (caught) {
      onError(messageOf(caught));
    } finally {
      // The PIN is never kept on screen after a try.
      setPin("");
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <p className="muted">{t("For Sunu Pay staff only.")}</p>
      <label>
        {t("Phone number")}
        <input type="tel" inputMode="tel" autoComplete="username" placeholder="+220 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <span className="hint">{t("Include the country code, for example +220 or +44.")}</span>
      <label>
        {t("PIN")}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
      </label>
      <button className="primary" type="submit" disabled={!phoneOk || !pinOk || busy}>
        {busy ? t("Checking…") : t("Next")}
      </button>
    </form>
  );
}

type CodeProps = {
  ticket: string;
  onDone: (result: LoggedIn) => void;
  onError: (message: string) => void;
  onExpired: (message: string) => void;
};

function useCodeSubmit({ ticket, onDone, onError, onExpired }: CodeProps) {
  const [busy, setBusy] = useState(false);
  async function send(answer: { code: string } | { recoveryCode: string }, clear: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      onDone(await finishLogin(ticket, answer));
    } catch (caught) {
      if (isTicketExpired(caught)) onExpired(TICKET_EXPIRED);
      else onError(messageOf(caught));
    } finally {
      clear();
      setBusy(false);
    }
  }
  return { busy, send };
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <label>
      {t("6-digit code")}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        autoFocus
      />
    </label>
  );
}

function SetupStep(props: CodeProps) {
  const { ticket, onError, onExpired } = props;
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const { busy, send } = useCodeSubmit(props);
  const t = useT();

  useEffect(() => {
    let live = true;
    startSetup(ticket)
      .then(async ({ secret, otpauthUrl }) => {
        // Made here in the browser, so the secret is never sent to anyone else.
        const qr = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 200, errorCorrectionLevel: "M" });
        if (live) setSetup({ secret, qr });
      })
      .catch((caught) => {
        if (!live) return;
        if (isTicketExpired(caught)) onExpired(TICKET_EXPIRED);
        else onError(messageOf(caught));
      });
    return () => {
      live = false;
    };
  }, [ticket]);

  if (!setup) return <p className="muted">{t("Getting your set-up code…")}</p>;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d{6}$/.test(code)) void send({ code }, () => setCode(""));
      }}
    >
      <h2>{t("Set up your authenticator app")}</h2>
      <ol className="steps">
        <li>{t("Install Google Authenticator or Microsoft Authenticator on your phone.")}</li>
        <li>{t("In the app, add an account and scan this code.")}</li>
        <li>{t("Type the 6-digit code the app shows.")}</li>
      </ol>
      <img className="qr" src={setup.qr} alt={t("QR code for your authenticator app")} width={200} height={200} />
      <details>
        <summary>{t("Can't scan? Type this key instead")}</summary>
        <code className="key">{setup.secret.match(/.{1,4}/g)?.join(" ")}</code>
      </details>
      <CodeInput value={code} onChange={setCode} />
      <button className="primary" type="submit" disabled={busy || !/^\d{6}$/.test(code)}>
        {busy ? t("Checking…") : t("Finish setting up")}
      </button>
    </form>
  );
}

function CodeStep(props: CodeProps) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const { busy, send } = useCodeSubmit(props);
  const t = useT();
  const recoveryOk = recovery.replace(/[^A-Za-z0-9]/g, "").length === 10;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (useRecovery ? recoveryOk : /^\d{6}$/.test(code)) {
          void send(useRecovery ? { recoveryCode: recovery } : { code }, () => {
            setCode("");
            setRecovery("");
          });
        }
      }}
    >
      {useRecovery ? (
        <>
          <p className="muted">{t("Type one of the recovery codes you saved. Each one works once.")}</p>
          <label>
            {t("Recovery code")}
            <input type="text" autoComplete="off" maxLength={11} value={recovery} onChange={(e) => setRecovery(e.target.value.toUpperCase())} autoFocus />
          </label>
        </>
      ) : (
        <>
          <p className="muted">{t("Open your authenticator app and type the code for Sunu Pay Admin.")}</p>
          <CodeInput value={code} onChange={setCode} />
        </>
      )}
      <button className="primary" type="submit" disabled={busy || (useRecovery ? !recoveryOk : !/^\d{6}$/.test(code))}>
        {busy ? t("Checking…") : t("Log in")}
      </button>
      <button type="button" className="link" onClick={() => setUseRecovery(!useRecovery)}>
        {useRecovery ? t("Use the code from my app") : t("Lost your phone? Use a recovery code")}
      </button>
    </form>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<ReactNode>(null);
  const t = useT();
  return (
    <div className="stack">
      <h2>{t("Save your recovery codes")}</h2>
      <p className="muted">
        {t("If you lose your phone, each of these codes lets you log in once. Write them down or keep them in a password manager. You will not see them again.")}
      </p>
      <ul className="codes">
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText(codes.join("\n"))
            .then(() => setCopied(t("Copied.")))
            .catch(() => setCopied(t("Could not copy. Please write them down.")));
        }}
      >
        {t("Copy codes")}
      </button>
      {copied && <span className="hint">{copied}</span>}
      <label className="check">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        {t("I have saved these codes somewhere safe")}
      </label>
      <button className="primary" type="button" disabled={!saved} onClick={onDone}>
        {t("Continue")}
      </button>
    </div>
  );
}
