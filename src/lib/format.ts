import { getLanguage, translate } from "../i18n/language";
// Money and dates the same way on every page.

// Currencies with no smaller unit (the CFA franc). Everything else has 2.
const NO_DECIMALS = new Set(["XOF", "XAF", "GNF"]);

export function decimalsOf(currency: string): number {
  return NO_DECIMALS.has(currency.toUpperCase()) ? 0 : 2;
}

/** An amount in the smallest unit (pence, bututs), e.g. 12345 GMD → "GMD 123.45". */
export function money(minor: number, currency: string): string {
  const decimals = decimalsOf(currency);
  const value = minor / 10 ** decimals;
  return `${currency.toUpperCase()} ${value.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** An amount already in whole units, e.g. 123.45. */
export function moneyMajor(amount: number, currency: string): string {
  const decimals = decimalsOf(currency);
  return `${currency.toUpperCase()} ${amount.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function when(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  // Dates follow the staff member's language. Money amounts do not: the
  // same figure must read the same for everyone.
  const locale = getLanguage() === "fr" ? "fr-FR" : "en-GB";
  return date.toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function personLabel(person: { name?: string; phone?: string } | null | undefined): string {
  if (!person) return translate("Unknown", getLanguage());
  const name = person.name?.trim();
  return name && person.phone ? `${name} (${person.phone})` : name || person.phone || translate("Unknown", getLanguage());
}
