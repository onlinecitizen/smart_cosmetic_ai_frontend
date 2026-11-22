import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductCard } from "./ProductCard";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null, loading: false }) }));

// Same shape as the live GET /api/v1/products/PERSONALIZED_SERUM_30ML response.
const PRODUCT = {
  code: "PERSONALIZED_SERUM_30ML",
  name: "Personalized Serum",
  size_label: "30 mL",
  currency: "TZS",
  unit_price: 45000,
  price_breakdown: [
    { code: "FORMULATION", label: "Personalized formulation", amount: 40000 },
    { code: "PACKAGING", label: "Personalized packaging", amount: 5000 },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("ProductCard", () => {
  it("shows the server's name, size and price", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PRODUCT)));
    render(<ProductCard />);
    expect(await screen.findByRole("heading", { name: "Personalized Serum" })).toBeInTheDocument();
    expect(screen.getByText("TZS 45,000")).toBeInTheDocument();
    expect(screen.getByText("Personalized packaging")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start my assessment" })).toHaveAttribute("href", "/register?next=/analyze");
  });

  it("shows an error with retry instead of a made-up price", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "Something went wrong." }, 500))
      .mockResolvedValueOnce(jsonResponse(PRODUCT));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load the product price/);
    expect(screen.queryByText(/TZS/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("TZS 45,000")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
