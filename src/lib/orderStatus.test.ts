import { describe, expect, it } from "vitest";
import { ORDER_STATUS, ORDER_TIMELINE, orderStatusInfo, timelineIndex } from "./orderStatus";

// Every status the backend can return (backend app/models.py OrderStatus).
const BACKEND_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "VALIDATED",
  "SENT_TO_LAB",
  "PROCESSING",
  "READY",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

describe("order status wording", () => {
  it("has wording for every backend status", () => {
    for (const s of BACKEND_STATUSES) {
      expect(ORDER_STATUS[s], s).toBeDefined();
      expect(ORDER_STATUS[s].label.length).toBeGreaterThan(0);
    }
  });

  it("never calls a customer-submitted order confirmed (brief §6)", () => {
    for (const s of ["SUBMITTED", "VALIDATED"]) {
      const info = orderStatusInfo(s);
      expect(info.label).toBe("Request received");
      expect(`${info.label} ${info.description}`.toLowerCase()).not.toMatch(/confirm/);
    }
  });

  it("does not claim delivery or payment", () => {
    for (const s of BACKEND_STATUSES) {
      const text = `${ORDER_STATUS[s].label} ${ORDER_STATUS[s].description}`.toLowerCase();
      expect(text, s).not.toMatch(/delivered|paid\b/);
    }
  });

  it("falls back to the raw status for unknown values", () => {
    expect(orderStatusInfo("SOMETHING_NEW")).toEqual({ label: "SOMETHING_NEW", description: "", tone: "neutral" });
  });

  it("places SUBMITTED and VALIDATED on the first timeline step", () => {
    expect(timelineIndex("SUBMITTED")).toBe(0);
    expect(timelineIndex("VALIDATED")).toBe(0);
    expect(timelineIndex("COMPLETED")).toBe(ORDER_TIMELINE.length - 1);
    expect(timelineIndex("CANCELLED")).toBe(-1);
  });
});
