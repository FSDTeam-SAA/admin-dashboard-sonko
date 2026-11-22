import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { visibleNav } from "../lib/nav";
import { LanguagePicker } from "../components/LanguagePicker";
import { useT } from "../i18n/language";
import { applyTheme, loadTheme, saveTheme, type ThemeChoice } from "../lib/theme";

export function Shell() {
  const { staff, logout } = useAuth();
  const t = useT();
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme);
  const items = visibleNav(staff?.permissions ?? []);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/logo-full.png" alt="Sunu Pay" width={170} height={27} />
          <small>{t("Admin")}</small>
        </div>
        <nav>
          {items.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"}>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="muted">{staff?.name || staff?.phone}</span>
          <div className="row-end">
            <LanguagePicker saveToAccount />
            <select aria-label={t("Theme")} value={theme} onChange={(event) => setTheme(event.target.value as ThemeChoice)}>
              <option value="system">{t("System")}</option>
              <option value="light">{t("Light")}</option>
              <option value="dark">{t("Dark")}</option>
            </select>
            <button onClick={() => void logout()}>{t("Log out")}</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
