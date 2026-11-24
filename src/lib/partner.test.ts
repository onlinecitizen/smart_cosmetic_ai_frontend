import { afterEach, describe, expect, it, vi } from "vitest";
import { activityLabel, makeShopApi, productGroup } from "./partner";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("partner API scoping", () => {
  it("sends every shop call to that shop's partner endpoints, never the admin API", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({})));
    vi.stubGlobal("fetch", fetchMock);
    const shop = makeShopApi("shop-a");
    await shop.products();
    await shop.product("p1");
    await shop.update("p1", { brand: "B" });
    await shop.submit("p1");
    await shop.requestChange("p1", { name: "N" }, "reason");
    await shop.images.deleteImage("img1");
    await shop.images.reorderImages("p1", ["img1"]);
    await shop.intake.batch("b1");
    await shop.intake.candidateAction("c1", "confirm");
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.every((u) => u.includes("/api/v1/partner/shops/shop-a/"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/v1/admin/"))).toBe(false);
    expect(shop.offerEndpoint("l1")).toBe("/api/v1/partner/shops/shop-a/listings/l1/offer");
    expect(shop.intake.originalUrl("f1")).toBe("/api/v1/partner/shops/shop-a/intake/files/f1/original");
  });

  it("encodes ids so they can't escape the shop path", () => {
    const shop = makeShopApi("a/../b");
    expect(shop.base).toBe("/api/v1/partner/shops/a%2F..%2Fb");
  });
});

describe("partner helpers", () => {
  it("groups returned and rejected products for correction", () => {
    expect(productGroup({ status: "DRAFT", feedback: { action: "return", reason: "x", at: "", by: "team" } })).toBe("returned");
    expect(productGroup({ status: "REJECTED", feedback: null })).toBe("returned");
    expect(productGroup({ status: "DRAFT", feedback: null })).toBe("draft");
    expect(productGroup({ status: "PENDING_REVIEW", feedback: null })).toBe("pending");
    expect(productGroup({ status: "PUBLISHED", feedback: null })).toBe("published");
  });
  it("labels activity in plain words", () => {
    expect(activityLabel("catalog_identity_returned")).toBe("Returned for correction");
    expect(activityLabel("some_new_event")).toBe("some new event");
  });
});
