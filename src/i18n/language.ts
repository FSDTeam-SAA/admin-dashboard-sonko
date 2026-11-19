// The panel's language for the staff member using it: English or French.
// Each person picks their own; it is saved on their staff account (so it
// follows them to another computer) and kept in this browser so the login
// screen is in their language too. English is the source text: anything
// with no French yet is shown in English, never guessed.
import { useSyncExternalStore } from "react";
import { FR } from "./fr";

export type Language = "en" | "fr";
const KEY = "sunu-admin-language";
const listeners = new Set<() => void>();

function stored(): Language {
  try {
    return localStorage.getItem(KEY) === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

let current: Language = stored();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language): void {
  if (language !== "en" && language !== "fr") return;
  current = language;
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // Not kept in this browser; the account still has it.
  }
  document.documentElement.lang = language;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** [text] in [language], with {name} filled in from [vars]. */
export function translate(text: string, language: Language, vars?: Record<string, string | number>): string {
  const base = language === "fr" ? (FR[text] ?? text) : text;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** For components: re-renders when the language changes. */
export function useT() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return Object.assign((text: string, vars?: Record<string, string | number>) => translate(text, language, vars), { language });
}
