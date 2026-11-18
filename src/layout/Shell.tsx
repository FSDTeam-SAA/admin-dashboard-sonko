import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { visibleNav } from "../lib/nav";
import { applyTheme, loadTheme, saveTheme, type ThemeChoice } from "../lib/theme";

export function Shell() {
  const { staff, logout } = useAuth();
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
          <img src="/sp-mark.png" alt="" width={40} height={20} />
          <span>Sunu Pay Admin</span>
        </div>
        <nav>
          {items.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="muted">{staff?.name || staff?.phone}</span>
          <div className="row-end">
            <select aria-label="Theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeChoice)}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <button onClick={() => void logout()}>Log out</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
