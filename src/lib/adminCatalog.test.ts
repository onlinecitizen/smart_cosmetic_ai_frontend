import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import {
  adminError,
  changedFields,
  describeEvent,
  duplicatesFrom,
  EMPTY_FIELDS,
  imageFileError,
  isStale,
  moveItem,
  splitList,
  suggestCode,
} from "./adminCatalog";

describe("adminError", () => {
  it("shows the server's explanation for refusals", () => {
    expect(adminError(new ApiError(409, "This retailer already has a product with SKU 'A'"), "x")).toMatch(/SKU 'A'/);
    expect(adminError(new ApiError(422, { message: "Brand is missing.", blockers: [] }), "x")).toBe("Brand is missing.");
    expect(adminError(new ApiError(413, "The image is larger than 5 MB."), "x")).toMatch(/5 MB/);
  });
  it("turns validation lists into readable sentences", () => {
    const detail = [{ loc: ["body", "size_label"], msg: "Value error, too long" }];
    expect(adminError(new ApiError(422, detail), "x")).toBe("Pack size: too long");
  });
  it("falls back to the generic message for other failures", () => {
    expect(adminError(new ApiError(500, "Traceback ..."), "Could not save.")).toMatch(/server is having trouble/);
    expect(adminError(new ApiError(403, "Admin access required"), "x")).toMatch(/verify your session/);
    expect(adminError(new Error("boom"), "Could not save.")).toBe("Could not save.");
  });
});

describe("stale edits and duplicates", () => {
  it("recognises the stale-edit refusal only", () => {
    expect(isStale(new ApiError(409, { code: "stale", message: "changed" }))).toBe(true);
    expect(isStale(new ApiError(409, "Product is archived"))).toBe(false);
  });
  it("extracts duplicates from a 409", () => {
    const dups = [{ identity_id: "i1", name: "N", brand: null, variant: null, size_label: null, status: "DRAFT", reason: "gtin", score: 1 }];
    expect(duplicatesFrom(new ApiError(409, { message: "m", duplicates: dups }))).toEqual(dups);
    expect(duplicatesFrom(new ApiError(422, { duplicates: dups }))).toEqual([]);
  });
});

describe("changedFields", () => {
  const base = { ...EMPTY_FIELDS, name: "Cream", category: "moisturizer", brand: "B", skin_types: ["dry"] };
  it("returns only real changes, normalised", () => {
    expect(changedFields(base, { ...base, brand: "  B  ", description: "   " })).toEqual({});
    expect(changedFields(base, { ...base, brand: "C", skin_types: [] })).toEqual({ brand: "C", skin_types: null });
  });
  it("ignores attribute key order and empty attributes", () => {
    const a = { ...base, attributes: { spf: 30, texture: "gel" } };
    expect(changedFields(a, { ...a, attributes: { texture: "gel", spf: 30 } })).toEqual({});
    expect(changedFields({ ...base, attributes: null }, { ...base, attributes: {} })).toEqual({});
  });
});

describe("image checks", () => {
  it("checks type, size and emptiness before upload", () => {
    expect(imageFileError({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
    expect(imageFileError({ name: "a.gif", type: "image/gif", size: 1000 })).toMatch(/JPEG, PNG or WebP/);
    expect(imageFileError({ name: "a.jpg", type: "image/jpeg", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(imageFileError({ name: "a.jpg", type: "image/jpeg", size: 0 })).toMatch(/empty/);
  });
  it("moves gallery items and ignores impossible moves", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("small helpers", () => {
  it("splits comma lists without duplicates", () => {
    expect(splitList("rose, oud,\nrose ,, ")).toEqual(["rose", "oud"]);
  });
  it("suggests a valid category code", () => {
    expect(suggestCode("Face oil & balm")).toBe("face_oil_balm");
    expect(suggestCode("3-in-1")).toBe("c_3_in_1");
  });
  it("describes history events in plain words", () => {
    const e = {
      id: "1",
      entity_type: "identity",
      entity_id: "i",
      action: "return",
      from_status: "PENDING_REVIEW",
      to_status: "DRAFT",
      actor_user_id: null,
      actor_email: null,
      note: null,
      created_at: "",
    };
    expect(describeEvent(e)).toBe("Product: Returned for correction (Waiting for review → Draft)");
    expect(describeEvent({ ...e, entity_type: "fact", action: "reject", from_status: "unverified", to_status: "rejected" })).toMatch(
      /^Source: Source rejected/
    );
  });
});
