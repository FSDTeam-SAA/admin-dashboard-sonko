import { describe, expect, it, vi } from "vitest";
import { attachTicketFile, removeTicketFile, ticketFile } from "../src/api/admin";
import { setTokens } from "../src/api/session";
import { fileSize, pickProblem } from "../src/pages/TicketsPage";
import { PERMISSION_GROUPS } from "../src/lib/permissions";

describe("ticket files", () => {
  it("checks the chosen file before sending it", () => {
    expect(pickProblem(null)).toMatch(/Choose a file/);
    expect(pickProblem({ type: "image/gif", size: 10 })).toMatch(/Only JPG, PNG or PDF/);
    expect(pickProblem({ type: "image/svg+xml", size: 10 })).toMatch(/Only JPG, PNG or PDF/);
    expect(pickProblem({ type: "application/pdf", size: 6 * 1024 * 1024 })).toMatch(/bigger than 5 MB/);
    expect(pickProblem({ type: "image/png", size: 1000 })).toBeNull();
  });

  it("shows sizes plainly", () => {
    expect(fileSize(300)).toBe("1 KB");
    expect(fileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("uploads as a form with an idempotency key, not as JSON", async () => {
    setTokens({ access: "A", refresh: "R" });
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ success: true, data: null }), { status: 201 });
    }));
    await attachTicketFile("t1", new File(["x"], "a.png", { type: "image/png" }), "Screenshot", "key-1234567890abcdef");
    const { url, init } = calls[0]!;
    expect(url).toMatch(/\/admin\/tickets\/t1\/files$/);
    expect(init.body).toBeInstanceOf(FormData);
    const h = new Headers(init.headers);
    expect(h.get("Content-Type")).toBeNull();
    expect(h.get("Idempotency-Key")).toBe("key-1234567890abcdef");
    expect(h.get("Authorization")).toBe("Bearer A");
    expect(init.credentials).toBe("omit");
    vi.unstubAllGlobals();
  });

  it("a download comes back as bytes; a refusal comes back as the server's message", async () => {
    setTokens({ access: "A", refresh: "R" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "application/pdf" } })));
    const blob = await ticketFile("t1", "f1");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, message: "File not found" }), { status: 404 })));
    await expect(ticketFile("t1", "f1")).rejects.toThrow("File not found");
    await expect(removeTicketFile("t1", "f1")).rejects.toThrow("File not found");
    vi.unstubAllGlobals();
  });

  it("the Staff page lists the ticket_files permission", () => {
    expect(PERMISSION_GROUPS.flatMap((g) => g.items.map(([p]) => p))).toContain("ticket_files");
  });
});
