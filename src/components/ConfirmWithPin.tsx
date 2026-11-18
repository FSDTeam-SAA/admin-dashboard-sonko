import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type Props = {
  title: string;
  /** What will happen, in plain words, e.g. "Refund D 500 to +220 ••• 1234". */
  children: ReactNode;
  confirmLabel: string;
  /** Sends the action with this PIN. Throw to show the server's message. */
  onConfirm: (pin: string) => Promise<void>;
  onClose: () => void;
};

/**
 * Every action that moves money, places or lifts a hold, or changes a rate
 * asks the staff member to type their own PIN again, so an unlocked
 * computer can't be used by someone else. The PIN is sent once and cleared.
 */
export function ConfirmWithPin({ title, children, confirmLabel, onConfirm, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(pin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setPin("");
      setBusy(false);
    }
  }

  return (
    <div className="overlay" role="presentation">
      <form className="card dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onSubmit={submit}>
        <h2 id="confirm-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Your PIN
          <input
            ref={input}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          />
        </label>
        <div className="row-end">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" type="submit" disabled={busy || !/^\d{4,8}$/.test(pin)}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
