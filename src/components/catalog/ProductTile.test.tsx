import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/catalog";
import { ProductTile } from "./ProductTile";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const product: CatalogProduct = {
  id: "p-1",
  sku: "FIX-009",
  name: "Bottled Eau de Toilette",
  brand: "BOSS",
  category: "perfume",
  description: "A long description that must not appear on the card.",
  size_label: "100 ml",
  price_amount: 185000,
  currency: "TZS",
  availability: "in_stock",
  ingredients_inci: "ALCOHOL DENAT., PARFUM",
  skin_types: null,
  concerns: null,
  is_test_fixture: true,
  reviewed_at: null,
  retailer: { id: "r1", name: "Test Fixture Retailer (not a real partner)", city: "Test City", is_test_fixture: true, whatsapp_available: false },
  images: [{ id: "i1", url: "/api/v1/catalog/images/i1/file?v=1", alt_text: "Photo of BOSS Bottled", is_primary: true, licence_note: "Photo: CC BY-SA 3.0" }],
};

afterEach(() => window.localStorage.clear());

describe("ProductTile", () => {
  it("shows only photo, brand, name, price and category, and links to the product", () => {
    render(<ProductTile product={product} groupLabel="Fragrance" />);
    expect(screen.getByRole("img", { name: "Photo of BOSS Bottled" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bottled Eau de Toilette" })).toHaveAttribute("href", "/products/p-1");
    expect(screen.getByText("BOSS")).toBeInTheDocument();
    expect(screen.getByText(/185,000/)).toBeInTheDocument();
    expect(screen.getByText("Fragrance")).toBeInTheDocument();
    // Long text, ingredients, retailer and licence stay on the product page.
    expect(screen.queryByText(/long description/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PARFUM/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Test Fixture Retailer/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CC BY-SA/)).not.toBeInTheDocument();
  });

  it("labels demo listings and never invents a price", () => {
    render(<ProductTile product={{ ...product, price_amount: null, currency: null, availability: "out_of_stock" }} groupLabel="Fragrance" />);
    expect(screen.getByText("Demo")).toHaveAttribute("title", expect.stringMatching(/not sold by a partner/));
    expect(screen.getByText("Price not listed")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("shows the no-photo placeholder instead of a drawing", () => {
    render(<ProductTile product={{ ...product, images: [], is_test_fixture: false }} groupLabel="Fragrance" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No photo yet")).toBeInTheDocument();
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
  });

  it("saves and unsaves on this device with the heart", () => {
    render(<ProductTile product={product} groupLabel="Fragrance" />);
    const heart = screen.getByRole("button", { name: "Save Bottled Eau de Toilette" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(heart);
    expect(screen.getByRole("button", { name: "Remove Bottled Eau de Toilette from saved" })).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(window.localStorage.getItem("sca.saved.v1") ?? "[]")).toEqual(["p-1"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Bottled Eau de Toilette from saved" }));
    expect(JSON.parse(window.localStorage.getItem("sca.saved.v1") ?? "[]")).toEqual([]);
  });
});
