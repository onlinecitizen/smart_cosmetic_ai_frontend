import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./safeNext";

describe("sanitizeNextPath", () => {
  it.each(["/analyze", "/orders/abc-123", "/formula/x/checkout?step=2"])("accepts same-site path %s", (p) => {
    expect(sanitizeNextPath(p)).toBe(p);
  });

  it.each([
    null,
    "",
    "analyze",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example", // browsers normalise "\" to "/" -> "//evil.example"
    "/\\/evil.example",
    "/ok\u0000",
    "/ok\n",
  ])("rejects %j", (p) => {
    expect(sanitizeNextPath(p)).toBeNull();
  });
});
