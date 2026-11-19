import { describe, expect, it, vi } from "vitest";
import { translateTicketNote } from "../src/api/admin";
import { setTokens } from "../src/api/session";
import { PERMISSION_GROUPS } from "../src/lib/permissions";

describe("translate a ticket note", () => {
  it("asks for a note by its place and sends only the language, never the text", async () => {
    setTokens({ access: "A", refresh: "R" });
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ success: true, data: { sameLanguage: false, text: "Hello", target: "en" } }), { status: 200 });
    }));
    const out = await translateTicketNote("t".repeat(24), 2, "en");
    expect(out.text).toBe("Hello");
    expect(calls[0]!.url).toContain(`/admin/tickets/${"t".repeat(24)}/notes/2/translate`);
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ target: "en" });
    vi.unstubAllGlobals();
  });

  it("the Staff page can give the permission", () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.items.map(([p]) => p));
    expect(all).toContain("translate_notes");
  });
});
