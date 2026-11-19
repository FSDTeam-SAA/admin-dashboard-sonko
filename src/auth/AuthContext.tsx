import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onSessionEnd, isIdle, IDLE_LIMIT_MS, type EndReason } from "../api/session";
import { logout as apiLogout, type Staff } from "../api/staff";
import { setLanguage } from "../i18n/language";

type AuthState = {
  staff: Staff | null;
  endedBecause: EndReason | null;
  /** A note to show once on Home, e.g. few recovery codes left. */
  notice: string | null;
  enter: (staff: Staff, notice?: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [endedBecause, setEndedBecause] = useState<EndReason | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lastActivity = useRef(Date.now());

  useEffect(
    () =>
      onSessionEnd((reason) => {
        setStaff(null);
        setNotice(null);
        setEndedBecause(reason);
      }),
    [],
  );

  // Log out after 15 minutes without a click or key press.
  useEffect(() => {
    if (!staff) return;
    lastActivity.current = Date.now();
    const touch = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    const timer = window.setInterval(() => {
      if (isIdle(lastActivity.current, Date.now(), IDLE_LIMIT_MS)) void apiLogout("idle");
    }, 30_000);
    return () => {
      ACTIVITY.forEach((name) => window.removeEventListener(name, touch));
      window.clearInterval(timer);
    };
  }, [staff]);

  const enter = useCallback((me: Staff, note?: string) => {
    setEndedBecause(null);
    setNotice(note ?? null);
    // The language saved on the account wins over this browser's.
    if (me.language) setLanguage(me.language);
    setStaff(me);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout("logout");
    setStaff(null);
    setNotice(null);
  }, []);

  const value = useMemo(
    () => ({ staff, endedBecause, notice, enter, logout }),
    [staff, endedBecause, notice, enter, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
