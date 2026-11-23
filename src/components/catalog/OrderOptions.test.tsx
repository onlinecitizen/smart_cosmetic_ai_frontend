import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/catalog";
import { OrderOptions } from "./OrderOptions";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Test data in the shape of backend ProductPublicOut.
const product: CatalogProduct = {
  id: "p1",
  sku: "T-1",
  name: "Test Product",
  brand: null,
  category: "serum",
  description: null,
  size_label: null,
  price_amount: 1000,
  currency: "TZS",
  availability: "in_stock",
  ingredients_inci: null,
  skin_types: null,
  concerns: null,
  is_test_fixture: true,
  reviewed_at: null,
  retailer: { id: "r1", name: "Test Shop", city: null, is_test_fixture: true, whatsapp_available: true },
};

const link = (quantity: number) => ({
  available: true,
  retailer_name: "Test Shop",
  reason: null,
  message: `Hello Test Shop\n- ${quantity} x Test Product`,
  url: `https://wa.me/12025550199?text=Hello%20Test%20Shop%0A-%20${quantity}%20x%20Test%20Product`,
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("OrderOptions", () => {
  it("offers both methods and says neither is a confirmed order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(link(1)));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderOptions product={product} />);

    expect(screen.getByText(/isn’t a confirmed order/)).toBeInTheDocument();
    expect(screen.getByText(/No payment is taken/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request this product" })).toHaveAttribute(
      "href",
      "/products/p1/request?quantity=1"
    );
    const wa = await screen.findByRole("link", { name: "Open WhatsApp" });
    expect(wa).toHaveAttribute("href", link(1).url);
    expect(wa).toHaveAttribute("target", "_blank");
    expect(wa).toHaveAttribute("rel", "noopener noreferrer");

    // Only ids and quantities are sent: the server builds the message.
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/catalog/whatsapp-message");
    expect(JSON.parse(init.body)).toEqual({ items: [{ product_id: "p1", quantity: 1 }] });
  });

  it("rebuilds the WhatsApp message when the quantity changes", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(link(1))).mockResolvedValueOnce(json(link(3)));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderOptions product={product} />);
    await screen.findByRole("link", { name: "Open WhatsApp" });

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "3" } });
    await waitFor(() => expect(screen.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute("href", link(3).url));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).items[0].quantity).toBe(3);
    expect(screen.getByRole("link", { name: "Request this product" })).toHaveAttribute(
      "href",
      "/products/p1/request?quantity=3"
    );
  });

  it("never invents a WhatsApp contact when none is configured", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderOptions product={{ ...product, retailer: { ...product.retailer, whatsapp_available: false } }} />);
    expect(screen.getByText(/hasn’t set up WhatsApp ordering yet/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open WhatsApp" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks both methods when out of stock", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<OrderOptions product={{ ...product, availability: "out_of_stock" }} />);
    expect(screen.getByText(/out of stock, so it can’t be requested/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Request this product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open WhatsApp" })).not.toBeInTheDocument();
  });

  it("shows an error state when the message can't be prepared", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<OrderOptions product={product} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t reach the server/);
    expect(screen.getByRole("link", { name: "Request this product" })).toBeInTheDocument();
  });
});
