import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RequestProductPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/products/p1/request",
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

// Shape of backend ProductPublicOut (test data).
const PRODUCT = {
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
  is_test_fixture: false,
  reviewed_at: null,
  retailer: { id: "r1", name: "Test Shop", city: null, is_test_fixture: false, whatsapp_available: false },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function fillValid() {
  fireEvent.change(screen.getByLabelText("Phone number, with country code"), { target: { value: "+1 202 555 0123" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

beforeEach(() => {
  push.mockReset();
  window.history.replaceState(null, "", "/products/p1/request?quantity=2");
});
afterEach(() => vi.unstubAllGlobals());

describe("RequestProductPage", () => {
  it("says up front that this is a request, not a confirmed or paid order", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(PRODUCT)));
    render(<RequestProductPage />);
    expect(await screen.findByText("This is a request, not a confirmed order")).toBeInTheDocument();
    expect(screen.getByText(/no payment is taken on this website/)).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toHaveValue("2");
    expect(screen.getByText(/Listed price: TZS 2,000 \(2 × TZS 1,000\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Test Customer");
  });

  it("shows field errors and sends nothing when invalid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(PRODUCT));
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestProductPage />);
    fireEvent.change(await screen.findByLabelText("Phone number, with country code"), { target: { value: "0712" } });
    fireEvent.click(screen.getByLabelText("Please deliver"));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByText(/starting with \+/)).toBeInTheDocument();
    expect(screen.getByText("Enter a delivery address or area.")).toBeInTheDocument();
    expect(screen.getByText(/Tick the box/)).toBeInTheDocument();
    expect(screen.getByLabelText("Phone number, with country code")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the product load
  });

  it("submits exactly the validated fields and opens the acknowledgement", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(PRODUCT)).mockResolvedValueOnce(json({ id: "req-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestProductPage />);
    await screen.findByLabelText("Quantity");
    fillValid();
    fireEvent.change(screen.getByLabelText("Notes for the retailer (optional)"), { target: { value: "  Evening  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/order-requests/req-1"));
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/api/v1/order-requests");
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      client_request_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      items: [{ product_id: "p1", quantity: 2 }],
      customer_name: "Test Customer",
      customer_phone: "+1 202 555 0123",
      contact_method: "whatsapp",
      fulfilment: "pickup",
      delivery_address: null,
      notes: "Evening",
      consent_to_share: true,
    });
  });

  it("retries with the same request id after a network failure (no duplicates)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(PRODUCT))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json({ id: "req-1" }, 200));
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestProductPage />);
    await screen.findByLabelText("Quantity");
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t reach the server/);
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/order-requests/req-1"));

    const first = JSON.parse(fetchMock.mock.calls[1][1].body).client_request_id;
    const second = JSON.parse(fetchMock.mock.calls[2][1].body).client_request_id;
    expect(second).toBe(first);
  });

  it("shows the server's stock message and uses a new id for the next attempt", async () => {
    const stock = "“Test Product” is out of stock at Test Shop, so it can’t be requested right now.";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(PRODUCT))
      .mockResolvedValueOnce(json({ detail: stock }, 409))
      .mockResolvedValueOnce(json({ detail: stock }, 409));
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestProductPage />);
    await screen.findByLabelText("Quantity");
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(stock);
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const ids = [1, 2].map((i) => JSON.parse(fetchMock.mock.calls[i][1].body).client_request_id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("links to My requests when an earlier version was already received", async () => {
    const detail = "We already received an earlier version of this request with different details. Check “My requests” before sending another.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json(PRODUCT)).mockResolvedValueOnce(json({ detail }, 409))
    );
    render(<RequestProductPage />);
    await screen.findByLabelText("Quantity");
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByRole("link", { name: "Go to My requests" })).toHaveAttribute("href", "/order-requests");
  });

  it("has no form for an out-of-stock product", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ...PRODUCT, availability: "out_of_stock" })));
    render(<RequestProductPage />);
    expect(await screen.findByText(/out of stock, so it can’t be requested/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send request" })).not.toBeInTheDocument();
  });

  it("explains when the product can't be requested", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "Product not found" }, 404)));
    render(<RequestProductPage />);
    expect(await screen.findByText(/isn’t available to request/)).toBeInTheDocument();
  });
});
