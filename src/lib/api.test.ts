import { describe, expect, it } from "vitest";
import { ApiError, errorMessage } from "./api";

describe("errorMessage", () => {
  it("maps auth and server failures to plain language", () => {
    expect(errorMessage(new ApiError(401, "Not authenticated"), "x")).toMatch(/session has expired/);
    expect(errorMessage(new ApiError(403, "Invalid CSRF token"), "x")).toMatch(/verify your session/);
    expect(errorMessage(new ApiError(500, { detail: "boom", request_id: "r" }), "x")).toMatch(/server is having trouble/);
  });

  it("explains network failures", () => {
    expect(errorMessage(new TypeError("Failed to fetch"), "x")).toMatch(/couldn’t reach the server/);
  });

  it("never shows raw server text, falling back instead", () => {
    const msg = errorMessage(new ApiError(409, "Formula is not in a valid, orderable state"), "Fallback.");
    expect(msg).toBe("Fallback.");
  });
});
