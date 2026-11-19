import { saveMyLanguage } from "../api/staff";
import { setLanguage, useT, type Language } from "../i18n/language";

/**
 * English or Français. Changes the panel at once. When signed in, it is
 * also saved on the staff member's own account ([saveToAccount]).
 */
export function LanguagePicker({ saveToAccount = false }: { saveToAccount?: boolean }) {
  const t = useT();
  return (
    <select
      aria-label={t("Language")}
      value={t.language}
      onChange={(event) => {
        const language = event.target.value as Language;
        setLanguage(language);
        // If saving fails, this browser still remembers it.
        if (saveToAccount) void saveMyLanguage(language).catch(() => undefined);
      }}
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
    </select>
  );
}
