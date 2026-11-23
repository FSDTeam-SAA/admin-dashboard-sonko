// Entry for the clickable demo (demo.html, built with vite.demo.config.ts).
// It runs the real panel code, with a pretend server inside the page and a
// bar that says it is a demo. The real panel's entry is src/main.tsx.
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "../App";
import { API_BASE } from "../api/config";
import { finishLogin, startLogin } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { applyTheme, loadTheme } from "../lib/theme";
import { getLanguage, useT } from "../i18n/language";
import { STAFF, SIGN_IN_AS } from "./data";
import { demoIdentity, installDemoServer } from "./server";
import "../styles.css";
import "./demo.css";

installDemoServer(API_BASE);
applyTheme(loadTheme());
document.documentElement.lang = getLanguage();

function DemoBar() {
  const { staff, enter } = useAuth();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function signIn(id: string) {
    setBusy(true);
    try {
      demoIdentity.signInAs(id);
      const step = await startLogin("+447700900000", "0000");
      const result = await finishLogin(step.ticket, { code: "000000" });
      enter(result.staff);
    } finally {
      setBusy(false);
    }
  }

  // Open straight on Home; the sign-in screen is one "Log out" away.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signIn("s1");
  }, []);

  const current = staff?._id ?? "";
  return (
    <div className="demo-bar" role="note">
      <strong>{t("Demo")}</strong>
      <span className="demo-bar__text">{t("Made-up data. Nothing is saved or sent.")}</span>
      <label className="demo-bar__who">
        <span>{t("Signed in as")}</span>
        <select value={current} disabled={busy} onChange={(e) => void signIn(e.target.value)}>
          {!current && <option value="">{t("Signed out")}</option>}
          {SIGN_IN_AS.map((id) => {
            const person = STAFF.find((s) => s.id === id)!;
            return (
              <option key={id} value={id}>
                {person.name} · {t(person.jobTitle)}
              </option>
            );
          })}
        </select>
      </label>
      <span className="demo-bar__hint">{t("Changes that need two people: ask as one, switch, approve as the other.")}</span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App Router={HashRouter} extra={<DemoBar />} />
  </StrictMode>,
);
