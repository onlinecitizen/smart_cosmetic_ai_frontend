import { afterEach, describe, expect, it, vi } from "vitest";
import { assistantApi, parseBudget, parseIngredients, safeProductHref, toggle, ui } from "./assistant";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("assistant API client", () => {
  it("talks only to our backend's assistant endpoints, with ids encoded", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({})));
    vi.stubGlobal("fetch", fetchMock);
    await assistantApi.start("sw");
    await assistantApi.say("a/../b", "hello", 3);
    await assistantApi.choose("c1", "skin_type", ["dry"], 4);
    await assistantApi.confirm("c1", 5);
    const calls: [string, RequestInit][] = fetchMock.mock.calls.map(([u, init]) => [String(u), init as RequestInit]);
    expect(calls.every(([u]) => u.includes("/api/v1/assistant/"))).toBe(true);
    expect(calls.some(([u]) => /anthropic|claude/i.test(u))).toBe(false);
    expect(calls[1][0]).toContain("/conversations/a%2F..%2Fb/messages");
    expect(JSON.parse(String(calls[1][1].body))).toEqual({ text: "hello", version: 3 });
    expect(JSON.parse(String(calls[2][1].body))).toEqual({ choice: { slot: "skin_type", values: ["dry"] }, version: 4 });
    // Credentials are the session cookie; nothing is put in storage.
    expect(calls.every(([, init]) => init.credentials === "include")).toBe(true);
  });
});

describe("assistant helpers", () => {
  it("parses ingredient lists and budgets strictly", () => {
    expect(parseIngredients("Lanolin, essential  oil,, x, lanolin")).toEqual(["lanolin", "essential oil"]);
    expect(parseBudget("30,000")).toBe(30000);
    expect(parseBudget("30k")).toBeNull();
    expect(parseBudget("0")).toBeNull();
    expect(toggle(["a"], "a")).toEqual([]);
  });

  it("only renders links to this site's product pages", () => {
    expect(safeProductHref("/products/abc-123")).toBe("/products/abc-123");
    expect(safeProductHref("/products/abc-123/request")).toBe("/products/abc-123/request");
    expect(safeProductHref("https://evil.example/products/1")).toBeNull();
    expect(safeProductHref("javascript:alert(1)")).toBeNull();
    expect(safeProductHref("/products/../admin")).toBeNull();
  });

  it("has every interface string in both languages", () => {
    expect(ui("sw", "send")).toBe("Tuma");
    expect(ui("en", "privacy", { days: 30 })).toContain("30 days");
  });
});
