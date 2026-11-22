import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("link", { name: "Create a serum formula" })).toHaveAttribute("href", "/analyze");
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
});
