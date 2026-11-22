import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecommendationsPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Same shape as GET /api/v1/catalog/options.
const OPTIONS = {
  categories: [{ code: "serum", label: "Serum" }],
  skin_types: [
    { code: "dry", label: "Dry" },
    { code: "oily", label: "Oily" },
  ],
  concerns: [{ code: "dryness", label: "Dryness" }],
  avoid_groups: [{ code: "fragrance", label: "Fragrance (parfum)", terms: ["parfum", "fragrance", "aroma"] }],
  availability: [],
};
const EMPTY_RESULT = {
  method: "rules-v1",
  evaluated_count: 0,
  recommended: [],
  excluded: [],
  not_matched_count: 0,
  limitations: ["Recommendations come from fixed rules."],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("RecommendationsPage", () => {
  it("sends exactly the customer's answers and shows results", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(OPTIONS)).mockResolvedValueOnce(json(EMPTY_RESULT));
    vi.stubGlobal("fetch", fetchMock);
    render(<RecommendationsPage />);

    fireEvent.click(await screen.findByLabelText("Dry"));
    fireEvent.click(screen.getByLabelText("Dryness"));
    fireEvent.click(screen.getByLabelText(/Fragrance \(parfum\)/));
    fireEvent.change(screen.getByLabelText("Other ingredients (optional)"), {
      target: { value: "Niacinamide, shea butter" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Show matching products" }));

    await screen.findByRole("heading", { name: "No products matched your answers" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/api/v1/catalog/recommendations");
    expect(JSON.parse(init.body)).toEqual({
      skin_type: "dry",
      concerns: ["dryness"],
      avoid_groups: ["fragrance"],
      avoid_ingredients: ["niacinamide", "shea butter"],
      category: null,
    });
  });

  it("blocks invalid ingredient entries before sending", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(OPTIONS));
    vi.stubGlobal("fetch", fetchMock);
    render(<RecommendationsPage />);
    fireEvent.change(await screen.findByLabelText("Other ingredients (optional)"), { target: { value: "ab" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/between 3 and 60/);
    expect(screen.getByRole("button", { name: "Show matching products" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error with retry if the questions can't load", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ detail: "x" }, 500)).mockResolvedValueOnce(json(OPTIONS));
    vi.stubGlobal("fetch", fetchMock);
    render(<RecommendationsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByLabelText("Dry")).toBeInTheDocument());
  });
});
