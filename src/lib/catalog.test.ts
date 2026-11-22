import { afterEach, describe, expect, it, vi } from "vitest";
import { avoidListError, catalogApi, labeller, parseAvoidList } from "./catalog";

afterEach(() => vi.unstubAllGlobals());

describe("avoid list helpers", () => {
  it("splits on commas and newlines, normalises and de-duplicates", () => {
    expect(parseAvoidList(" Niacinamide, shea  butter\nNIACINAMIDE,, ")).toEqual(["niacinamide", "shea butter"]);
    expect(parseAvoidList("")).toEqual([]);
  });

  it("mirrors the backend limits (3-60 chars, max 10)", () => {
    expect(avoidListError(["niacinamide"])).toBeNull();
    expect(avoidListError(["ab"])).toMatch(/between 3 and 60/);
    expect(avoidListError(["x".repeat(61)])).toMatch(/between 3 and 60/);
    expect(avoidListError(Array.from({ length: 11 }, (_, i) => `term${i}`))).toMatch(/at most 10/);
  });
});

describe("labeller", () => {
  it("uses option labels and falls back to a readable code", () => {
    const label = labeller([{ code: "eye_care", label: "Eye care" }]);
    expect(label("eye_care")).toBe("Eye care");
    expect(label("visible_pores")).toBe("visible pores");
  });
});

describe("catalogApi.list", () => {
  it("sends filters as query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { headers: { "content-type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);
    await catalogApi.list({ category: "serum", q: "vit c", limit: 12, offset: 24 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/api/v1/catalog/products?");
    expect(url).toContain("category=serum");
    expect(url).toContain("q=vit+c");
    expect(url).toContain("limit=12");
    expect(url).toContain("offset=24");
  });
});
