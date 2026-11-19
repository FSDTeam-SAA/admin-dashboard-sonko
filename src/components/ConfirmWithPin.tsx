import { useT } from "../i18n/language";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type Props = {
  title: string;
  /** What will happen, in plain words, plus any fields the action needs. */
  children: ReactNode;
  confirmLabel: string;
  /** False while the fields above are not filled in properly. */
  canConfirm?: boolean;
  /** Most actions need the PIN; cancelling a request does not. */
  needsPin?: boolean;
  danger?: boolean;
  /** Sends the action. Throw to show the server's message. */
  onConfirm: (pin: string) => Promise<void>;
  onClose: () => void;
};

/**
 * Every action that moves money, places or lifts a hold, or changes a rate
 * asks the staff member to type their own PIN again, so an unlocked
 * computer can't be used by someone else. The PIN is sent once and cleared.
 */
export function ConfirmWithPin({ title, children, confirmLabel, canConfirm = true, needsPin = true, danger, onConfirm, onClose }: Props) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLDivElement>(null);

  useEffect(() => {
    first.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const pinOk = !needsPin || /^\d{4,8}$/.test(pin);
  const ready = canConfirm && pinOk && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(pin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("Something went wrong. Please try again."));
    } finally {
      setPin("");
      setBusy(false);
    }
  }

  return (
    <div className="overlay" role="presentation">
      <form className="card dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onSubmit={submit}>
        <h2 id="confirm-title">{t(title)}</h2>
        <div className="dialog-body stack" ref={first}>
          {children}
        </div>
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {needsPin && (
          <label>
            {t("Your PIN")}
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            />
          </label>
        )}
        <div className="row-end">
          <button type="button" onClick={onClose} disabled={busy}>
            {t("Cancel")}
          </button>
          <button className={danger ? "danger" : "primary"} type="submit" disabled={!ready}>
            {busy ? t("Working…") : t(confirmLabel)}
          </button>
        </div>
      </form>
    </div>
  );
}
