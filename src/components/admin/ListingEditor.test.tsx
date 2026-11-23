import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListingEditor, listingError } from "./ListingEditor";
import type { AdminCatalogProduct } from "@/lib/catalog";

const PRODUCT = {
  id: "p1",
  name: "Test Product",
  sku: "T-1",
  price_amount: 12000,
  currency: "TZS",
  availability: "in_stock",
  status: "PUBLISHED",
  updated_at: "2026-11-23T00:00:00Z",
} as unknown as AdminCatalogProduct;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("listingError", () => {
  it("accepts a whole price with a currency, or neither", () => {
    expect(listingError("12000", "tzs")).toBeNull();
    expect(listingError("", "")).toBeNull();
  });
  it("rejects incomplete or malformed values", () => {
    expect(listingError("", "TZS")).toMatch(/Enter a price/);
    expect(listingError("12,000", "TZS")).toMatch(/whole number/);
    expect(listingError("12.5", "TZS")).toMatch(/whole number/);
    expect(listingError("100000001", "TZS")).toMatch(/too high/);
    expect(listingError("100", "")).toMatch(/3-letter code/);
  });
});

describe("ListingEditor", () => {
  it("sends only price and stock to the listing endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();
    render(<ListingEditor product={PRODUCT} onSaved={onSaved} />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Stock for Test Product"), { target: { value: "out_of_stock" } });
    fireEvent.change(screen.getByLabelText("Price for Test Product"), { target: { value: "15000" } });
    fireEvent.click(save);
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/catalog/products/p1/listing");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ price_amount: 15000, currency: "TZS", availability: "out_of_stock" });
  });

  it("does not send an invalid price", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ListingEditor product={PRODUCT} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Price for Test Product"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/whole number/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
