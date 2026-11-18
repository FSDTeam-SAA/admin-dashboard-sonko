import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onSessionEnd, isIdle, IDLE_LIMIT_MS, type EndReason } from "../api/session";
import { login as apiLogin, logout as apiLogout, type Staff } from "../api/staff";

type AuthState = {
  staff: Staff | null;
  endedBecause: EndReason | null;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [endedBecause, setEndedBecause] = useState<EndReason | null>(null);
  const lastActivity = useRef(Date.now());

  useEffect(
    () =>
      onSessionEnd((reason) => {
        setStaff(null);
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

  const login = useCallback(async (phone: string, pin: string) => {
    const me = await apiLogin(phone, pin);
    setEndedBecause(null);
    setStaff(me);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout("logout");
    setStaff(null);
  }, []);

  const value = useMemo(() => ({ staff, endedBecause, login, logout }), [staff, endedBecause, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
