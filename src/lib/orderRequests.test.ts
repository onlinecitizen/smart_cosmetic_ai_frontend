import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import {
  ADMIN_ACTIONS,
  isDefinitiveRejection,
  newClientRequestId,
  normalizePhone,
  orderErrorMessage,
  phoneError,
} from "./orderRequests";

describe("phone validation (mirrors backend OrderRequestIn)", () => {
  it("accepts international numbers with separators", () => {
    expect(normalizePhone("+1 (202) 555-0123")).toBe("+12025550123");
    expect(phoneError("+1 202 555 0123")).toBeNull();
  });

  it("rejects local, malformed and empty numbers", () => {
    expect(phoneError("")).toBe("Enter a phone number.");
    expect(phoneError("0712 345 678")).toMatch(/country code/);
    expect(phoneError("+0 202 555 0123")).toMatch(/country code/);
    expect(phoneError("+1 202")).toMatch(/country code/);
    expect(phoneError("+1 202 555 0123 ext")).toMatch(/country code/);
  });
});

describe("duplicate-submission safety", () => {
  it("generates RFC 4122 ids the backend accepts", () => {
    const id = newClientRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newClientRequestId()).not.toBe(id);
  });

  it("keeps the id when the server may have stored the request", () => {
    expect(isDefinitiveRejection(new TypeError("Failed to fetch"))).toBe(false); // network: unknown outcome
    expect(isDefinitiveRejection(new ApiError(502, "Bad gateway"))).toBe(false);
    expect(isDefinitiveRejection(new ApiError(409, "…with different details. Check “My requests”…"))).toBe(false);
  });

  it("allows a fresh id after a definite rejection", () => {
    expect(isDefinitiveRejection(new ApiError(409, "“X” is out of stock at Shop"))).toBe(true);
    expect(isDefinitiveRejection(new ApiError(422, [{ msg: "bad" }]))).toBe(true);
  });
});

describe("orderErrorMessage", () => {
  it("shows the backend's customer-facing 409/422 sentences", () => {
    const msg = "“X” is out of stock at Shop, so it can’t be requested right now.";
    expect(orderErrorMessage(new ApiError(409, msg), "fallback")).toBe(msg);
  });

  it("never shows raw validation lists or server errors", () => {
    expect(orderErrorMessage(new ApiError(422, [{ loc: ["body"], msg: "x" }]), "fallback")).toBe("fallback");
    expect(orderErrorMessage(new ApiError(500, "Traceback"), "fallback")).toMatch(/server is having trouble/);
  });
});

describe("ADMIN_ACTIONS", () => {
  it("matches backend ORDER_REQUEST_TRANSITIONS", () => {
    const allowed = Object.fromEntries(Object.entries(ADMIN_ACTIONS).map(([k, v]) => [k, v.map((a) => a.status).sort()]));
    expect(allowed).toEqual({
      RECEIVED: ["CANCELLED", "CONFIRMED", "DECLINED"],
      CONFIRMED: ["CANCELLED", "COMPLETED"],
      DECLINED: [],
      CANCELLED: [],
      COMPLETED: [],
    });
  });
});
