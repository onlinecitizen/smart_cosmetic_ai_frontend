import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogProduct, RecommendationResult } from "@/lib/catalog";
import { RecommendationResults } from "./RecommendationResults";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Test data in the shape of the backend RecommendationOut schema.
const product: CatalogProduct = {
  id: "p1",
  sku: "FIX-001",
  name: "[Test fixture] Gentle Hydrating Cleanser",
  brand: "Fixture Brand",
  category: "cleanser",
  description: null,
  size_label: "50 mL",
  price_amount: null,
  currency: null,
  availability: "unknown",
  ingredients_inci: "Aqua, Glycerin",
  skin_types: ["all"],
  concerns: ["dryness"],
  is_test_fixture: true,
  reviewed_at: null,
  retailer: { id: "r", name: "Test Fixture Retailer (not a real partner)", city: null, is_test_fixture: true },
};

const base: RecommendationResult = {
  method: "rules-v1",
  evaluated_count: 3,
  recommended: [
    {
      product,
      score: 3,
      matched_concerns: ["dryness"],
      reasons: ["Listed for dryness, one of your concerns.", "Listed for all skin types."],
      cautions: ["Price not provided."],
    },
  ],
  excluded: [
    {
      product: { id: "p2", name: "Fragranced Moisturizer", brand: null, retailer_name: "Shop", is_test_fixture: true },
      reasons: ["Lists “parfum” (fragrance), which you asked to avoid."],
    },
  ],
  not_matched_count: 1,
  limitations: ["Recommendations come from fixed rules.", "This is cosmetic product matching, not medical advice."],
};

const label = (c: string) => c;

describe("RecommendationResults", () => {
  it("explains every recommendation and exclusion", () => {
    render(<RecommendationResults result={base} categoryLabel={label} onEdit={() => undefined} />);
    expect(screen.getByRole("heading", { name: "1 product matched your answers" })).toBeInTheDocument();
    expect(screen.getByText("Listed for dryness, one of your concerns.")).toBeInTheDocument();
    expect(screen.getByText("Price not provided.")).toBeInTheDocument();
    expect(screen.getByText(/Why 1 product was not shown/)).toBeInTheDocument();
    expect(screen.getByText(/“parfum”/)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/)).toBeInTheDocument();
    expect(screen.getByText("Method: rules-v1")).toBeInTheDocument();
  });

  it("labels test fixtures and never shows an invented price", () => {
    render(<RecommendationResults result={base} categoryLabel={label} onEdit={() => undefined} />);
    expect(screen.getAllByText("Test fixture").length).toBeGreaterThan(0);
    expect(screen.queryByText(/TZS/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Price not provided").length).toBeGreaterThan(0);
  });

  it("says so plainly when the catalogue is empty", () => {
    render(
      <RecommendationResults
        result={{ ...base, evaluated_count: 0, recommended: [], excluded: [], not_matched_count: 0 }}
        categoryLabel={label}
        onEdit={() => undefined}
      />
    );
    expect(screen.getByRole("heading", { name: "No products matched your answers" })).toBeInTheDocument();
    expect(screen.getByText(/No partner products are listed yet/)).toBeInTheDocument();
  });

  it("suggests next steps when nothing matched", () => {
    render(
      <RecommendationResults result={{ ...base, recommended: [] }} categoryLabel={label} onEdit={() => undefined} />
    );
    expect(screen.getByRole("link", { name: "Browse all products" })).toHaveAttribute("href", "/products");
  });
});
