import { describe, expect, it } from "vitest";
import { tp } from "../src/i18n/patterns";
import { translate } from "../src/i18n/language";
import { NAV } from "../src/lib/nav";
import { PERMISSION_GROUPS } from "../src/lib/permissions";

const fr = (text: string, vars?: Record<string, string | number>) => translate(text, "fr", vars);

describe("backups page", () => {
  it("is shown only to staff who may see backups", () => {
    const item = NAV.find((n) => n.path === "/backups");
    expect(item?.permission).toBe("view_backups");
    expect(item?.routes).toEqual(["GET /admin/backups", "POST /admin/backups/restore-tests"]);
  });

  it("both permissions have a label for the Staff page", () => {
    const all = JSON.stringify(PERMISSION_GROUPS);
    expect(all).toContain("view_backups");
    expect(all).toContain("record_restore_tests");
  });

  it("server sentences with numbers read in French", () => {
    expect(tp(fr, "The newest backup is 5 hours old. This is normal.")).toBe("La dernière sauvegarde date de 5 heures. C'est normal.");
    expect(tp(fr, "A restore was proved 12 days ago.")).toBe("Une restauration a été prouvée il y a 12 jours.");
    expect(tp(fr, "The newest backup is 60 hours old. Backups have stopped or failed. Ask the developer to check today.")).toContain("60 heures");
  });

  it("the fixed server sentences all have French", () => {
    for (const s of [
      "No finished backup was found. Ask the developer to check backups in Atlas today.",
      "Could not read backups from Atlas just now. This does not mean backups stopped. Ask the developer to check.",
      "Backup status is not set up yet. The developer needs to add the Atlas read-only key on Render.",
      "The latest restore test FAILED. Backups may not be usable. Ask the developer to look at this today.",
      "No restore has been proved yet. Ask the developer to restore a copy to a spare database and check it, then record it here.",
    ])
      expect(fr(s), s).not.toBe(s);
  });
});
