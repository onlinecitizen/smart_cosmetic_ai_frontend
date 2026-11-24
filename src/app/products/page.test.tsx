import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductsPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const OPTIONS = { categories: [{ code: "serum", label: "Serum" }], skin_types: [], concerns: [], avoid_groups: [], availability: [] };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Routes options and product-list requests to separate mock responses. */
function routeFetch(list: () => Response) {
  return vi.fn((url: string) =>
    Promise.resolve(String(url).includes("/options") ? json(OPTIONS) : list())
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ProductsPage", () => {
  it("says honestly when no partner products are listed", async () => {
    vi.stubGlobal("fetch", routeFetch(() => json({ items: [], total: 0 })));
    render(<ProductsPage />);
    expect(await screen.findByText("No partner products are listed yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });

  it("shows an error with retry instead of an empty list when loading fails", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      routeFetch(() => (++calls === 1 ? json({ detail: "x" }, 500) : json({ items: [], total: 0 })))
    );
    render(<ProductsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/server is having trouble/);
    expect(screen.queryByText("No partner products are listed yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No partner products are listed yet.")).toBeInTheDocument();
  });

  it("filters by category with a pressed-state button", async () => {
    const fetchMock = routeFetch(() => json({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductsPage />);
    const serum = await screen.findByRole("button", { name: "Serum" });
    fireEvent.click(serum);
    expect(serum).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("No products match your filters.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("category=serum"))).toBe(true);
  });

  it("opens pre-filtered when a category arrives in the URL (homepage tiles)", async () => {
    window.history.pushState({}, "", "/products?category=serum");
    const fetchMock = routeFetch(() => json({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductsPage />);
    expect(await screen.findByText("No products match your filters.")).toBeInTheDocument();
    const listCalls = fetchMock.mock.calls.map((c) => String(c[0])).filter((u) => u.includes("/catalog/products"));
    expect(listCalls).toHaveLength(1);
    expect(listCalls[0]).toContain("category=serum");
    expect(await screen.findByRole("button", { name: "Serum" })).toHaveAttribute("aria-pressed", "true");
    window.history.pushState({}, "", "/");
  });

  it("shows top-level category chips from the category tree and filters by group", async () => {
    const tree = [
      { code: "skincare", label: "Skincare", attribute_group: "skincare", children: [{ code: "serum", label: "Serum", attribute_group: "skincare" }] },
      { code: "fragrance", label: "Fragrance", attribute_group: "fragrance", children: [{ code: "perfume", label: "Perfume", attribute_group: "fragrance" }] },
    ];
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        String(url).includes("/options")
          ? json({ ...OPTIONS, category_tree: tree })
          : json({
              items: [
                {
                  id: "p1", sku: "FIX-009", name: "Bottled", brand: "BOSS", category: "perfume", description: null, size_label: null,
                  price_amount: 1000, currency: "TZS", availability: "in_stock", ingredients_inci: null, skin_types: null, concerns: null,
                  is_test_fixture: true, reviewed_at: null, images: [],
                  retailer: { id: "r", name: "Shop", city: null, is_test_fixture: true, whatsapp_available: false },
                },
              ],
              total: 1,
            })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductsPage />);
    const fragrance = await screen.findByRole("button", { name: "Fragrance" });
    expect(screen.queryByRole("button", { name: "Serum" })).not.toBeInTheDocument();
    // The tile shows the group label for a subcategory product.
    expect(await screen.findByRole("link", { name: "Bottled" })).toHaveAttribute("href", "/products/p1");
    expect(screen.getAllByText("Fragrance").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(fragrance);
    expect(fragrance).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("category=fragrance"))).toBe(true));
  });

  it("filters by stock and sort order through the filter panel", async () => {
    const fetchMock = routeFetch(() => json({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductsPage />);
    const button = await screen.findByRole("button", { name: "Filters" });
    fireEvent.click(button);
    fireEvent.click(screen.getByLabelText("In stock only"));
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price_asc" } });
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([u]) => String(u).includes("availability=in_stock") && String(u).includes("sort=price_asc"))
      ).toBe(true)
    );
    expect(screen.getByRole("button", { name: "Filters (2 on)" })).toBeInTheDocument();
  });

  it("searches as you type", async () => {
    const fetchMock = routeFetch(() => json({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductsPage />);
    fireEvent.change(await screen.findByLabelText("Search by product or brand"), { target: { value: "cerave" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("q=cerave"))).toBe(true), { timeout: 2000 });
  });
});
