import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OrderRequestPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "req-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/order-requests/req-1",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1", full_name: "Test Customer", role: "customer" }, loading: false }),
}));

// Shape of backend OrderRequestOut (test data).
const REQUEST = {
  id: "req-1",
  reference: "SCA-ABCD-2345",
  status: "RECEIVED",
  status_label: "Request received, not yet confirmed",
  retailer: { id: "r1", name: "Test Shop", city: null },
  items: [
    {
      product_id: "p1",
      sku: "T-1",
      product_name: "Test Product",
      brand: null,
      size_label: null,
      quantity: 2,
      unit_price: null,
      currency: null,
      line_total: null,
      availability_at_request: "unknown",
    },
  ],
  currency: null,
  total_amount: null,
  price_complete: false,
  customer_name: "Test Customer",
  customer_phone: "+12025550123",
  contact_method: "whatsapp",
  fulfilment: "pickup",
  delivery_address: null,
  notes: null,
  is_test_fixture: false,
  created_at: "2026-11-22T10:00:00Z",
  updated_at: "2026-11-22T10:00:00Z",
  next_steps: ["This is not a confirmed order yet. Nothing has been charged, and no payment is taken on this website."],
  whatsapp: {
    available: true,
    retailer_name: "Test Shop",
    reason: null,
    message: "Hello",
    url: "https://wa.me/12025550199?text=Hello",
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("OrderRequestPage", () => {
  it("acknowledges the request without calling it confirmed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(REQUEST)));
    render(<OrderRequestPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Request received" })).toBeInTheDocument();
    expect(screen.getByText("SCA-ABCD-2345")).toBeInTheDocument();
    expect(screen.getByText("Request received, not yet confirmed")).toBeInTheDocument();
    expect(screen.getByText(/not a confirmed order yet/)).toBeInTheDocument();
    expect(screen.getByText(/Total to be confirmed by the retailer/)).toBeInTheDocument();
    expect(screen.getByText("Price not provided")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute("href", REQUEST.whatsapp.url);
  });

  it("explains when WhatsApp isn't configured", async () => {
    const whatsapp = { available: false, retailer_name: "Test Shop", reason: "Test Shop hasn’t set up WhatsApp ordering yet.", message: null, url: null };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ...REQUEST, whatsapp })));
    render(<OrderRequestPage />);
    expect(await screen.findByText(/hasn’t set up WhatsApp ordering yet/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open WhatsApp" })).not.toBeInTheDocument();
  });

  it("cancels after a confirmation step", async () => {
    const cancelled = { ...REQUEST, status: "CANCELLED", status_label: "Cancelled", next_steps: ["This request was cancelled. Nothing was charged."] };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(REQUEST)).mockResolvedValueOnce(json(cancelled));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderRequestPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel request" }));
    expect(await screen.findByText("This request was cancelled. Nothing was charged.")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/order-requests/req-1/cancel");
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open WhatsApp" })).not.toBeInTheDocument();
  });

  it("shows an error with retry when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "Order request not found" }, 404)));
    render(<OrderRequestPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t find that/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
