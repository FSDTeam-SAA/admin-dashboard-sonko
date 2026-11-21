import { getLanguage } from "../i18n/language";

const cache = new Map<string, Intl.DisplayNames | null>();

/** "GM" -> "Gambia" (or "Gambie" in French). "??" or anything odd -> null. */
export function countryName(code: string): string | null {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const lang = getLanguage() === "fr" ? "fr" : "en-GB";
  if (!cache.has(lang)) {
    try {
      cache.set(lang, new Intl.DisplayNames([lang], { type: "region" }));
    } catch {
      cache.set(lang, null);
    }
  }
  try {
    return cache.get(lang)?.of(code) ?? code;
  } catch {
    return code;
  }
}
