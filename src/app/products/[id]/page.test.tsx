import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductDetailPage from "./page";

const back = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p-1" }),
  useRouter: () => ({ back, push }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const OPTIONS = {
  categories: [],
  skin_types: [{ code: "dry", label: "Dry" }],
  concerns: [],
  avoid_groups: [],
  availability: [],
  category_tree: [
    { code: "fragrance", label: "Fragrance", attribute_group: "fragrance", children: [{ code: "perfume", label: "Perfume", attribute_group: "fragrance" }] },
  ],
};

const img = (n: number) => ({
  id: `i${n}`,
  url: `/api/v1/catalog/images/i${n}/file?v=${n}`,
  alt_text: n === 1 ? "Photo of BOSS Bottled" : `Photo of BOSS Bottled, view ${n}`,
  is_primary: n === 1,
  licence_note: "Photo: CC BY-SA 3.0, Open Beauty Facts contributors (Open Beauty Facts)",
});

const PRODUCT = {
  id: "p-1",
  sku: "FIX-009",
  name: "Bottled Eau de Toilette",
  brand: "BOSS",
  category: "perfume",
  description: "Eau de toilette in a 100 ml spray.\n\nDemo listing for design review, not sold by a partner.",
  size_label: "100 ml",
  price_amount: 185000,
  currency: "TZS",
  availability: "in_stock",
  ingredients_inci: null,
  skin_types: ["dry"],
  concerns: [],
  is_test_fixture: true,
  reviewed_at: null,
  retailer: { id: "r1", name: "Test Fixture Retailer (not a real partner)", city: "Test City", is_test_fixture: true, whatsapp_available: false },
  images: [img(1), img(2), img(3)],
  usage_instructions: "Spray onto skin.",
  warnings: "Flammable.",
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function renderWith(product: object) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => Promise.resolve(json(String(url).includes("/options") ? OPTIONS : product)))
  );
  return render(<ProductDetailPage />);
}

afterEach(() => {
  vi.unstubAllGlobals();
  back.mockReset();
  push.mockReset();
});

describe("ProductDetailPage", () => {
  it("shows the product's own details, photos and demo label, and nothing invented", async () => {
    renderWith(PRODUCT);
    expect(await screen.findByRole("heading", { level: 1, name: "Bottled Eau de Toilette" })).toBeInTheDocument();
    expect(screen.getByText(/185,000/)).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(await screen.findByText("Perfume")).toBeInTheDocument();
    expect(screen.getByText("Size 100 ml")).toBeInTheDocument();
    expect(screen.getByText("Eau de toilette in a 100 ml spray.")).toBeInTheDocument();
    expect(screen.getByText(/This is a demo listing for design review/)).toBeInTheDocument();
    // Three real photos, with the credit shown.
    expect(screen.getAllByRole("img", { name: /Photo of BOSS Bottled/ })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /Show photo \d of 3/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/CC BY-SA 3.0/)).toBeInTheDocument();
    // No ratings, reviews or quality badges.
    expect(screen.queryByText(/review(s)?\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Premium|Long lasting|Skin safe/i)).not.toBeInTheDocument();
  });

  it("keeps details in collapsible sections and says when ingredients are missing", async () => {
    renderWith(PRODUCT);
    const ingredients = (await screen.findByText("Ingredients")).closest("details")!;
    expect(within(ingredients).getByText("Not provided")).toBeInTheDocument();
    expect(within(ingredients).getByText(/No ingredient list was provided/)).toBeInTheDocument();
    expect(screen.getByText("How to use")).toBeInTheDocument();
    expect(screen.getByText("Warnings and precautions")).toBeInTheDocument();
    const about = screen.getByText("About this listing").closest("details")!;
    expect(within(about).getByText(/Demo listing for design review/)).toBeInTheDocument();
    expect(within(about).getByText(/Sold by Test Fixture Retailer/)).toBeInTheDocument();
  });

  it("uses the website request as the main action when the shop has no WhatsApp", async () => {
    renderWith(PRODUCT);
    expect(await screen.findByRole("link", { name: "Request this product" })).toHaveAttribute("href", "/products/p-1/request?quantity=1");
    expect(screen.queryByRole("link", { name: "Order via WhatsApp" })).not.toBeInTheDocument();
    expect(screen.getByText(/hasn’t set up WhatsApp ordering yet/)).toBeInTheDocument();
  });

  it("goes back, and saves with the heart", async () => {
    renderWith(PRODUCT);
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(back.mock.calls.length + push.mock.calls.length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Save Bottled Eau de Toilette" }));
    expect(screen.getByRole("button", { name: "Remove Bottled Eau de Toilette from saved" })).toBeInTheDocument();
    window.localStorage.clear();
  });

  it("shows the placeholder and no dots for a product without photos", async () => {
    renderWith({ ...PRODUCT, images: [], is_test_fixture: false });
    expect(await screen.findByText("No photo yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show photo/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/This is a demo listing/)).not.toBeInTheDocument();
  });
});
