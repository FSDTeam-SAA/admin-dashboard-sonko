import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyTheme, loadTheme } from "./lib/theme";
import { getLanguage } from "./i18n/language";
import "./styles.css";

applyTheme(loadTheme());
document.documentElement.lang = getLanguage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
